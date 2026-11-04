-- 무명장야: 공동 동기화의 잠금 대기·반복 저장 완화. 운영 Supabase SQL Editor에서 1회 실행.
-- 선행: 기존 pair_play 공동 지갑 설치. 데이터 초기화/삭제 없이 함수·인덱스·선택 트리거만 갱신.
-- 트랜잭션 전체가 성공해야 적용됩니다. 재실행할 수 있습니다.
begin;
create index if not exists pairs_accepted_from_recent_idx on public.pairs(from_id,id desc) where status='accepted';
create index if not exists pairs_accepted_to_recent_idx on public.pairs(to_id,id desc) where status='accepted';
create or replace function public.pp_snapshot(t public.pair_play_state, actor text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare p public.pairs%rowtype; a public.accounts%rowtype; b public.accounts%rowtype;begin
 select * into p from public.pairs where id=t.pair_id;
 select * into a from public.accounts where id=actor;
 select * into b from public.accounts where id=case when p.from_id=actor then p.to_id else p.from_id end;
 return jsonb_build_object('ok',true,'syncVersion',2,'pairId',p.id,'revision',t.revision,'wallet',t.wallet,'progress',t.progress,
 'self',public.pp_apply((a.save-'msgs'-'sb'-'pair'),t.wallet,t.progress)||jsonb_build_object('pairShared',p.id,'pairPersonalRev',a.pair_play_rev),
 'pair',to_jsonb(p)-'rent_receipts','peer',public.pp_peer(public.pp_apply(b.save,t.wallet,t.progress)),'peerId',b.id,'peerSeen',b.seen_at,'meta',t.meta,'passNext',greatest(0,720-extract(epoch from(now()-t.pass_at))/60),'bossNext',greatest(0,300-extract(epoch from(now()-t.boss_at))/60));
end $$;
create or replace function public.pair_play(
 p_user text,p_token text,p_action text default 'get',p_revision bigint default 0,p_request text default '',
 p_save jsonb default null,p_wallet jsonb default null,p_progress jsonb default null,p_xp bigint default 0,
 p_meta jsonb default '{}',p_effects jsonb default '{}',p_loss jsonb default '{}'
) returns jsonb language plpgsql security definer set search_path=public set lock_timeout='750ms' as $$
declare a public.accounts%rowtype;b public.accounts%rowtype;p public.pairs%rowtype;t public.pair_play_state%rowtype;
 w jsonb;pr jsonb;x jsonb;y jsonb;k text;z jsonb;items jsonb;gid bigint=1;elapsed numeric;rate numeric;cap numeric;
 expn numeric;lv int;pts int;cost bigint;due numeric;cur numeric;peerid text;old_wallet jsonb;old_progress jsonb;
begin
 select * into a from public.accounts where id=p_user and pw=p_token;
 if not found then raise exception 'PAIR_AUTH';end if;
 select * into p from public.pairs where status='accepted' and p_user in(from_id,to_id) order by id desc limit 1;
 if not found then return jsonb_build_object('ok',true,'solo',true,'self',jsonb_set((a.save-'pairShared'-'pairPersonalRev'),'{pair}',coalesce(a.save->'pair','{}')||'{"mine":null}'::jsonb)||jsonb_build_object('pairSoloRev',a.pair_play_rev));end if;
 -- Passive polling never takes row locks or updates either account.
 if p_action='peek' then
  select * into t from public.pair_play_state where pair_id=p.id;
  if found and not t.closed then return public.pp_snapshot(t,p_user);end if;
  p_action:='get';
 end if;
 if not pg_try_advisory_xact_lock(p.id) then
  return jsonb_build_object('ok',false,'busy',true,'message','공동 기록을 반영 중입니다. 잠시 후 다시 저장합니다.');
 end if;
 select * into p from public.pairs where id=p.id and status='accepted' for update nowait;
 if not found then raise exception 'PAIR_CHANGED';end if;
 select * into t from public.pair_play_state where pair_id=p.id for update nowait;
 peerid:=case when p.from_id=p_user then p.to_id else p.from_id end;
 perform 1 from public.accounts where id in(p.from_id,p.to_id) order by id for update nowait;
 select * into a from public.accounts where id=p_user;
 select * into b from public.accounts where id=peerid;
 if t.pair_id is null then
  if a.save is null or b.save is null or not coalesce((a.save->>'made')::boolean,false) or not coalesce((b.save->>'made')::boolean,false) then
   return jsonb_build_object('ok',false,'waiting',true,'message','두 사람 모두 캐릭터를 만든 뒤 연결할 수 있습니다.');end if;
  if b.seen_at<now()-interval '2 minutes' then return jsonb_build_object('ok',false,'waiting',true,'message','처음 한 번은 파트너도 접속해 최신 기록을 저장해 주세요.');end if;
  if (a.save->'run' is not null and a.save->'run'<>'null' and not coalesce((a.save#>>'{run,done}')::boolean,false)) or
     (b.save->'run' is not null and b.save->'run'<>'null' and not coalesce((b.save#>>'{run,done}')::boolean,false)) then
   return jsonb_build_object('ok',false,'waiting',true,'message','진행 중인 개인 의뢰를 귀환·정산한 뒤 공동 출동을 연결합니다.');end if;
  -- Global numeric item ids prevent the two old gid counters from colliding.
  for k in select id from public.accounts where id in(p.from_id,p.to_id) order by id loop
   select save into x from public.accounts where id=k;
   items:='[]';for z in select value from jsonb_array_elements(coalesce(x->'bag','[]')) loop items:=items||jsonb_build_array(z||jsonb_build_object('id',gid));gid:=gid+1;end loop;x:=jsonb_set(x,'{bag}',items);
   y:=coalesce(x->'gear','{}');for z in select jsonb_build_object('slot',key,'item',value) from jsonb_each(y) where value<>'null' loop
    y:=jsonb_set(y,array[z->>'slot'],(z->'item')||jsonb_build_object('id',gid));gid:=gid+1;end loop;x:=jsonb_set(x,'{gear}',y);
   items:='[]';for z in select value from jsonb_array_elements(coalesce(x#>'{balance20,pendingLoot}','[]')) loop items:=items||jsonb_build_array(z||jsonb_build_object('id',gid));gid:=gid+1;end loop;
   x:=jsonb_set(x,'{balance20}',coalesce(x->'balance20','{}')||jsonb_build_object('pendingLoot',items));
   update public.accounts set save=x where id=k;
  end loop;
  select * into a from public.accounts where id=p_user;select * into b from public.accounts where id=peerid;
  w:=public.pp_sum(public.pp_wallet(a.save),public.pp_wallet(b.save));w:=jsonb_set(w,'{gid}',to_jsonb(gid));
  pr:=public.pp_progress(a.save);y:=public.pp_progress(b.save);
  pr:=pr||jsonb_build_object('wbDmg',coalesce((a.save#>>'{wb,dmg}')::numeric,0)+coalesce((b.save#>>'{wb,dmg}')::numeric,0),'wbWeek',to_char(date_trunc('week',now() at time zone 'Asia/Seoul'),'YYYY-MM-DD'),'course',greatest((pr->>'course')::int,(y->>'course')::int),
   'tower',greatest((pr->>'tower')::int,(y->>'tower')::int),'tower2',greatest((pr->>'tower2')::int,(y->>'tower2')::int),
   'examHist',coalesce(y->'examHist','{}')||coalesce(pr->'examHist','{}'),'graduated',coalesce((pr->>'graduated')::boolean,false) or coalesce((y->>'graduated')::boolean,false),'run','null'::jsonb,'rent_due',greatest(coalesce(p.rent_due,0),coalesce((a.save#>>'{home,due}')::numeric,0),coalesce((b.save#>>'{home,due}')::numeric,0)));
  if coalesce((y#>>'{arena,season}')::int,1)*100+coalesce((y#>>'{arena,round}')::int,1)>coalesce((pr#>>'{arena,season}')::int,1)*100+coalesce((pr#>>'{arena,round}')::int,1) then pr:=jsonb_set(pr,'{arena}',y->'arena');end if;
  pr:=jsonb_set(pr,'{arena,best}',to_jsonb(greatest(coalesce((pr#>>'{arena,best}')::int,0),coalesce((y#>>'{arena,best}')::int,0))));
  for k in select jsonb_object_keys(coalesce(y->'examHist','{}')) loop
   if coalesce((y#>>array['examHist',k,'score'])::numeric,0)>coalesce((pr#>>array['examHist',k,'score'])::numeric,0) then pr:=jsonb_set(pr,array['examHist',k],y#>array['examHist',k]);end if;
  end loop;
  for k in select unnest(array['farm','fish']) loop
   if coalesce((y#>>array['life',k,'skill'])::int,1)>coalesce((pr#>>array['life',k,'skill'])::int,1) then pr:=jsonb_set(pr,array['life',k],y#>array['life',k]);end if;
  end loop;
  if coalesce((b.save#>>'{home,stage}')::int,0)>coalesce((a.save#>>'{home,stage}')::int,0) then pr:=jsonb_set(pr,'{sharedHome}',y->'sharedHome');end if;
  pr:=jsonb_set(pr,'{quests}',coalesce(pr->'quests','{}')||jsonb_build_object('cleared',greatest(coalesce((a.save#>>'{quests,cleared}')::int,0),coalesce((b.save#>>'{quests,cleared}')::int,0)),'gate',greatest(coalesce((a.save#>>'{quests,gate}')::int,0),coalesce((b.save#>>'{quests,gate}')::int,0))));
  for k in select unnest(array['mon','plant','fish','dish']) loop
   select coalesce(jsonb_agg(distinct value),'[]') into z from jsonb_array_elements(coalesce(pr#>array['dex',k],'[]')||coalesce(y#>array['dex',k],'[]'));
   pr:=jsonb_set(pr,array['dex',k],z,true);
  end loop;
  select coalesce(jsonb_agg(distinct value),'[]') into z from jsonb_array_elements(coalesce(pr->'bossClaims','[]')||coalesce(y->'bossClaims','[]'));pr:=jsonb_set(pr,'{bossClaims}',z);
  insert into public.pair_play_state(pair_id,wallet,progress) values(p.id,w,pr) returning * into t;
  select 80+coalesce(sum(coalesce((save#>>'{res,r11}')::int,0))*5,0) into cap from public.accounts where id in(p.from_id,p.to_id);
  update public.accounts set save=public.pp_apply(save,w,pr)||jsonb_build_object('pairShared',p.id,'pairBagCap',cap),pair_play_rev=pair_play_rev+1 where id in(p.from_id,p.to_id);
 end if;
 if t.closed then raise exception 'PAIR_CLOSED';end if;
 if p_action='get' then
  old_wallet:=t.wallet;old_progress:=t.progress;
  if coalesce(t.progress->>'wbWeek','')<>to_char(date_trunc('week',now() at time zone 'Asia/Seoul'),'YYYY-MM-DD') then
   t.progress:=t.progress||jsonb_build_object('wbDmg',0,'wbWeek',to_char(date_trunc('week',now() at time zone 'Asia/Seoul'),'YYYY-MM-DD'));
  end if;
  elapsed:=extract(epoch from(now()-t.pass_at))/60;
  if elapsed>=720 then
   t.wallet:=jsonb_set(t.wallet,'{pass}',to_jsonb(greatest((t.wallet->>'pass')::numeric,least(6,(t.wallet->>'pass')::numeric+floor(elapsed/720)*2))));
   t.pass_at:=t.pass_at+(floor(elapsed/720)*interval '12 hours');end if;
  elapsed:=extract(epoch from(now()-t.boss_at))/60;
  if elapsed>=300 then
   t.wallet:=jsonb_set(t.wallet,'{wbTickets}',to_jsonb(greatest((t.wallet->>'wbTickets')::numeric,least(6,(t.wallet->>'wbTickets')::numeric+floor(elapsed/300)*2))));
   t.boss_at:=t.boss_at+(floor(elapsed/300)*interval '5 hours');end if;
  elapsed:=least(1440,greatest(0,extract(epoch from(now()-t.mana_at))/60));
  if elapsed>=0.25 then
   select coalesce(sum((value->>'rate')::numeric),0),coalesce(sum((value->>'cap')::numeric),0) into rate,cap from jsonb_each(t.meta);
   -- Reading at full mana (or without recovery metadata) must not create a fake conflict.
   if cap>0 and rate>0 and (t.wallet->>'mana')::numeric<cap then
    t.wallet:=jsonb_set(t.wallet,'{mana}',to_jsonb(least(cap,(t.wallet->>'mana')::numeric+rate*elapsed)));
   end if;
   t.mana_at:=now();
  end if;
  update public.pair_play_state st set wallet=t.wallet,progress=t.progress,
    pass_at=t.pass_at,boss_at=t.boss_at,mana_at=t.mana_at,
    revision=st.revision+case when old_wallet is distinct from t.wallet or old_progress is distinct from t.progress then 1 else 0 end
  where pair_id=p.id and (st.wallet is distinct from t.wallet or st.progress is distinct from t.progress
    or st.pass_at is distinct from t.pass_at or st.boss_at is distinct from t.boss_at or st.mana_at is distinct from t.mana_at)
  returning * into t;
  if not found then select * into t from public.pair_play_state where pair_id=p.id;end if;
  return public.pp_snapshot(t,p_user);
 end if;
 if p_action not in('commit','rent') then raise exception 'PAIR_ACTION';end if;
 if length(p_request) not between 8 and 160 then raise exception 'PAIR_REQUEST';end if;
 if exists(select 1 from public.pair_play_receipts where pair_id=p.id and request_id=p_request) then return public.pp_snapshot(t,p_user)||'{"replayed":true}';end if;
 if p_revision<>t.revision then return public.pp_snapshot(t,p_user)||'{"conflict":true}';end if;
 if p_action='rent' then
  cost:=0;for x in select save from public.accounts where id in(p.from_id,p.to_id) loop
   cur:=(case x->>'hall' when 'w1' then 12000 when 'w2' then 9000 when 'w3' then 7000 when 'w4' then 5000 when 'w5' then 3500 when 'w6' then 2000 when 'w7' then 1000 else 0 end)*(1+least(5,greatest(0,coalesce((x#>>'{home,stage}')::int,0)))*0.35);cost:=greatest(cost,round(cur));end loop;
  cur:=extract(epoch from(now()-timestamptz '2026-11-01 15:00:00+00'))/60;
  due:=coalesce((t.progress->>'rent_due')::numeric,0);
  if due>cur then return public.pp_snapshot(t,p_user);end if;
  if (t.wallet->>'rin')::numeric<cost then raise exception '공동 륜이 부족합니다.';end if;
  t.wallet:=jsonb_set(t.wallet,'{rin}',to_jsonb((t.wallet->>'rin')::numeric-cost));
  t.progress:=jsonb_set(t.progress,'{rent_due}',to_jsonb(cur+1440));
  update public.pairs set rent_due=(cur+1440)::double precision where id=p.id;
 else
  if p_save is null or p_wallet is null or p_progress is null then raise exception 'PAIR_PAYLOAD';end if;
  if not public.pp_nonnegative(p_wallet-'bag'-'pendingLoot') or jsonb_typeof(p_wallet->'bag')<>'array' or jsonb_typeof(p_wallet->'pendingLoot')<>'array' then raise exception '공동 잔액 또는 재료가 부족합니다.';end if;
  if coalesce((p_save->>'pairPersonalRev')::bigint,-1)<>a.pair_play_rev then return public.pp_snapshot(t,p_user)||'{"conflict":true}';end if;
  t.wallet:=p_wallet;t.progress:=p_progress;
  if p_xp not between 0 and 100000000 then raise exception 'PAIR_XP';end if;
  x:=p_save;y:=b.save;
  expn:=coalesce((y->>'exp')::numeric,0)+p_xp;lv:=greatest(1,coalesce((y->>'lvl')::int,1));pts:=coalesce((y->>'pts')::int,0);
  while expn>=round(260*power(1.11::numeric,lv-1)) loop expn:=expn-round(260*power(1.11::numeric,lv-1));lv:=lv+1;pts:=pts+2;exit when lv>500;end loop;
  y:=y||jsonb_build_object('exp',expn,'lvl',lv,'pts',pts);
  y:=y||jsonb_build_object('hp',greatest(1,coalesce((y->>'hp')::numeric,100)-coalesce((p_loss->>'hp')::numeric,0)),'sn',greatest(1,coalesce((y->>'sn')::numeric,100)-coalesce((p_loss->>'sn')::numeric,0)));
  if p_effects ? 'buffs' then
   for z in select value from jsonb_array_elements(p_effects->'buffs') loop
    z:=z||jsonb_build_object('pairExpiresAt',extract(epoch from now())*1000+coalesce((z->>'left')::numeric,0)*60000);
    select coalesce(jsonb_agg(value),'[]') into items from jsonb_array_elements(coalesce(x->'buffs','[]')) where not(value->>'n'=z->>'n' and value->>'key'=z->>'key');x:=jsonb_set(x,'{buffs}',items||jsonb_build_array(z));
    select coalesce(jsonb_agg(value),'[]') into items from jsonb_array_elements(coalesce(y->'buffs','[]')) where not(value->>'n'=z->>'n' and value->>'key'=z->>'key');
    y:=jsonb_set(y,'{buffs}',items||jsonb_build_array(z));
   end loop;
  end if;
  if p_effects ? 'eat' then z:=p_effects->'eat';if z<>'null' then z:=z||jsonb_build_object('pairExpiresAt',extract(epoch from now())*1000+coalesce((z->>'left')::numeric,0)*60000);end if;y:=jsonb_set(y,'{kit}',coalesce(y->'kit','{}')||jsonb_build_object('eat',z));x:=jsonb_set(x,'{kit}',coalesce(x->'kit','{}')||jsonb_build_object('eat',z));end if;
  if p_effects ? 'dess' then z:=p_effects->'dess';if z<>'null' then z:=z||jsonb_build_object('pairExpiresAt',extract(epoch from now())*1000+coalesce((z->>'left')::numeric,0)*60000);end if;y:=jsonb_set(y,'{kit}',coalesce(y->'kit','{}')||jsonb_build_object('dess',z));x:=jsonb_set(x,'{kit}',coalesce(x->'kit','{}')||jsonb_build_object('dess',z));end if;
 end if;
 if jsonb_typeof(p_meta)='object' then
  for k,z in select key,value from jsonb_each(p_meta) loop
   if k not in(p.from_id,p.to_id) or not ((z->>'rate')::numeric between 0 and 100000000 and (z->>'cap')::numeric between 1 and 1000000000000) then raise exception 'PAIR_META';end if;
  end loop;t.meta:=t.meta||p_meta;end if;
 update public.pair_play_state set wallet=t.wallet,progress=t.progress,meta=t.meta,revision=revision+1 where pair_id=p.id returning * into t;
 -- Write each account once. In particular, don't fire all save watchers three times.
 select 80+coalesce(sum(coalesce(((case when p_action='commit' and id=p_user then x
   when p_action='commit' and id=peerid then y else save end)#>>'{res,r11}')::int,0))*5,0)
 into cap from public.accounts where id in(p.from_id,p.to_id);
 update public.accounts set save=public.pp_apply(case when p_action='commit' and id=p_user then x
   when p_action='commit' and id=peerid then y else save end,t.wallet,t.progress)
   ||jsonb_build_object('pairShared',p.id,'pairBagCap',cap),pair_play_rev=pair_play_rev+1,
   seen_at=case when id=p_user then now() else seen_at end
 where id in(p.from_id,p.to_id);
 insert into public.pair_play_receipts(pair_id,request_id,actor) values(p.id,p_request,p_user);
 return public.pp_snapshot(t,p_user);
exception when lock_not_available then
 return jsonb_build_object('ok',false,'busy',true,'message','공동 기록을 반영 중입니다. 잠시 후 다시 저장합니다.');
end $$;

-- Only inspect push schedules if the fields used by that watcher actually changed.
do $patch$ begin
 if to_regprocedure('public.mm_push_watch_farm()') is not null then
  drop trigger if exists trg_mm_push_watch_farm on public.accounts;
  create trigger trg_mm_push_watch_farm after update of save on public.accounts
   for each row when ((old.save#>'{farm,plots}') is distinct from (new.save#>'{farm,plots}'))
   execute function public.mm_push_watch_farm();
 end if;
 if to_regprocedure('public.mm_push_watch_timers()') is not null then
  drop trigger if exists trg_mm_push_watch_timers on public.accounts;
  create trigger trg_mm_push_watch_timers after update of save on public.accounts
   for each row when (old.save->'lesson' is distinct from new.save->'lesson'
    or old.save->'study' is distinct from new.save->'study'
    or old.save->'run' is distinct from new.save->'run')
   execute function public.mm_push_watch_timers();
 end if;
 if to_regclass('public.messages') is not null then
  create index if not exists messages_channel_history_idx on public.messages(tab,scope,id desc);
 end if;
end $patch$;
revoke all on function public.pp_snapshot(public.pair_play_state,text) from public,anon,authenticated;
revoke all on function public.pair_play(text,text,text,bigint,text,jsonb,jsonb,jsonb,bigint,jsonb,jsonb,jsonb) from public;
grant execute on function public.pair_play(text,text,text,bigint,text,jsonb,jsonb,jsonb,bigint,jsonb,jsonb,jsonb) to anon,authenticated;
commit;
