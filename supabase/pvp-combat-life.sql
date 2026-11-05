-- 기존 PvP 설치 후 실행. 새 방만 생명력 규칙(v2)을 사용합니다.
BEGIN;
ALTER TABLE public.pvp_rooms ADD COLUMN IF NOT EXISTS host_max_hp integer NOT NULL DEFAULT 100;
ALTER TABLE public.pvp_rooms ADD COLUMN IF NOT EXISTS guest_max_hp integer NOT NULL DEFAULT 100;
ALTER TABLE public.pvp_rooms ADD COLUMN IF NOT EXISTS rules_version integer NOT NULL DEFAULT 1;
ALTER TABLE public.pvp_rooms DROP CONSTRAINT IF EXISTS pvp_rooms_host_hp_check;
ALTER TABLE public.pvp_rooms DROP CONSTRAINT IF EXISTS pvp_rooms_guest_hp_check;
ALTER TABLE public.pvp_rooms DROP CONSTRAINT IF EXISTS pvp_rooms_host_life_check;
ALTER TABLE public.pvp_rooms DROP CONSTRAINT IF EXISTS pvp_rooms_guest_life_check;
ALTER TABLE public.pvp_rooms ADD CONSTRAINT pvp_rooms_host_life_check CHECK(host_max_hp BETWEEN 1 AND 1000000000 AND host_hp BETWEEN 0 AND host_max_hp);
ALTER TABLE public.pvp_rooms ADD CONSTRAINT pvp_rooms_guest_life_check CHECK(guest_max_hp BETWEEN 1 AND 1000000000 AND guest_hp BETWEEN 0 AND guest_max_hp);
CREATE OR REPLACE FUNCTION public.pvp_saved_life(p_user text) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.accounts%ROWTYPE;life numeric;
BEGIN
 SELECT * INTO STRICT a FROM public.accounts WHERE id=p_user;
 IF jsonb_typeof(a.save#>'{pvpLife,hp}') IS DISTINCT FROM 'number' THEN
  RAISE EXCEPTION '개인 생명력 기록을 먼저 저장해 주세요. 최신 화면으로 새로고침 후 다시 시도해 주세요.';
 END IF;
 life:=(a.save#>>'{pvpLife,hp}')::numeric;
 IF life NOT BETWEEN 1 AND 1000000000 OR life<>trunc(life) THEN RAISE EXCEPTION '생명력 기록을 확인해 주세요.';END IF;
 RETURN life::integer;
END $$;
REVOKE ALL ON FUNCTION public.pvp_saved_life(text) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.pvp_scaled_damage(raw_damage integer,host_life integer,guest_life integer,target_life integer) RETURNS integer
LANGUAGE sql IMMUTABLE AS $$
 SELECT least(floor(target_life::numeric*0.45),greatest(0,round(greatest(0,raw_damage)::numeric*sqrt(host_life::numeric*guest_life::numeric)/100)))::integer
$$;
REVOKE ALL ON FUNCTION public.pvp_scaled_damage(integer,integer,integer,integer) FROM PUBLIC,anon,authenticated;
create or replace function public.pvp_create(
  p_user text, p_token text, p_name text, p_stats jsonb, p_note text default ''
) returns bigint language plpgsql security definer set search_path=public as $$
declare new_id bigint; player_name text; life integer;
begin
  perform public.pvp_assert(p_user,p_token);
  -- 계정 단위 동시 생성/참가 경쟁 방지
  perform pg_advisory_xact_lock(hashtextextended('pvp-user:'||p_user,0));
  if exists (select 1 from public.pvp_rooms where status in ('waiting','active')
    and (host_id=p_user or guest_id=p_user)) then
    raise exception '이미 참여 중인 대련이 있습니다.';
  end if;
  player_name:=left(coalesce(nullif(btrim(p_name),''),p_user),48);
  life:=public.pvp_saved_life(p_user);
  insert into public.pvp_rooms(host_id,host_name,host_stats,note,host_hp,host_max_hp,rules_version)
  values(p_user,player_name,public.pvp_sanitize_stats(p_stats),left(coalesce(p_note,''),90),life,life,2)
  returning id into new_id;
  return new_id;
end; $$;

create or replace function public.pvp_join(
  p_user text,p_token text,p_room bigint,p_name text,p_stats jsonb
) returns jsonb language plpgsql security definer set search_path=public as $$
declare r public.pvp_rooms%rowtype; life integer; h_ag integer; g_ag integer; fst text; join_name text;
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
    guest_stats=public.pvp_sanitize_stats(p_stats),guest_max_hp=case when r.rules_version=2 then public.pvp_saved_life(p_user) else 100 end,guest_hp=case when r.rules_version=2 then public.pvp_saved_life(p_user) else 100 end,first_id=fst,status='active',
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
      if r.rules_version=2 then dmg:=public.pvp_scaled_damage(dmg,r.host_max_hp,r.guest_max_hp,case when defender=r.host_id then r.host_max_hp else r.guest_max_hp end);end if;
      result_text:='방어 '||dv||' → 피해 '||dmg;
    else
      ar:=public.pvp_roll((atk_st->>'agi')::integer+1);
      dr:=public.pvp_roll((def_st->>'agi')::integer);
      dmg:=case when dr>=ar then 0 else av end;
      if r.rules_version=2 then dmg:=public.pvp_scaled_damage(dmg,r.host_max_hp,r.guest_max_hp,case when defender=r.host_id then r.host_max_hp else r.guest_max_hp end);end if;
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
    if (case when r.rules_version=2 then h_hp::bigint*r.guest_max_hp else h_hp::bigint end)>(case when r.rules_version=2 then g_hp::bigint*r.host_max_hp else g_hp::bigint end) then winner:=r.host_id;
    elsif (case when r.rules_version=2 then g_hp::bigint*r.host_max_hp else g_hp::bigint end)>(case when r.rules_version=2 then h_hp::bigint*r.guest_max_hp else h_hp::bigint end) then winner:=r.guest_id;
    else winner:=null; end if;
    finish:=case when h_hp=0 or g_hp=0 then '체력 소진' else case when r.rules_version=2 then '3라운드 종료 · 남은 생명력 비율 판정' else '3라운드 종료 · 남은 체력 판정' end end;
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


COMMIT;
