-- 無明長夜 · 떠돌이 상인 실시간 공동 경매
-- 기존 계정·법구·중개소 자료는 보존합니다.
-- 반드시 기존 중개소/페어 공유 지갑 SQL 적용 후 Supabase SQL Editor에서 실행하세요.
-- 실제 러너의 계정 토큰을 확인하고 서버 시각, 가격, 입찰 보증금, 귀속 법구를 관리합니다.
begin;

create table if not exists public.wandering_auction_lots (
 id bigint generated always as identity primary key,
 session_at timestamptz not null,
 tier smallint not null check(tier between 1 and 3),
 item_name text not null,
 item_data jsonb not null,
 start_price bigint not null check(start_price>0),
 bid_amount bigint not null default 0 check(bid_amount>=0),
 bid_count int not null default 0,
 winner_id text references public.accounts(id),
 winner_name text,
 ends_at timestamptz not null,
 status text not null default 'open' check(status in('open','closed')),
 claimed_at timestamptz,
 unique(session_at,tier)
);
alter table public.wandering_auction_lots add column if not exists bid_count int not null default 0;
create index if not exists wandering_auction_end_idx on public.wandering_auction_lots(status,ends_at);
create index if not exists wandering_auction_winner_idx on public.wandering_auction_lots(winner_id,status,claimed_at);
create table if not exists public.wandering_auction_requests(
 account_id text not null references public.accounts(id),
 request_id text not null,
 lot_id bigint not null,
 created_at timestamptz not null default now(),
 primary key(account_id,request_id)
);
alter table public.wandering_auction_lots enable row level security;
alter table public.wandering_auction_requests enable row level security;
revoke all on public.wandering_auction_lots,public.wandering_auction_requests from public,anon,authenticated;

-- 이 함수는 아래의 인증된 경매 함수 내부에서만 호출됩니다.
-- 페어 참가자의 공동 지갑까지 하나의 트랜잭션으로 갱신합니다.
create or replace function public.wandering_auction_wallet(
 p_actor text, p_rin_delta bigint, p_reward jsonb default null
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare
 a public.accounts%rowtype;
 p public.pairs%rowtype;
 t public.pair_play_state%rowtype;
 w jsonb; v_save jsonb; v_bag jsonb; v_item jsonb;
 v_balance bigint; v_gid bigint; v_cap int;
begin
 select * into p from public.pairs
  where status='accepted' and p_actor in(from_id,to_id)
  order by id desc limit 1 for update;
 if found then
   perform pg_advisory_xact_lock(p.id);
   select * into t from public.pair_play_state where pair_id=p.id for update;
   if t.pair_id is null or t.closed then
     raise exception '페어의 공동 지갑이 아직 연결되지 않았습니다. 두 사람 모두 로그인해 주세요.';
   end if;
   perform 1 from public.accounts where id in(p.from_id,p.to_id) order by id for update;
   w:=t.wallet;
   v_balance:=coalesce((w->>'rin')::bigint,0)+p_rin_delta;
   if v_balance<0 then raise exception '입찰할 륜이 부족합니다.';end if;
   w:=jsonb_set(w,'{rin}',to_jsonb(v_balance),true);
   if p_reward is not null then
     v_bag:=coalesce(w->'bag','[]'::jsonb);
     select 80+coalesce(sum(coalesce((save#>>'{res,r11}')::int,0))*5,0)::int
       into v_cap from public.accounts where id in(p.from_id,p.to_id);
     if jsonb_array_length(v_bag)>=v_cap then raise exception '공동 바랑이 가득 찼습니다. 빈칸을 만든 뒤 수령해 주세요.';end if;
     v_gid:=coalesce((w->>'gid')::bigint,1);
     v_item:=p_reward||jsonb_build_object('id',v_gid,'bound',true,'isNew',true);
     w:=jsonb_set(w,'{bag}',v_bag||jsonb_build_array(v_item),true);
     w:=jsonb_set(w,'{gid}',to_jsonb(v_gid+1),true);
   end if;
   update public.pair_play_state set wallet=w,revision=revision+1 where pair_id=p.id;
   update public.accounts set
     save=jsonb_set(public.pp_apply(save,w,t.progress),'{marketRev}',to_jsonb(market_rev+1),true)
          ||jsonb_build_object('pairPersonalRev',pair_play_rev+1),
     market_rev=market_rev+1,pair_play_rev=pair_play_rev+1
     where id in(p.from_id,p.to_id);
 else
   select * into a from public.accounts where id=p_actor for update;
   if not found or a.save is null then raise exception '계정 저장 기록을 찾을 수 없습니다.';end if;
   v_save:=a.save;
   v_balance:=coalesce((v_save->>'rin')::bigint,0)+p_rin_delta;
   if v_balance<0 then raise exception '입찰할 륜이 부족합니다.';end if;
   v_save:=jsonb_set(v_save,'{rin}',to_jsonb(v_balance),true);
   if p_reward is not null then
     v_bag:=coalesce(v_save->'bag','[]'::jsonb);
     v_cap:=40+coalesce((v_save#>>'{res,r11}')::int,0)*5;
     if jsonb_array_length(v_bag)>=v_cap then raise exception '바랑이 가득 찼습니다. 빈칸을 만든 뒤 수령해 주세요.';end if;
     v_gid:=coalesce((v_save->>'gid')::bigint,1);
     v_item:=p_reward||jsonb_build_object('id',v_gid,'bound',true,'isNew',true);
     v_save:=jsonb_set(v_save,'{bag}',v_bag||jsonb_build_array(v_item),true);
     v_save:=jsonb_set(v_save,'{gid}',to_jsonb(v_gid+1),true);
   end if;
   v_save:=jsonb_set(v_save,'{marketRev}',to_jsonb(a.market_rev+1),true);
   update public.accounts set save=v_save,market_rev=market_rev+1 where id=p_actor;
 end if;
 select save into v_save from public.accounts where id=p_actor;
 return v_save;
end $$;
revoke all on function public.wandering_auction_wallet(text,bigint,jsonb) from public,anon,authenticated;

create or replace function public.wandering_auction(
 p_actor text, p_token text, p_action text default 'snapshot',
 p_lot_id bigint default null, p_expected bigint default null, p_request text default ''
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare
 a public.accounts%rowtype; l public.wandering_auction_lots%rowtype;
 v_start timestamptz; v_next timestamptz; v_clock timestamptz;
 v_tier int; v_slot text; v_stat text; v_name text; v_reward jsonb;
 v_bid bigint; v_step bigint; v_save jsonb; v_respond jsonb;
 v_live jsonb; v_pending jsonb; v_history jsonb;
 v_names text[]:=array['승복','삿갓','염주','경문'];
 v_slots text[]:=array['robe','cap','charm','sutra'];
 v_stats text[]:=array['def','men','agi','res'];
 v_idx int;
begin
 if p_actor is null or p_token is null or not exists(
  select 1 from public.accounts where id=p_actor and pw=p_token
 ) then raise exception '계정 로그인이 필요합니다.';end if;
 if p_action not in ('snapshot','bid','claim') then raise exception '허용되지 않은 경매 요청입니다.';end if;
 -- 모든 경매 입찰/회수/회차 생성이 동일한 DB 직렬화 잠금을 사용합니다.
 perform pg_advisory_xact_lock(726503220061::bigint);
 v_clock:=clock_timestamp();
 v_start:=(date_trunc('hour',v_clock at time zone 'Asia/Seoul') at time zone 'Asia/Seoul');
 v_next:=v_start+interval '1 hour';
 -- 매시 정각에 동일한 세 품목이 생성되며, 모든 러너에게 정확히 같은 물건이 보입니다.
 for v_tier in 1..3 loop
   v_idx:=1+mod((extract(epoch from v_start)::bigint/3600+v_tier)::int,4);
   v_slot:=v_slots[v_idx];v_stat:=v_stats[v_idx];
   v_name:=(array['낡은 수레의','홍월 유랑단의','잊힌 골목의'])[v_tier]||' '||v_names[v_idx];
   v_reward:=jsonb_build_object(
      'slot',v_slot,'name',v_name,'grade',v_tier+1,
      'lv',(array[8,20,35])[v_tier],'enh',0,
      'main',jsonb_build_object('st',v_stat,'v',(array[4,10,20])[v_tier]),
      'opts',case v_tier
        when 1 then jsonb_build_array(jsonb_build_object('k','atkP','n','공격력','v',4.0),jsonb_build_object('k','hpP','n','생명력','v',5.0))
        when 2 then jsonb_build_array(jsonb_build_object('k','atkP','n','공격력','v',7.0),jsonb_build_object('k','crit','n','치명타 확률','v',4.0),jsonb_build_object('k','exp','n','경험치','v',7.0))
        else jsonb_build_array(jsonb_build_object('k','atkP','n','공격력','v',11.0),jsonb_build_object('k','crit','n','치명타 확률','v',6.0),jsonb_build_object('k','critD','n','치명타 피해','v',14.0),jsonb_build_object('k','loot','n','전리품 확률','v',9.0)) end
   );
   insert into public.wandering_auction_lots(
      session_at,tier,item_name,item_data,start_price,ends_at
   ) values(v_start,v_tier,v_name,v_reward,
      (array[6000,24000,70000])[v_tier],v_start+interval '15 minutes')
   on conflict(session_at,tier) do nothing;
 end loop;
 update public.wandering_auction_lots set status='closed'
  where status='open' and ends_at<=v_clock;

 if p_action='bid' then
   if p_lot_id is null or p_request !~ '^[A-Za-z0-9_-]{8,160}$' then
      raise exception '입찰 요청 정보가 올바르지 않습니다.';end if;
   -- 요청을 재전송하더라도 한 번만 차감합니다.
   if exists(select 1 from public.wandering_auction_requests
       where account_id=p_actor and request_id=p_request) then
     return jsonb_build_object('ok',true,'replayed',true);
   end if;
   select * into l from public.wandering_auction_lots where id=p_lot_id for update;
   if not found or l.status<>'open' or l.ends_at<=v_clock then raise exception '이미 마감된 경매입니다.';end if;
   if l.winner_id=p_actor then raise exception '이미 이 물건의 최고 입찰자입니다.';end if;
   if p_expected is distinct from l.bid_amount then
     raise exception '그사이 다른 러너가 입찰했습니다. 목록을 갱신한 뒤 다시 입찰해 주세요.';
   end if;
   v_step:=greatest(500,ceil(l.bid_amount*0.10)::bigint);
   v_bid:=case when l.bid_amount=0 then l.start_price else l.bid_amount+v_step end;
   if l.winner_id is not null then
      perform public.wandering_auction_wallet(l.winner_id,l.bid_amount,null);
   end if;
   v_save:=public.wandering_auction_wallet(p_actor,-v_bid,null);
   update public.wandering_auction_lots set
     winner_id=p_actor,winner_name=left(coalesce(v_save->>'name',p_actor),70),
     bid_amount=v_bid,bid_count=bid_count+1,
     ends_at=case when ends_at-v_clock<interval '45 seconds'
       then least(ends_at+interval '90 seconds',session_at+interval '18 minutes')
       else ends_at end
     where id=l.id;
   insert into public.wandering_auction_requests(account_id,request_id,lot_id)
      values(p_actor,p_request,l.id);
 elsif p_action='claim' then
   select * into l from public.wandering_auction_lots where id=p_lot_id for update;
   if not found or l.winner_id is distinct from p_actor then
     raise exception '낙찰 대상자가 아닙니다.';end if;
   if l.ends_at>v_clock then raise exception '경매가 끝난 뒤 수령할 수 있습니다.';end if;
   if l.claimed_at is null then
     v_save:=public.wandering_auction_wallet(p_actor,0,l.item_data);
     update public.wandering_auction_lots set claimed_at=v_clock,status='closed' where id=l.id;
   end if;
 end if;

 select * into a from public.accounts where id=p_actor;
 select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into v_live
   from (select id,tier,item_name,item_data,start_price,bid_amount,bid_count,winner_name,
           (winner_id=p_actor) as mine,ends_at
         from public.wandering_auction_lots
         where status='open' and ends_at>v_clock and session_at=v_start
         order by tier) x;
 select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into v_pending
   from (select id,tier,item_name,bid_amount,ends_at from public.wandering_auction_lots
         where winner_id=p_actor and status='closed' and claimed_at is null order by ends_at desc limit 30) x;
 select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into v_history
   from (select id,tier,item_name,bid_amount,bid_count,winner_name,ends_at from public.wandering_auction_lots
         where status='closed' order by ends_at desc,tier limit 12) x;
 return jsonb_build_object('ok',true,'server_at',v_clock,'next_at',v_next,
   'live',v_live,'pending',v_pending,'history',v_history,
   'rev',a.market_rev,'inventory',jsonb_build_object('rin',a.save->'rin','bag',a.save->'bag',
   'gid',a.save->'gid','marketRev',coalesce(a.save->'marketRev','0'::jsonb)));
end $$;
revoke all on function public.wandering_auction(text,text,text,bigint,bigint,text) from public;
grant execute on function public.wandering_auction(text,text,text,bigint,bigint,text) to anon,authenticated;
commit;
