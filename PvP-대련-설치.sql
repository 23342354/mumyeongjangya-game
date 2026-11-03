-- 無明長夜 · PvP 대련 (2026-11-03)
-- Supabase SQL Editor에서 한 번 실행. 재실행해도 기존 대련 기록은 삭제되지 않습니다.
-- 기존 accounts 테이블을 쓰며, 기존 데이터나 다른 전투 시스템을 수정하지 않습니다.

create table if not exists public.pvp_rooms (
  id bigint generated always as identity primary key,
  host_id text not null,
  host_name text not null,
  guest_id text,
  guest_name text,
  note text not null default '',
  host_stats jsonb not null,
  guest_stats jsonb,
  host_hp integer not null default 100 check (host_hp between 0 and 100),
  guest_hp integer not null default 100 check (guest_hp between 0 and 100),
  first_id text,
  status text not null default 'waiting' check(status in ('waiting','active','done','cancelled')),
  round_no integer not null default 1 check (round_no between 1 and 3),
  step integer not null default 0 check (step between 0 and 12),
  pending_attack integer not null default 0,
  winner_id text,
  finish_reason text not null default '',
  events jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pvp_not_self check (guest_id is null or guest_id <> host_id)
);
create index if not exists pvp_rooms_status_idx on public.pvp_rooms(status,created_at desc);
create index if not exists pvp_rooms_host_idx on public.pvp_rooms(host_id,created_at desc);
create index if not exists pvp_rooms_guest_idx on public.pvp_rooms(guest_id,created_at desc);

create table if not exists public.pvp_messages (
  id bigint generated always as identity primary key,
  room_id bigint not null references public.pvp_rooms(id) on delete cascade,
  sender_id text not null,
  sender_name text not null,
  body text not null check(char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);
create index if not exists pvp_messages_room_idx on public.pvp_messages(room_id,id desc);

-- 게시판·채팅을 직접 변경하지 못하게 하고 아래 RPC만으로 처리합니다.
revoke all on public.pvp_rooms, public.pvp_messages from public, anon, authenticated;
revoke all on sequence public.pvp_rooms_id_seq, public.pvp_messages_id_seq from public, anon, authenticated;
alter table public.pvp_rooms enable row level security;
alter table public.pvp_messages enable row level security;
-- 관리용 SELECT조차 클라이언트에 허용하지 않습니다. 보기는 pvp_view RPC를 사용합니다.

-- RPC 공통 자격 확인: 기존 로그인과 동일한 해시를 사용합니다.
-- 주의: 기존 accounts.pw 컬럼은 구 앱에서 공개적으로 조회됩니다.
-- 실제 악의적 계정 도용 방지는 추후 Supabase Auth 이전이 필요합니다.
create or replace function public.pvp_assert(p_user text, p_token text)
returns void language plpgsql security definer set search_path=public as $$
begin
  if p_user is null or p_token is null or not exists (
    select 1 from public.accounts a where a.id=p_user and a.pw=p_token
  ) then
    raise exception '대련 계정 확인에 실패했습니다. 다시 로그인해 주세요.';
  end if;
end; $$;

create or replace function public.pvp_sanitize_stats(p_input jsonb)
returns jsonb language plpgsql immutable as $$
declare k text; out_stats jsonb='{}'::jsonb; v integer;
begin
  foreach k in array array['atk','def','agi','men','res'] loop
    begin v=floor((p_input->>k)::numeric)::integer;
    exception when others then v=1;
    end;
    out_stats=jsonb_set(out_stats,array[k],to_jsonb(greatest(1,least(80,coalesce(v,1)))));
  end loop;
  return out_stats;
end; $$;

create or replace function public.pvp_roll(p_n integer)
returns integer language plpgsql volatile as $$
declare i integer; v integer=0;
begin
  for i in 1..greatest(1,least(81,p_n)) loop
    v:=v+(floor(random()*5)+1)::integer;
  end loop;
  return v;
end; $$;

create or replace function public.pvp_create(
  p_user text, p_token text, p_name text, p_stats jsonb, p_note text default ''
) returns bigint language plpgsql security definer set search_path=public as $$
declare new_id bigint; player_name text;
begin
  perform public.pvp_assert(p_user,p_token);
  -- 계정 단위 동시 생성/참가 경쟁 방지
  perform pg_advisory_xact_lock(hashtextextended('pvp-user:'||p_user,0));
  if exists (select 1 from public.pvp_rooms where status in ('waiting','active')
    and (host_id=p_user or guest_id=p_user)) then
    raise exception '이미 참여 중인 대련이 있습니다.';
  end if;
  player_name:=left(coalesce(nullif(btrim(p_name),''),p_user),48);
  insert into public.pvp_rooms(host_id,host_name,host_stats,note)
  values(p_user,player_name,public.pvp_sanitize_stats(p_stats),left(coalesce(p_note,''),90))
  returning id into new_id;
  return new_id;
end; $$;

create or replace function public.pvp_join(
  p_user text,p_token text,p_room bigint,p_name text,p_stats jsonb
) returns jsonb language plpgsql security definer set search_path=public as $$
declare r public.pvp_rooms%rowtype; h_ag integer; g_ag integer; fst text; join_name text;
begin
  perform public.pvp_assert(p_user,p_token);
  perform pg_advisory_xact_lock(hashtextextended('pvp-user:'||p_user,0));
  select * into r from public.pvp_rooms where id=p_room for update;
  if not found then raise exception '대련방을 찾을 수 없습니다.'; end if;
  if r.status<>'waiting' or r.guest_id is not null then raise exception '이미 시작되거나 닫힌 방입니다.'; end if;
  if r.host_id=p_user then raise exception '자신이 만든 방에는 참가할 수 없습니다.'; end if;
  if exists(select 1 from public.pvp_rooms where status in ('waiting','active')
    and (host_id=p_user or guest_id=p_user)) then
    raise exception '이미 참여 중인 대련이 있습니다.';
  end if;
  join_name:=left(coalesce(nullif(btrim(p_name),''),p_user),48);
  -- 기존 대련의 민첩 D5로 선공을 가립니다. 동률이면 방장이 선공합니다.
  h_ag:=public.pvp_roll((r.host_stats->>'agi')::integer);
  g_ag:=public.pvp_roll((public.pvp_sanitize_stats(p_stats)->>'agi')::integer);
  fst:=case when h_ag>=g_ag then r.host_id else p_user end;
  update public.pvp_rooms set guest_id=p_user,guest_name=join_name,
    guest_stats=public.pvp_sanitize_stats(p_stats),first_id=fst,status='active',
    events=jsonb_build_array(jsonb_build_object(
      'round',0,'kind','start','text','민첩 판정 '||r.host_name||' '||h_ag||' / '||join_name||' '||g_ag||' · 선공 '||(case when fst=r.host_id then r.host_name else join_name end))),
    updated_at=now() where id=p_room;
  return jsonb_build_object('room_id',p_room,'first_id',fst);
end; $$;

create or replace function public.pvp_act(
  p_user text,p_token text,p_room bigint,p_move text
) returns jsonb language plpgsql security definer set search_path=public as $$
declare
  r public.pvp_rooms%rowtype;
  attacker text; defender text; expected_actor text; actor_name text;
  atk_st jsonb; def_st jsonb; av integer; dv integer; ar integer; dr integer; dmg integer=0;
  log_text text; result_text text=''; new_step integer; new_round integer;
  h_hp integer; g_hp integer; finish text=''; winner text=null; ev jsonb;
begin
  perform public.pvp_assert(p_user,p_token);
  select * into r from public.pvp_rooms where id=p_room for update;
  if not found or r.status<>'active' then raise exception '진행 중인 대련이 아닙니다.'; end if;
  if p_user not in (r.host_id,r.guest_id) then raise exception '참가자만 행동할 수 있습니다.'; end if;
  attacker:=case when mod(r.step,4)<2 then r.first_id
                 when r.first_id=r.host_id then r.guest_id else r.host_id end;
  defender:=case when attacker=r.host_id then r.guest_id else r.host_id end;
  expected_actor:=case when mod(r.step,2)=0 then attacker else defender end;
  if p_user<>expected_actor then raise exception '지금은 상대방의 차례입니다.'; end if;
  if (mod(r.step,2)=0 and p_move<>'attack') or
     (mod(r.step,2)=1 and p_move not in ('defend','dodge')) then
    raise exception '현재 차례에 사용할 수 없는 행동입니다.';
  end if;
  atk_st:=case when attacker=r.host_id then r.host_stats else r.guest_stats end;
  def_st:=case when defender=r.host_id then r.host_stats else r.guest_stats end;
  h_hp:=r.host_hp; g_hp:=r.guest_hp;
  actor_name:=case when p_user=r.host_id then r.host_name else r.guest_name end;
  if p_move='attack' then
    av:=public.pvp_roll((atk_st->>'atk')::integer)+5;
    log_text:=actor_name||' 공격 판정 '||av||' · 방어/회피를 기다립니다.';
    update public.pvp_rooms set pending_attack=av where id=p_room;
  else
    av:=r.pending_attack;
    if av<=0 then raise exception '공격 판정이 없습니다.'; end if;
    if p_move='defend' then
      dv:=public.pvp_roll((def_st->>'def')::integer)+5;
      dmg:=greatest(0,av-dv);
      result_text:='방어 '||dv||' → 피해 '||dmg;
    else
      ar:=public.pvp_roll((atk_st->>'agi')::integer+1);
      dr:=public.pvp_roll((def_st->>'agi')::integer);
      dmg:=case when dr>=ar then 0 else av end;
      result_text:='회피 '||dr||' / 공격자 민첩 '||ar||
        case when dmg=0 then ' → 완전 회피' else ' → 회피 실패, 피해 '||dmg end;
    end if;
    if defender=r.host_id then h_hp:=greatest(0,h_hp-dmg);
    else g_hp:=greatest(0,g_hp-dmg); end if;
    log_text:=actor_name||' '||result_text;
  end if;
  new_step:=r.step+1;
  new_round:=least(3,1+floor(new_step/4.0)::integer);
  if h_hp=0 or g_hp=0 or new_step>=12 then
    if h_hp>g_hp then winner:=r.host_id;
    elsif g_hp>h_hp then winner:=r.guest_id;
    else winner:=null; end if;
    finish:=case when h_hp=0 or g_hp=0 then '체력 소진' else '3라운드 종료 · 남은 체력 판정' end;
    if winner is null then finish:=finish||' · 무승부'; end if;
  end if;
  ev:=r.events||jsonb_build_array(jsonb_build_object(
    'round',r.round_no,'kind',p_move,'actor',p_user,'text',log_text,
    'host_hp',h_hp,'guest_hp',g_hp,'step',r.step));
  if finish<>'' then
    ev:=ev||jsonb_build_array(jsonb_build_object('round',3,'kind','done',
      'text',case when winner is null then '대련 종료 · 무승부'
                   when winner=r.host_id then '대련 종료 · '||r.host_name||' 승리'
                   else '대련 종료 · '||r.guest_name||' 승리' end));
  end if;
  update public.pvp_rooms set host_hp=h_hp,guest_hp=g_hp,
    pending_attack=case when p_move='attack' then av else 0 end,
    step=new_step,round_no=new_round,
    status=case when finish<>'' then 'done' else 'active' end,
    finish_reason=finish,winner_id=winner,events=ev,updated_at=now()
  where id=p_room;
  return jsonb_build_object('step',new_step,'host_hp',h_hp,'guest_hp',g_hp,
    'done',finish<>'','winner_id',winner,'log',log_text);
end; $$;

create or replace function public.pvp_leave(p_user text,p_token text,p_room bigint)
returns jsonb language plpgsql security definer set search_path=public as $$
declare r public.pvp_rooms%rowtype; winner text; ev jsonb;
begin
  perform public.pvp_assert(p_user,p_token);
  select * into r from public.pvp_rooms where id=p_room for update;
  if not found or p_user not in (r.host_id,coalesce(r.guest_id,'')) then raise exception '참가자가 아닙니다.'; end if;
  if r.status not in ('waiting','active') then raise exception '이미 종료된 방입니다.'; end if;
  if r.status='waiting' then
    if p_user<>r.host_id then raise exception '방장만 대기 중인 방을 닫을 수 있습니다.'; end if;
    update public.pvp_rooms set status='cancelled',finish_reason='방장 취소',updated_at=now() where id=p_room;
    return jsonb_build_object('status','cancelled');
  end if;
  winner:=case when p_user=r.host_id then r.guest_id else r.host_id end;
  ev:=r.events||jsonb_build_array(jsonb_build_object('round',r.round_no,'kind','done',
    'text',(case when p_user=r.host_id then r.host_name else r.guest_name end)||' 기권 · 상대 승리'));
  update public.pvp_rooms set status='done',winner_id=winner,finish_reason='기권',events=ev,updated_at=now() where id=p_room;
  return jsonb_build_object('status','done','winner_id',winner);
end; $$;

create or replace function public.pvp_say(p_user text,p_token text,p_room bigint,p_body text)
returns bigint language plpgsql security definer set search_path=public as $$
declare r public.pvp_rooms%rowtype; new_id bigint; sender_name text; content text;
begin
  perform public.pvp_assert(p_user,p_token);
  select * into r from public.pvp_rooms where id=p_room;
  if not found or p_user not in (r.host_id,coalesce(r.guest_id,'')) then raise exception '대련방 참가자만 채팅할 수 있습니다.'; end if;
  if r.status not in ('waiting','active','done') then raise exception '취소된 방입니다.'; end if;
  content:=btrim(coalesce(p_body,''));
  if char_length(content)<1 or char_length(content)>500 then raise exception '채팅은 1~500자까지 입력할 수 있습니다.'; end if;
  sender_name:=case when p_user=r.host_id then r.host_name else r.guest_name end;
  insert into public.pvp_messages(room_id,sender_id,sender_name,body)
    values(p_room,p_user,sender_name,content) returning id into new_id;
  return new_id;
end; $$;

create or replace function public.pvp_view(p_user text,p_token text,p_room bigint default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare selected public.pvp_rooms%rowtype; rooms_json jsonb; messages_json jsonb; records_json jsonb;
begin
  perform public.pvp_assert(p_user,p_token);
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',x.id,'host_id',x.host_id,'guest_id',x.guest_id,
    'host_name',x.host_name,'guest_name',x.guest_name,'note',x.note,
    'status',x.status,'created_at',x.created_at) order by x.created_at desc),'[]'::jsonb)
    into rooms_json from (
      select * from public.pvp_rooms where status in ('waiting','active')
      order by created_at desc limit 40
    ) x;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',x.id,'host_name',x.host_name,'guest_name',x.guest_name,
    'status',x.status,'winner_id',x.winner_id,'finish_reason',x.finish_reason,
    'updated_at',x.updated_at) order by x.updated_at desc),'[]'::jsonb)
    into records_json from (
      select * from public.pvp_rooms where status='done' and (host_id=p_user or guest_id=p_user)
      order by updated_at desc limit 8
    ) x;
  if p_room is not null then
    select * into selected from public.pvp_rooms r
      where r.id=p_room and (r.host_id=p_user or r.guest_id=p_user);
  else
    select * into selected from public.pvp_rooms r
      where r.status in ('waiting','active') and (r.host_id=p_user or r.guest_id=p_user)
      order by r.created_at desc limit 1;
  end if;
  if found then
    select coalesce(jsonb_agg(to_jsonb(m) order by m.id),'[]'::jsonb) into messages_json
      from (select * from public.pvp_messages where room_id=selected.id order by id desc limit 80) m;
  else
    messages_json:='[]'::jsonb;
  end if;
  return jsonb_build_object('rooms',rooms_json,'records',records_json,
    'mine',case when selected.id is null then null else to_jsonb(selected) end,
    'messages',messages_json);
end; $$;

revoke all on function public.pvp_assert(text,text) from public;
revoke all on function public.pvp_sanitize_stats(jsonb) from public;
revoke all on function public.pvp_roll(integer) from public;
-- 단순 SQL 헬퍼는 직접 호출 필요가 없지만 주 RPC 내부에서는 실행됩니다.
grant execute on function public.pvp_create(text,text,text,jsonb,text) to anon, authenticated;
grant execute on function public.pvp_join(text,text,bigint,text,jsonb) to anon, authenticated;
grant execute on function public.pvp_act(text,text,bigint,text) to anon, authenticated;
grant execute on function public.pvp_leave(text,text,bigint) to anon, authenticated;
grant execute on function public.pvp_say(text,text,bigint,text) to anon, authenticated;
grant execute on function public.pvp_view(text,text,bigint) to anon, authenticated;
