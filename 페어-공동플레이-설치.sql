-- 無明長夜 · 페어 공동 지갑·자동 동행. 기존 계정/장비 보존. 한 번 실행, 재실행 가능.
begin;
alter table public.accounts add column if not exists pair_play_rev bigint not null default 0;
alter table public.accounts add column if not exists market_rev bigint not null default 0;
create table if not exists public.pair_play_state(
 pair_id bigint primary key references public.pairs(id), wallet jsonb not null,
 progress jsonb not null, revision bigint not null default 1, meta jsonb not null default '{}',
 mana_at timestamptz not null default now(), closed boolean not null default false
);
alter table public.pair_play_state add column if not exists pass_at timestamptz not null default now();
alter table public.pair_play_state add column if not exists boss_at timestamptz not null default now();
alter table public.students add column if not exists pair_id bigint;
alter table public.students add column if not exists pair_name text;
create table if not exists public.pair_play_receipts(
 pair_id bigint not null references public.pair_play_state(pair_id), request_id text not null,
 actor text not null, created_at timestamptz not null default now(), primary key(pair_id,request_id)
);
alter table public.pair_play_state enable row level security;
alter table public.pair_play_receipts enable row level security;
revoke all on public.pair_play_state,public.pair_play_receipts from public,anon,authenticated;
create or replace function public.pp_sum(a jsonb,b jsonb) returns jsonb language plpgsql immutable as $$
declare k text; outv jsonb='{}';begin
 if jsonb_typeof(a)='object' or jsonb_typeof(b)='object' then
  for k in select jsonb_object_keys(coalesce(a,'{}')||coalesce(b,'{}')) loop
   outv:=outv||jsonb_build_object(k,public.pp_sum(a->k,b->k));end loop;return outv;
 elsif jsonb_typeof(a)='array' or jsonb_typeof(b)='array' then return coalesce(a,'[]')||coalesce(b,'[]');
 else return to_jsonb(coalesce((a#>>'{}')::numeric,0)+coalesce((b#>>'{}')::numeric,0));end if;
end $$;
create or replace function public.pp_wallet(s jsonb) returns jsonb language sql immutable as $$
 select jsonb_build_object('rin',coalesce(s->'rin','0'),'mana',coalesce(s->'mana','0'),'know',coalesce(s->'know','0'),
 'pass',coalesce(s->'pass','0'),'wbTickets',coalesce(s#>'{wb,tickets}','0'),'marks',coalesce(s#>'{fest,marks}','0'),'sari',coalesce(s->'sari','0'),'lotus',coalesce(s->'lotus','0'),'mat',coalesce(s->'mat','{}'),'ing',coalesce(s->'ing','{}'),
 'bmat',coalesce(s->'bmat','{}'),'ingredients',coalesce(s->'ingredients','{}'),'inv',coalesce(s->'inv','{}'),
 'potion',coalesce(s->'potion','{}'),'dishes',coalesce(s#>'{kit,have}','{}'),'seeds',coalesce(s#>'{farm,seeds}','{}'),
 'fertilizers',coalesce(s#>'{farm,fertilizers}','{}'),'fert',coalesce(s#>'{farm,fert}','0'),
 'bag',coalesce(s->'bag','[]'),'pendingLoot',coalesce(s#>'{balance20,pendingLoot}','[]'),'gid',coalesce(s->'gid','1'))
$$;
create or replace function public.pp_progress(s jsonb) returns jsonb language sql immutable as $$
 select jsonb_build_object('life',jsonb_build_object('farm',jsonb_build_object('skill',coalesce(s#>'{farm,skill}','1'),'exp',coalesce(s#>'{farm,exp}','0')),'fish',jsonb_build_object('skill',coalesce(s#>'{fish,skill}','1'),'exp',coalesce(s#>'{fish,exp}','0'),'catches',coalesce(s#>'{fish,catches}','{}'))),'pairRoomClaims',coalesce(s->'pairRoomClaims','[]'),'sharedHome',jsonb_build_object('hall',coalesce(s->>'hall','dorm'),'stage',coalesce(s#>'{home,stage}','0')),'wbDmg',coalesce(s#>'{wb,dmg}','0'),'wbWeek',coalesce(s#>'{wb,balanceWeek}','""'),'course',coalesce(s->'course','1'),'examHist',coalesce(s->'examHist','{}'),
 'graduated',coalesce(s->'graduated','false'),'tower',coalesce(s->'tower','0'),'tower2',coalesce(s->'tower2','0'),
 'quests',coalesce(s->'quests','{}')-'room'-'pick'-'durIdx','run',coalesce(s->'run','null'),
 'storyRead',coalesce(s->'storyRead','[]'),'dex',coalesce(s->'dex','{}')-'title'-'wards',
 'bossClaims',coalesce(s#>'{balance20,bossClaims}','[]'))
$$;
create or replace function public.pp_apply(s jsonb,w jsonb,p jsonb) returns jsonb language plpgsql immutable as $$
begin
 s:=s||(w-'dishes'-'seeds'-'fertilizers'-'fert'-'pendingLoot'-'marks'-'wbTickets')||(p-'quests'-'dex'-'bossClaims'-'wbDmg'-'wbWeek');
 if p ? 'sharedHome' then s:=s||jsonb_build_object('hall',p#>>'{sharedHome,hall}');s:=jsonb_set(s,'{home}',coalesce(s->'home','{}')||jsonb_build_object('stage',p#>'{sharedHome,stage}','due',greatest(coalesce((s#>>'{home,due}')::numeric,0),coalesce((p->>'rent_due')::numeric,0))));end if;
 s:=jsonb_set(s,'{wb}',coalesce(s->'wb','{}')||jsonb_build_object('tickets',w->'wbTickets','dmg',p->'wbDmg','balanceWeek',p->'wbWeek'));
 s:=jsonb_set(s,'{fest}',coalesce(s->'fest','{}')||jsonb_build_object('marks',w->'marks'));
 s:=jsonb_set(s,'{kit}',coalesce(s->'kit','{}')||jsonb_build_object('have',w->'dishes'));
 s:=jsonb_set(s,'{farm}',coalesce(s->'farm','{}')||jsonb_build_object('seeds',w->'seeds','fertilizers',w->'fertilizers','fert',w->'fert'));
 if p ? 'life' then s:=jsonb_set(s,'{farm}',coalesce(s->'farm','{}')||coalesce(p#>'{life,farm}','{}'));s:=jsonb_set(s,'{fish}',coalesce(s->'fish','{}')||coalesce(p#>'{life,fish}','{}'));end if;
 s:=jsonb_set(s,'{quests}',coalesce(s->'quests','{}')||coalesce(p->'quests','{}'));
 s:=jsonb_set(s,'{dex}',coalesce(s->'dex','{}')||coalesce(p->'dex','{}'));
 s:=jsonb_set(s,'{balance20}',coalesce(s->'balance20','{}')||jsonb_build_object('pendingLoot',w->'pendingLoot','bossClaims',p->'bossClaims'));
 return s;
end $$;
create or replace function public.pp_nonnegative(v jsonb) returns boolean language plpgsql immutable as $$
declare q jsonb;begin
 if jsonb_typeof(v)='number' then return (v#>>'{}')::numeric between 0 and 1000000000000000;
 elsif jsonb_typeof(v)='object' then for q in select value from jsonb_each(v) loop if not public.pp_nonnegative(q) then return false;end if;end loop;return true;
 else return false;end if;
end $$;
create or replace function public.pp_peer(s jsonb) returns jsonb language sql immutable as $$
 select coalesce(jsonb_object_agg(key,value),'{}') from jsonb_each(s) where key=any(array[
 'name','lvl','exp','pts','hp','sn','base','bonus','sub','res','alloc','gear','buffs','hall','home','course',
 'combatStyle','weapon','line','crest','club','kit','dex','av','avImg','color'])
$$;
create or replace function public.pp_snapshot(t public.pair_play_state, actor text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare p public.pairs%rowtype; a public.accounts%rowtype; b public.accounts%rowtype;begin
 select * into p from public.pairs where id=t.pair_id;
 select * into a from public.accounts where id=actor;
 select * into b from public.accounts where id=case when p.from_id=actor then p.to_id else p.from_id end;
 return jsonb_build_object('ok',true,'pairId',p.id,'revision',t.revision,'wallet',t.wallet,'progress',t.progress,
 'self',public.pp_apply(a.save,t.wallet,t.progress)||jsonb_build_object('pairShared',p.id,'pairPersonalRev',a.pair_play_rev),
 'pair',to_jsonb(p)-'rent_receipts','peer',public.pp_peer(public.pp_apply(b.save,t.wallet,t.progress)),'peerId',b.id,'peerSeen',b.seen_at,'meta',t.meta,'passNext',greatest(0,720-extract(epoch from(now()-t.pass_at))/60),'bossNext',greatest(0,300-extract(epoch from(now()-t.boss_at))/60));
end $$;
create or replace function public.pair_play(
 p_user text,p_token text,p_action text default 'get',p_revision bigint default 0,p_request text default '',
 p_save jsonb default null,p_wallet jsonb default null,p_progress jsonb default null,p_xp bigint default 0,
 p_meta jsonb default '{}',p_effects jsonb default '{}',p_loss jsonb default '{}'
) returns jsonb language plpgsql security definer set search_path=public as $$
declare a public.accounts%rowtype;b public.accounts%rowtype;p public.pairs%rowtype;t public.pair_play_state%rowtype;
 w jsonb;pr jsonb;x jsonb;y jsonb;k text;z jsonb;items jsonb;gid bigint=1;elapsed numeric;rate numeric;cap numeric;
 expn numeric;lv int;pts int;cost bigint;due numeric;cur numeric;peerid text;
begin
 select * into a from public.accounts where id=p_user and pw=p_token;
 if not found then raise exception 'PAIR_AUTH';end if;
 select * into p from public.pairs where status='accepted' and p_user in(from_id,to_id) order by id desc limit 1 for update;
 if not found then return jsonb_build_object('ok',true,'solo',true,'self',jsonb_set((a.save-'pairShared'-'pairPersonalRev'),'{pair}',coalesce(a.save->'pair','{}')||'{"mine":null}'::jsonb)||jsonb_build_object('pairSoloRev',a.pair_play_rev));end if;
 perform pg_advisory_xact_lock(p.id);
 select * into t from public.pair_play_state where pair_id=p.id for update;
 peerid:=case when p.from_id=p_user then p.to_id else p.from_id end;
 perform 1 from public.accounts where id in(p.from_id,p.to_id) order by id for update;
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
  update public.pair_play_state set wallet=t.wallet,progress=t.progress,pass_at=t.pass_at,boss_at=t.boss_at where pair_id=p.id;
  elapsed:=least(1440,greatest(0,extract(epoch from(now()-t.mana_at))/60));
  if elapsed>=0.25 then
   select coalesce(sum((value->>'rate')::numeric),0),coalesce(sum((value->>'cap')::numeric),0) into rate,cap from jsonb_each(t.meta);
   if cap>0 then t.wallet:=jsonb_set(t.wallet,'{mana}',to_jsonb(case when (t.wallet->>'mana')::numeric>=cap then (t.wallet->>'mana')::numeric else least(cap,(t.wallet->>'mana')::numeric+rate*elapsed) end));end if;
   update public.pair_play_state set wallet=t.wallet,progress=t.progress,mana_at=now(),revision=revision+1 where pair_id=p.id returning * into t;
  end if;
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
  update public.accounts set save=x where id=p_user;update public.accounts set save=y where id=peerid;
 end if;
 if jsonb_typeof(p_meta)='object' then
  for k,z in select key,value from jsonb_each(p_meta) loop
   if k not in(p.from_id,p.to_id) or not ((z->>'rate')::numeric between 0 and 100000000 and (z->>'cap')::numeric between 1 and 1000000000000) then raise exception 'PAIR_META';end if;
  end loop;t.meta:=t.meta||p_meta;end if;
 update public.pair_play_state set wallet=t.wallet,progress=t.progress,meta=t.meta,revision=revision+1 where pair_id=p.id returning * into t;
 select 80+coalesce(sum(coalesce((save#>>'{res,r11}')::int,0))*5,0) into cap from public.accounts where id in(p.from_id,p.to_id);
 update public.accounts set save=public.pp_apply(save,t.wallet,t.progress)||jsonb_build_object('pairShared',p.id,'pairBagCap',cap),pair_play_rev=pair_play_rev+1 where id in(p.from_id,p.to_id);
 update public.accounts set seen_at=now() where id=p_user;
 insert into public.pair_play_receipts(pair_id,request_id,actor) values(p.id,p_request,p_user);
 return public.pp_snapshot(t,p_user);
end $$;
-- Stale automatic account saves cannot overwrite partner-earned progress or the shared pool.
create or replace function public.mm_account_save(p_id text,p_token text,p_save jsonb,p_name text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare a public.accounts%rowtype;t public.pair_play_state%rowtype;p public.pairs%rowtype;v jsonb;begin
 select * into a from public.accounts where id=p_id and pw=p_token;
 if not found then raise exception '계정 인증이 필요합니다.';end if;
 select * into p from public.pairs where status='accepted' and p_id in(from_id,to_id) order by id desc limit 1 for update;
 if found then perform pg_advisory_xact_lock(p.id);select * into t from public.pair_play_state where pair_id=p.id;end if;
 select * into a from public.accounts where id=p_id for update;
 if t.pair_id is not null and not t.closed then
  if coalesce((p_save->>'pairPersonalRev')::bigint,-1)<>a.pair_play_rev then raise exception 'PAIR_STALE_SAVE';end if;
  v:=public.pp_apply(p_save,t.wallet,t.progress);
 else
  if a.pair_play_rev>0 and coalesce((p_save->>'pairSoloRev')::bigint,-1)<>a.pair_play_rev then raise exception 'PAIR_STALE_SAVE';end if;
  v:=p_save;end if;
 if coalesce((v->>'marketRev')::bigint,0)<>a.market_rev then raise exception 'MARKET_STALE_SAVE';end if;
 update public.accounts set save=v,name=left(coalesce(p_name,''),80),seen_at=now() where id=p_id;
 return jsonb_build_object('ok',true,'rev',a.market_rev);
end $$;
-- Market transactions operate on the same locked pool instead of two mirrored balances.
do $outer$ begin
 if to_regprocedure('public.market_trade(text,text,text,jsonb)') is not null and to_regprocedure('public.market_trade_solo(text,text,text,jsonb)') is null then
  alter function public.market_trade(text,text,text,jsonb) rename to market_trade_solo;
 end if;
 if to_regprocedure('public.market_trade_solo(text,text,text,jsonb)') is not null then
 execute replace(pg_get_functiondef('public.market_trade_solo(text,text,text,jsonb)'::regprocedure),
 'v_cap:=40+coalesce((v_save#>>''{res,r11}'')::int,0)*5;',
 'v_cap:=coalesce((v_save->>''pairBagCap'')::int,40+coalesce((v_save#>>''{res,r11}'')::int,0)*5);');
 execute replace(pg_get_functiondef('public.market_trade_solo(text,text,text,jsonb)'::regprocedure),
 'v_bag:=v_bag||jsonb_build_array(l.item_data);',
 'v_gid:=coalesce((v_save->>''gid'')::bigint,1);v_item:=jsonb_set(l.item_data,''{id}'',to_jsonb(v_gid));v_bag:=v_bag||jsonb_build_array(v_item);v_save:=jsonb_set(v_save,''{gid}'',to_jsonb(v_gid+1));');
 execute $ddl$
 create or replace function public.market_trade(p_actor text,p_token text,p_action text,p_data jsonb default '{}')
 returns jsonb language plpgsql security definer set search_path=public as $body$
 declare p public.pairs%rowtype;t public.pair_play_state%rowtype;r jsonb;s jsonb;v_seller text;
 begin
  if not exists(select 1 from public.accounts where id=p_actor and pw=p_token) then raise exception '계정 인증이 필요합니다.';end if;
  select * into p from public.pairs where status='accepted' and p_actor in(from_id,to_id) order by id desc limit 1 for update;
  if found then
   perform pg_advisory_xact_lock(p.id);select * into t from public.pair_play_state where pair_id=p.id for update;
  end if;
  if t.pair_id is null or t.closed then return public.market_trade_solo(p_actor,p_token,p_action,p_data);end if;
  perform 1 from public.accounts where id in(p.from_id,p.to_id) order by id for update;
  if p_action<>'snapshot' and length(coalesce(p_data->>'pp_request','')) between 8 and 160 and exists(select 1 from public.pair_play_receipts where pair_id=p.id and request_id=p_data->>'pp_request') then
   select save into s from public.accounts where id=p_actor;return jsonb_build_object('ok',true,'replayed',true,'save',public.pp_apply(s,t.wallet,t.progress));end if;
  if p_action='buy' then
   select seller_id into v_seller from public.market_listings where id=(p_data->>'id')::bigint;
   if v_seller in(p.from_id,p.to_id) then raise exception '같은 페어가 올린 매물은 공동 지갑으로 구매할 수 없습니다.';end if;
  end if;
  update public.accounts set save=public.pp_apply(save,t.wallet,t.progress) where id=p_actor;
  r:=public.market_trade_solo(p_actor,p_token,p_action,p_data);
  if p_action<>'snapshot' then
   select save into s from public.accounts where id=p_actor;t.wallet:=public.pp_wallet(s);
   update public.pair_play_state set wallet=t.wallet,revision=revision+1 where pair_id=p.id returning * into t;
   update public.accounts set save=public.pp_apply(save,t.wallet,t.progress),pair_play_rev=pair_play_rev+1 where id in(p.from_id,p.to_id);
   if length(coalesce(p_data->>'pp_request','')) between 8 and 160 then insert into public.pair_play_receipts(pair_id,request_id,actor) values(p.id,p_data->>'pp_request',p_actor);end if;
  end if;
  return r;
 end $body$;
 $ddl$;
 revoke all on function public.market_trade_solo(text,text,text,jsonb) from public,anon,authenticated;
 grant execute on function public.market_trade(text,text,text,jsonb) to anon,authenticated;
 end if;
end $outer$;
-- On breakup, divide the common pool once; never leave two complete copies of it.
create or replace function public.pp_half(v jsonb,which_half int) returns jsonb language plpgsql immutable as $$
declare k text;z jsonb;o jsonb='{}';n numeric;idx int=0;begin
 if jsonb_typeof(v)='object' then for k in select jsonb_object_keys(v) loop o:=o||jsonb_build_object(k,public.pp_half(v->k,which_half));end loop;return o;
 elsif jsonb_typeof(v)='array' then o:='[]';for z in select value from jsonb_array_elements(v) loop if idx%2=which_half then o:=o||jsonb_build_array(z);end if;idx:=idx+1;end loop;return o;
 else n:=coalesce((v#>>'{}')::numeric,0);return to_jsonb(case when which_half=0 then floor(n/2) else n-floor(n/2) end);end if;
end $$;
create or replace function public.pp_break() returns trigger language plpgsql security definer set search_path=public as $$
declare t public.pair_play_state%rowtype;w jsonb;x jsonb;k text;i int=0;pr jsonb;begin
 if old.status='accepted' and new.status<>'accepted' then
  perform pg_advisory_xact_lock(old.id);select * into t from public.pair_play_state where pair_id=old.id for update;
  if t.pair_id is not null and not t.closed then
   perform 1 from public.accounts where id in(old.from_id,old.to_id) order by id for update;
   pr:=jsonb_set(t.progress,'{run}','null');
   for k in select id from public.accounts where id in(old.from_id,old.to_id) order by id loop
    w:=public.pp_half(t.wallet,i);w:=jsonb_set(w,'{gid}',t.wallet->'gid');
    select save into x from public.accounts where id=k;x:=jsonb_set(x,'{pair}',coalesce(x->'pair','{}')||'{"mine":null}'::jsonb);x:=public.pp_apply(x,w,pr)-'pairShared'-'pairPersonalRev'-'pairBagCap'-'sharedHome';
    if x->'homeSolo' is not null and x->'homeSolo'<>'null' then x:=x||jsonb_build_object('hall',x#>>'{homeSolo,hall}');x:=jsonb_set(x,'{home}',coalesce(x->'home','{}')||jsonb_build_object('stage',x#>'{homeSolo,stage}'));x:=x-'homeSolo';end if;
    update public.accounts set save=x||jsonb_build_object('pairSoloRev',pair_play_rev+1),pair_play_rev=pair_play_rev+1 where id=k;i:=i+1;
   end loop;
   update public.pair_play_state set closed=true,revision=revision+1 where pair_id=old.id;
  end if;
 elsif old.status<>'accepted' and new.status='accepted' and exists(select 1 from public.pair_play_state where pair_id=new.id and closed) then
  raise exception '공동 지갑을 분리한 관계입니다. 새 페어 신청으로 다시 연결해 주세요.';
 end if;return new;
end $$;
drop trigger if exists pair_play_break on public.pairs;
create trigger pair_play_break before update of status on public.pairs for each row execute function public.pp_break();
revoke all on function public.pp_sum(jsonb,jsonb),public.pp_wallet(jsonb),public.pp_progress(jsonb),public.pp_apply(jsonb,jsonb,jsonb),public.pp_nonnegative(jsonb),public.pp_peer(jsonb),public.pp_snapshot(public.pair_play_state,text),public.pp_half(jsonb,int),public.pp_break() from public,anon,authenticated;
revoke all on function public.pair_play(text,text,text,bigint,text,jsonb,jsonb,jsonb,bigint,jsonb,jsonb,jsonb) from public;
grant execute on function public.pair_play(text,text,text,bigint,text,jsonb,jsonb,jsonb,bigint,jsonb,jsonb,jsonb) to anon,authenticated;
revoke all on function public.mm_account_save(text,text,jsonb,text) from public;
grant execute on function public.mm_account_save(text,text,jsonb,text) to anon,authenticated;
commit;
