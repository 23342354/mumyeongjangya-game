-- 無明長夜 · 사이트 종료 후 Web Push / GitHub Pages + Supabase
-- 선행: Supabase-표만들기.sql, 교류-업데이트.sql, RP-답글알림-업데이트.sql(선택), 중개소 SQL(선택)
-- 기존 자료는 삭제하지 않습니다. DB Editor에서 1회 적용, 재실행 가능.
begin;

create table if not exists public.mm_push_subscriptions (
  endpoint text primary key,
  account_id text not null references public.accounts(id) on delete cascade,
  keys jsonb not null,
  categories jsonb not null default '{"soc":true,"farm":true,"trade":true,"run":true,"study":true,"home":true,"etc":false}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_test_at timestamptz,
  constraint mm_push_endpoint_len check (length(endpoint) between 32 and 2000)
);
create index if not exists mm_push_subscriptions_account_idx on public.mm_push_subscriptions(account_id);

create table if not exists public.mm_push_events (
  id bigint generated always as identity primary key,
  account_id text not null references public.accounts(id) on delete cascade,
  category text not null,
  title text not null,
  body text not null,
  destination text not null default '',
  source_key text unique,
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  delivered_at timestamptz
);
create index if not exists mm_push_events_pending_idx on public.mm_push_events(claimed_at,created_at);
create index if not exists mm_push_events_account_idx on public.mm_push_events(account_id,created_at desc);

create table if not exists public.mm_push_farm_due (
  account_id text not null references public.accounts(id) on delete cascade,
  plot_no integer not null check (plot_no between 0 and 8),
  plant_nonce text not null,
  due_at timestamptz not null,
  notified_at timestamptz,
  primary key(account_id,plot_no)
);
create index if not exists mm_push_farm_due_pending_idx on public.mm_push_farm_due(due_at) where notified_at is null;
create table if not exists public.mm_push_timer_due (
  account_id text not null references public.accounts(id) on delete cascade,
  kind text not null check(kind in ('lesson','study','run')),
  timer_nonce text not null,
  due_at timestamptz not null,
  notified_at timestamptz,
  primary key(account_id,kind)
);
create index if not exists mm_push_timer_due_pending_idx on public.mm_push_timer_due(due_at) where notified_at is null;

-- 구독 엔드포인트, 암호화 키 및 수신자별 이벤트는 외부에 공개하지 않습니다.
alter table public.mm_push_subscriptions enable row level security;
alter table public.mm_push_events enable row level security;
alter table public.mm_push_farm_due enable row level security;
alter table public.mm_push_timer_due enable row level security;
revoke all on public.mm_push_subscriptions,public.mm_push_events,public.mm_push_farm_due,public.mm_push_timer_due from public,anon,authenticated;
revoke all on sequence public.mm_push_events_id_seq from public,anon,authenticated;

-- webhook 중복 요청 방지. 모든 발송은 서버 키를 가진 Edge Function에서만 실행.
create or replace function public.mm_push_claim(p_event_id bigint)
returns jsonb language plpgsql security definer set search_path=public as $$
declare r public.mm_push_events%rowtype;
begin
 update public.mm_push_events e set claimed_at=now()
 where e.id=p_event_id and e.delivered_at is null
   and (e.claimed_at is null or e.claimed_at<now()-interval '3 minutes')
 returning * into r;
 if not found then return null; end if;
 return jsonb_build_object('id',r.id,'account_id',r.account_id,'category',r.category,
   'title',r.title,'body',r.body,'destination',r.destination);
end $$;
revoke all on function public.mm_push_claim(bigint) from public,anon,authenticated;
grant execute on function public.mm_push_claim(bigint) to service_role;

-- 서버의 RP 답글 알림 테이블이 존재할 때만 발송 연결.
create or replace function public.mm_push_on_rp_reply()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.recipient_id<>new.actor_id and exists(select 1 from public.accounts where id=new.recipient_id) then
  insert into public.mm_push_events(account_id,category,title,body,destination,source_key)
  values(new.recipient_id,'soc','RP 게시판','내 글타래에 새로운 답글이 달렸어요.','rpboard',
         'rp:'||new.id::text)
  on conflict(source_key) do nothing;
 end if;
 return new;
end $$;
do $$ begin
 if to_regclass('public.rp_reply_alerts') is not null then
   execute 'drop trigger if exists trg_mm_push_rp_reply on public.rp_reply_alerts';
   execute 'create trigger trg_mm_push_rp_reply after insert on public.rp_reply_alerts for each row execute function public.mm_push_on_rp_reply()';
 end if;
end $$;

-- 페어 및 1:1 메시지는 비공개 내용이 푸시 본문에 노출되지 않도록 알림 문구만 보냅니다.
create or replace function public.mm_push_on_message()
returns trigger language plpgsql security definer set search_path=public as $$
declare target text;
begin
 if new.tab='페어' then
  select case when p.from_id=new.from_id then p.to_id else p.from_id end
  into target from public.pairs p
  where p.status='accepted' and new.from_id in (p.from_id,p.to_id)
  order by p.updated_at desc nulls last limit 1;
 elsif new.tab='1:1' then
  if split_part(coalesce(new.scope,''),'|',1)=new.from_id then
   target:=split_part(new.scope,'|',2);
  elsif split_part(coalesce(new.scope,''),'|',2)=new.from_id then
   target:=split_part(new.scope,'|',1);
  end if;
 end if;
 if target is not null and target<>new.from_id
   and exists(select 1 from public.accounts a where a.id=target) then
  insert into public.mm_push_events(account_id,category,title,body,destination,source_key)
  values(target,'soc',case when new.tab='페어' then '페어 채팅' else '1:1 대화' end,
    '새 메시지가 도착했어요.','pairhub','chat:'||new.id::text||':'||target)
  on conflict(source_key) do nothing;
 end if;
 return new;
end $$;
drop trigger if exists trg_mm_push_message on public.messages;
create trigger trg_mm_push_message after insert on public.messages
 for each row execute function public.mm_push_on_message();

-- 페어 신청/수락 알림.
create or replace function public.mm_push_on_pair()
returns trigger language plpgsql security definer set search_path=public as $$
declare target text; mesg text;
begin
 if tg_op='INSERT' and new.status='pending' then
   target:=new.to_id;mesg:='새 페어 신청이 도착했어요.';
 elsif tg_op='UPDATE' and new.status='accepted' and old.status is distinct from 'accepted' then
   target:=new.from_id;mesg:='페어 신청이 수락되었어요.';
 else return new;
 end if;
 if exists(select 1 from public.accounts where id=target) then
  insert into public.mm_push_events(account_id,category,title,body,destination,source_key)
  values(target,'soc','페어',mesg,'pairhub','pair:'||new.id::text||':'||new.status)
  on conflict(source_key) do nothing;
 end if;
 return new;
end $$;
drop trigger if exists trg_mm_push_pair on public.pairs;
create trigger trg_mm_push_pair after insert or update of status on public.pairs
for each row execute function public.mm_push_on_pair();

-- 인연/관계 신청은 별도 테이블이 설치된 경우만.
create or replace function public.mm_push_on_link()
returns trigger language plpgsql security definer set search_path=public as $$
declare target text; mesg text;
begin
 if tg_op='INSERT' and new.status='pending' then
  target:=new.to_id; mesg:='인연·관계 신청이 도착했어요.';
 elsif tg_op='UPDATE' and new.status='accepted' and old.status is distinct from 'accepted' then
  target:=new.from_id;mesg:='인연·관계 신청이 수락되었어요.';
 else return new; end if;
 if exists(select 1 from public.accounts where id=target) then
  insert into public.mm_push_events(account_id,category,title,body,destination,source_key)
  values(target,'soc','인연·관계',mesg,'rel','link:'||new.id::text||':'||new.status)
  on conflict(source_key) do nothing;
 end if;
 return new;
end $$;
do $$ begin
 if to_regclass('public.social_links') is not null then
  execute 'drop trigger if exists trg_mm_push_link on public.social_links';
  execute 'create trigger trg_mm_push_link after insert or update of status on public.social_links for each row execute function public.mm_push_on_link()';
 end if;
end $$;

-- 중개소 판매 완료.
create or replace function public.mm_push_on_market()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.status='sold' and (tg_op='INSERT' or old.status is distinct from 'sold') then
  insert into public.mm_push_events(account_id,category,title,body,destination,source_key)
  values(new.seller_id,'trade','중개소','내 매물이 판매되었어요. 정산을 확인해 주세요.','market',
         'market:'||new.id::text)
  on conflict(source_key) do nothing;
 end if;
 return new;
end $$;
do $$ begin
 if to_regclass('public.market_listings') is not null then
  execute 'drop trigger if exists trg_mm_push_market on public.market_listings';
  execute 'create trigger trg_mm_push_market after update of status on public.market_listings for each row execute function public.mm_push_on_market()';
 end if;
end $$;

-- 텃밭은 다른 클라이언트에서 수확/취소된 밭을 서버 알림하지 않도록 계정 저장본과 연동.
-- 여기서 plant_nonce는 새 배포본의 심기 직후 생성되는 시각값입니다.
create or replace function public.mm_push_watch_farm()
returns trigger language plpgsql security definer set search_path=public as $$
declare entry record; nonce text; left_mins numeric; base_ms numeric; due_time timestamptz;
begin
 if new.save is null then return new; end if;
 -- 각 계정 저장본의 3×3 밭 9칸을 현재 상태로 맞춥니다.
 for entry in
   select (x.ordinality-1)::integer as slot, x.value as plot
   from jsonb_array_elements(case when jsonb_typeof(new.save #> '{farm,plots}')='array'
       then new.save #> '{farm,plots}' else '[]'::jsonb end) with ordinality as x(value,ordinality)
 loop
  if entry.slot>8 then exit; end if;
  nonce:=nullif(entry.plot->>'pushPlantedAt','');
  if entry.plot is null or jsonb_typeof(entry.plot)<>'object' or nonce is null then
    delete from public.mm_push_farm_due where account_id=new.id and plot_no=entry.slot;
    continue;
  end if;
  begin left_mins:=greatest(0,(entry.plot->>'left')::numeric);
  exception when others then left_mins:=0; end;
  begin base_ms:=(new.save->>'lastReal')::numeric;
  exception when others then base_ms:=extract(epoch from now())*1000; end;
  if base_ms is null or base_ms<0 then base_ms:=extract(epoch from now())*1000; end if;
  due_time:=to_timestamp(base_ms/1000)+(left_mins*interval '1 minute');
  if coalesce((entry.plot->>'farmNotified')::boolean,false) then
    -- 이미 브라우저에서 완료 안내한 밭은 푸시를 반복하지 않습니다.
    delete from public.mm_push_farm_due where account_id=new.id and plot_no=entry.slot;
    continue;
  end if;
  insert into public.mm_push_farm_due(account_id,plot_no,plant_nonce,due_at)
  values(new.id,entry.slot,nonce,due_time)
  on conflict(account_id,plot_no) do update
  set plant_nonce=excluded.plant_nonce,due_at=excluded.due_at,
      notified_at=case when public.mm_push_farm_due.plant_nonce=excluded.plant_nonce
        then public.mm_push_farm_due.notified_at else null end;
 end loop;
 -- 구버전 저장본 등 밭의 크기가 줄어든 경우의 안전장치.
 delete from public.mm_push_farm_due d where d.account_id=new.id
   and d.plot_no>=jsonb_array_length(case when jsonb_typeof(new.save #> '{farm,plots}')='array'
       then new.save #> '{farm,plots}' else '[]'::jsonb end);
 return new;
end $$;
drop trigger if exists trg_mm_push_watch_farm on public.accounts;
create trigger trg_mm_push_watch_farm after update of save on public.accounts
 for each row execute function public.mm_push_watch_farm();

-- 서버 예약 실행 함수: 실행자가 아니라 도착 시점 기준으로 1회 발송 대기열에 기록.
create or replace function public.mm_push_farm_tick()
returns integer language plpgsql security definer set search_path=public as $$
declare r record; n integer:=0;
begin
 for r in select d.account_id,d.plot_no,d.plant_nonce from public.mm_push_farm_due d
  where d.notified_at is null and d.due_at<=now()
  and exists(select 1 from public.mm_push_subscriptions s where s.account_id=d.account_id)
  order by d.due_at limit 200 for update skip locked
 loop
  update public.mm_push_farm_due set notified_at=now()
   where account_id=r.account_id and plot_no=r.plot_no and plant_nonce=r.plant_nonce;
  insert into public.mm_push_events(account_id,category,title,body,destination,source_key)
  values(r.account_id,'farm','텃밭','심어 둔 작물이 자랐어요. 약초밭에서 확인해 주세요.','farm',
    'farm:'||r.account_id||':'||r.plot_no::text||':'||r.plant_nonce)
  on conflict(source_key) do nothing;
  n:=n+1;
 end loop;
 return n;
end $$;
revoke all on function public.mm_push_farm_tick() from public,anon,authenticated;
grant execute on function public.mm_push_farm_tick() to service_role;

-- 수업·연구·의뢰: 앱을 닫은 동안에도 서버가 예정 시각을 검사합니다.
create or replace function public.mm_push_watch_timers()
returns trigger language plpgsql security definer set search_path=public as $$
declare kind text; item jsonb; nonce text; left_mins numeric; base_ms numeric; due_time timestamptz;
begin
 if new.save is null then return new; end if;
 begin base_ms:=(new.save->>'lastReal')::numeric;
 exception when others then base_ms:=extract(epoch from now())*1000; end;
 if base_ms is null or base_ms<0 then base_ms:=extract(epoch from now())*1000; end if;
 foreach kind in array array['lesson','study','run'] loop
  item:=new.save->kind;
  nonce:=nullif(item->>'pushStartedAt','');
  if item is null or jsonb_typeof(item)<>'object' or nonce is null
    or (kind='run' and coalesce((item->>'done')::boolean,false)) then
   delete from public.mm_push_timer_due d where d.account_id=new.id and d.kind=kind;
   continue;
  end if;
  begin left_mins:=greatest(0,(item->>'left')::numeric);
  exception when others then left_mins:=0; end;
  due_time:=to_timestamp(base_ms/1000)+(left_mins*interval '1 minute');
  insert into public.mm_push_timer_due(account_id,kind,timer_nonce,due_at)
  values(new.id,kind,nonce,due_time)
  on conflict(account_id,kind) do update
  set timer_nonce=excluded.timer_nonce,due_at=excluded.due_at,
   notified_at=case when public.mm_push_timer_due.timer_nonce=excluded.timer_nonce
     then public.mm_push_timer_due.notified_at else null end;
 end loop;
 return new;
end $$;
drop trigger if exists trg_mm_push_watch_timers on public.accounts;
create trigger trg_mm_push_watch_timers after update of save on public.accounts
 for each row execute function public.mm_push_watch_timers();

create or replace function public.mm_push_timer_tick()
returns integer language plpgsql security definer set search_path=public as $$
declare r record; n integer:=0; cat text; title text; body text; dest text;
begin
 for r in select d.account_id,d.kind,d.timer_nonce from public.mm_push_timer_due d
  where d.notified_at is null and d.due_at<=now()
   and exists(select 1 from public.mm_push_subscriptions s where s.account_id=d.account_id)
  order by d.due_at limit 200 for update skip locked
 loop
  update public.mm_push_timer_due set notified_at=now()
   where account_id=r.account_id and kind=r.kind and timer_nonce=r.timer_nonce;
  if r.kind='run' then
   cat:='run';title:='의뢰 알림';body:='의뢰 시간이 지났어요. 사무전에 들어와 결과를 정산해 주세요.';dest:='quest';
  elsif r.kind='lesson' then
   cat:='study';title:='수업 알림';body:='수업 종료 예정 시각이에요. 접속해서 학습 결과를 확인해 주세요.';dest:='class';
  else
   cat:='study';title:='연구 알림';body:='연구 완료 예정 시각이에요. 서고에서 확인해 주세요.';dest:='research';
  end if;
  insert into public.mm_push_events(account_id,category,title,body,destination,source_key)
  values(r.account_id,cat,title,body,dest,
   'timer:'||r.account_id||':'||r.kind||':'||r.timer_nonce)
  on conflict(source_key) do nothing;
  n:=n+1;
 end loop;
 return n;
end $$;
revoke all on function public.mm_push_timer_tick() from public,anon,authenticated;
grant execute on function public.mm_push_timer_tick() to service_role;

create or replace function public.mm_push_all_tick()
returns integer language plpgsql security definer set search_path=public as $$
begin
 return public.mm_push_farm_tick()+public.mm_push_timer_tick();
end $$;
revoke all on function public.mm_push_all_tick() from public,anon,authenticated;
grant execute on function public.mm_push_all_tick() to service_role;

commit;
