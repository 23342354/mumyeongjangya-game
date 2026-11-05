-- 떠돌이 상인 특선: 같은 등급 파밍 대비 기본 능력치 3/3.6/4.2배 + 각인 8/10/12 + 전투 특화 옵션 3/4/5줄.
-- 이 파일 전체를 Supabase SQL Editor에서 실행하세요. 기존 매물과 입찰은 보존하며 새 회차부터 적용됩니다.
-- 기존 공용 경매가 설치된 운영 Supabase SQL Editor에서 전체를 한 번 실행합니다.
-- 기존 입찰/보증금/낙찰/수령 기록은 보존합니다. 재실행할 수 있습니다.
begin;
alter table public.wandering_auction_lots add column if not exists level_band integer not null default -1;
-- -1 marks legacy lots. Never change their promised item or bids.
alter table public.wandering_auction_lots drop constraint if exists wandering_auction_lots_session_at_tier_key;
create unique index if not exists wandering_auction_session_band_tier_idx on public.wandering_auction_lots(session_at,level_band,tier);
create index if not exists wandering_auction_band_live_idx on public.wandering_auction_lots(session_at,level_band,tier) where status='open';
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
 v_idx int;v_band int;v_actor_band int;v_max_band int;v_level int;v_grade int;v_bands jsonb;
begin
 if p_actor is null or p_token is null or not exists(
  select 1 from public.accounts where id=p_actor and pw=p_token
 ) then raise exception '계정 로그인이 필요합니다.';end if;
 if p_action not in ('snapshot','bid','claim') then raise exception '허용되지 않은 경매 요청입니다.';end if;
 select * into a from public.accounts where id=p_actor;
 v_actor_band:=greatest(0,coalesce((a.save->>'lvl')::int,1)/10*10);
 v_max_band:=greatest(100,v_actor_band+20);
 v_band:=case when p_action='snapshot' and p_lot_id is not null then p_lot_id::int else v_actor_band end;
 if v_band<0 or mod(v_band,10)<>0 or v_band>v_max_band then raise exception '표시할 레벨대를 다시 선택해 주세요.';end if;
 -- 모든 경매 입찰/회수/회차 생성이 동일한 DB 직렬화 잠금을 사용합니다.
 perform pg_advisory_xact_lock(726503220061::bigint);
 v_clock:=clock_timestamp();
 v_start:=(date_trunc('hour',v_clock at time zone 'Asia/Seoul') at time zone 'Asia/Seoul');
 v_next:=v_start+interval '1 hour';
 -- Only the requested band is materialized. All players browsing that band
 -- share the same three server lots, regardless of their own character level.
 for v_tier in 1..3 loop
   v_grade:=v_tier+1;
   v_level:=case when v_band=0 then 9 else v_band+9 end;
   v_idx:=1+mod((extract(epoch from v_start)::bigint/3600+v_band+v_tier),4)::int;
   v_slot:=v_slots[v_idx];v_stat:=v_stats[v_idx];
   v_name:=(array['낡은 수레의','홍월 유랑단의','잊힌 골목의'])[v_tier]||' '||v_names[v_idx];
   v_reward:=jsonb_build_object(
      'slot',v_slot,'name',v_name,'grade',v_grade,'lv',v_level,'enh',(array[8,10,12])[v_tier],'merchantElite',true,'auctionQualityVersion',3,
      'main',jsonb_build_object('st',v_stat,'v',greatest(1,round((0.8+v_level*0.085)*(array[1.85,2.50,3.40])[v_tier]*(array[3.0,3.6,4.2])[v_tier]))),
      'opts',case v_tier
        when 1 then jsonb_build_array(jsonb_build_object('k','atkP','n','공격력','v',22.0),jsonb_build_object('k','hpP','n','생명력','v',28.0),jsonb_build_object('k','crit','n','치명타 확률','v',10.0))
        when 2 then jsonb_build_array(jsonb_build_object('k','atkP','n','공격력','v',30.0),jsonb_build_object('k','defP','n','방어력','v',26.0),jsonb_build_object('k','crit','n','치명타 확률','v',12.0),jsonb_build_object('k','critD','n','치명타 피해','v',42.0))
        else jsonb_build_array(jsonb_build_object('k','atkP','n','공격력','v',40.0),jsonb_build_object('k','hpP','n','생명력','v',48.0),jsonb_build_object('k','crit','n','치명타 확률','v',14.0),jsonb_build_object('k','critD','n','치명타 피해','v',56.0),jsonb_build_object('k','spd','n','공격 속도','v',24.0)) end
   );
   insert into public.wandering_auction_lots(
      session_at,level_band,tier,item_name,item_data,start_price,ends_at
   ) values(v_start,v_band,v_tier,v_name,v_reward,
      round((array[6000,24000,70000])[v_tier]*(1+v_band/20.0))::bigint,v_start+interval '15 minutes')
   on conflict(session_at,level_band,tier) do nothing;
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
   from (select id,level_band,tier,item_name,item_data,start_price,bid_amount,bid_count,winner_name,
           (winner_id=p_actor) as mine,ends_at
         from public.wandering_auction_lots
         where status='open' and ends_at>v_clock and session_at=v_start and level_band in(v_band,-1)
         order by level_band desc,tier) x;
 select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into v_pending
   from (select id,level_band,tier,item_name,item_data,bid_amount,ends_at from public.wandering_auction_lots
         where winner_id=p_actor and status='closed' and claimed_at is null order by ends_at desc limit 30) x;
 select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into v_history
   from (select id,level_band,tier,item_name,item_data,bid_amount,bid_count,winner_name,ends_at from public.wandering_auction_lots
         where status='closed' order by ends_at desc,tier limit 12) x;
 select jsonb_agg(jsonb_build_object('band',n,'min',case when n=0 then 1 else n end,'max',case when n=0 then 9 else n+9 end) order by n) into v_bands from generate_series(0,v_max_band,10) n;
 return jsonb_build_object('ok',true,'version',2,'level_band',v_band,'my_band',v_actor_band,'bands',v_bands,'server_at',v_clock,'next_at',v_next,
   'live',v_live,'pending',v_pending,'history',v_history,
   'rev',a.market_rev,'inventory',jsonb_build_object('rin',a.save->'rin','bag',a.save->'bag',
   'gid',a.save->'gid','marketRev',coalesce(a.save->'marketRev','0'::jsonb)));
end $$;
revoke all on function public.wandering_auction(text,text,text,bigint,bigint,text) from public;
grant execute on function public.wandering_auction(text,text,text,bigint,bigint,text) to anon,authenticated;
commit;
