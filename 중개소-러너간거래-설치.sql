-- 無明長夜 · 제5구역 중개소: 러너 간 아이템 거래
-- 기존 법구/재료/계정은 보존합니다. Supabase SQL Editor에서 1회 실행하세요.
begin;

alter table public.accounts add column if not exists market_rev bigint not null default 0;

-- 기존 공개 accounts 테이블에서 타인의 비밀번호 해시/저장본을 읽을 수 있었던 권한을 닫습니다.
-- 로그인·회원가입·저장은 보안 함수를 통해서만 가능합니다.
create or replace function public.mm_account_register(p_id text,p_token text)
returns jsonb language plpgsql security definer set search_path=public as $$
begin
 if p_id !~ '^[a-z0-9_]{4,20}$' or p_token !~ '^[a-f0-9]{64}$' then
   raise exception '아이디 또는 비밀번호 형식이 올바르지 않습니다.';
 end if;
 insert into public.accounts(id,pw,name,save) values(p_id,p_token,'',null);
 return jsonb_build_object('ok',true);
exception when unique_violation then
 raise exception '이미 쓰는 아이디입니다.';
end $$;

create or replace function public.mm_account_login(p_id text,p_token text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare a public.accounts%rowtype;
begin
 select * into a from public.accounts where id=p_id and pw=p_token;
 if not found then raise exception '아이디 또는 비밀번호가 올바르지 않습니다.'; end if;
 return jsonb_build_object('id',a.id,'name',a.name,'save',a.save,'marketRev',a.market_rev);
end $$;

create or replace function public.mm_account_save(p_id text,p_token text,p_save jsonb,p_name text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare a public.accounts%rowtype; v_rev bigint;
begin
 select * into a from public.accounts where id=p_id and pw=p_token for update;
 if not found then raise exception '계정 인증이 필요합니다.'; end if;
 begin v_rev:=coalesce((p_save->>'marketRev')::bigint,0);
 exception when others then v_rev:=0; end;
 if v_rev<>a.market_rev then
   raise exception 'MARKET_STALE_SAVE: 중개소 거래 후 달라진 기록입니다. 중개소에서 동기화하세요.';
 end if;
 if p_save is null or jsonb_typeof(p_save)<>'object' then raise exception '저장 내용이 올바르지 않습니다.'; end if;
 update public.accounts set save=p_save,name=left(coalesce(p_name,''),80),seen_at=now() where id=p_id;
 return jsonb_build_object('ok',true,'rev',a.market_rev);
end $$;
revoke all on function public.mm_account_register(text,text) from public;
revoke all on function public.mm_account_login(text,text) from public;
revoke all on function public.mm_account_save(text,text,jsonb,text) from public;
grant execute on function public.mm_account_register(text,text),
 public.mm_account_login(text,text),
 public.mm_account_save(text,text,jsonb,text) to anon,authenticated;
-- 권한 제거는 반드시 대체 로그인 함수를 만든 다음에 합니다.
alter table public.accounts enable row level security;
drop policy if exists p_accounts_all on public.accounts;
revoke select,insert,update,delete on public.accounts from public,anon,authenticated;


create table if not exists public.market_listings (
  id bigint generated always as identity primary key,
  seller_id text not null references public.accounts(id),
  seller_name text not null default '',
  kind text not null check (kind in ('gear','potion','dish','consumable','material','ingredient')),
  item_key text not null,
  item_name text not null,
  item_data jsonb not null default '{}'::jsonb,
  quantity integer not null check (quantity between 1 and 999),
  price bigint not null check (price between 1 and 1000000000),
  fee bigint not null default 0,
  discount numeric(5,4) not null default 0,
  status text not null default 'active' check (status in ('active','sold','cancelled')),
  buyer_id text references public.accounts(id),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
alter table public.market_listings add column if not exists discount numeric(5,4) not null default 0;
create index if not exists market_active_idx on public.market_listings (status,created_at desc);
create index if not exists market_seller_idx on public.market_listings (seller_id,created_at desc);
create table if not exists public.market_balances (
  account_id text primary key references public.accounts(id),
  pending_rin bigint not null default 0 check (pending_rin >= 0)
);
alter table public.market_listings enable row level security;
alter table public.market_balances enable row level security;
revoke all on public.market_listings from public, anon, authenticated;
revoke all on public.market_balances from public, anon, authenticated;
-- 모든 작업은 account ID + 계정 검증 토큰을 확인하는 RPC 안에서 처리합니다.

-- 예전 기기에서 구버전 저장본을 밀어 넣어 거래 결과를 되돌리지 못하게 합니다.
create or replace function public.market_save_guard() returns trigger
language plpgsql set search_path = public as $$
declare v_rev bigint;
begin
 if new.save is distinct from old.save and old.market_rev > 0 then
   begin v_rev := coalesce((new.save->>'marketRev')::bigint, 0);
   exception when others then v_rev := 0; end;
   if v_rev < old.market_rev then
      raise exception 'MARKET_STALE_SAVE: 거래 후 변경된 저장본입니다. 중개소에서 동기화하세요.';
   end if;
 end if;
 return new;
end $$;
drop trigger if exists market_save_guard on public.accounts;
create trigger market_save_guard before update of save on public.accounts
for each row execute function public.market_save_guard();

create or replace function public.market_trade(
  p_actor text, p_token text, p_action text, p_data jsonb default '{}'::jsonb
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare
 a public.accounts%rowtype;
 l public.market_listings%rowtype;
 v_save jsonb; v_item jsonb; v_path text[]; v_kind text; v_key text;
 v_name text; v_qty integer; v_have integer; v_price bigint; v_id bigint;
 v_rin bigint; v_fee bigint; v_wallet bigint; v_rev bigint; v_discount numeric(5,4):=0;
 v_bag jsonb; v_gid bigint; v_cap integer;
 v_list jsonb; v_mine jsonb;
begin
 if p_actor is null or p_token is null then raise exception '로그인이 필요합니다.'; end if;
 -- RLS 직접 변경 정책은 없어도 아래 잠금과 검증을 거친 동작만 허용합니다.
 if p_action='snapshot' then
   select * into a from public.accounts where id=p_actor and pw=p_token;
   if not found then raise exception '계정 인증이 필요합니다.'; end if;
   select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) into v_list
     from (select id,seller_id,seller_name,kind,item_key,item_name,item_data,quantity,price,status,created_at
           from public.market_listings where status='active' order by created_at desc limit 100) x;
   select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) into v_mine
     from (select id,seller_id,seller_name,kind,item_key,item_name,item_data,quantity,price,fee,status,buyer_id,created_at,completed_at
           from public.market_listings where seller_id=p_actor order by created_at desc limit 40) x;
   select coalesce(pending_rin,0) into v_wallet from public.market_balances where account_id=p_actor;
   return jsonb_build_object('ok',true,'listings',v_list,'mine',v_mine,
      'pending',coalesce(v_wallet,0),'rev',a.market_rev,
      'inventory',jsonb_build_object('rin',a.save->'rin','bag',a.save->'bag',
        'potion',a.save->'potion','kit',a.save->'kit','inv',a.save->'inv',
        'mat',a.save->'mat','ing',a.save->'ing','gid',a.save->'gid',
        'marketRev',coalesce(a.save->'marketRev','0'::jsonb)));
 end if;
 select * into a from public.accounts where id=p_actor and pw=p_token for update;
 if not found then raise exception '계정 인증이 필요합니다.'; end if;
 if a.save is null or coalesce((a.save->>'made')::boolean,false)=false then
   raise exception '캐릭터를 만든 뒤 중개소를 이용할 수 있습니다.';
 end if;
 v_save:=a.save;
 v_rin:=coalesce((v_save->>'rin')::bigint,0);
 if p_action='list' then
   v_kind:=p_data->>'kind'; v_key:=p_data->>'key';
   v_name:=left(trim(coalesce(p_data->>'name','')),80);
   v_qty:=coalesce((p_data->>'quantity')::integer,1);
   v_price:=(p_data->>'price')::bigint;
   if v_name='' or v_qty not between 1 and 999 or v_price not between 1 and 1000000000 then
      raise exception '판매 수량 또는 가격을 확인해 주세요.';
   end if;
   if (select count(*) from public.market_listings where seller_id=p_actor and status='active')>=12 then
      raise exception '등록 가능한 매물은 최대 12개입니다.';
   end if;
   if v_kind='gear' then
      if v_qty<>1 or v_key !~ '^[0-9]{1,12}$' then raise exception '법구는 한 개씩 내놓아야 합니다.'; end if;
      select b.obj into v_item from jsonb_array_elements(coalesce(v_save->'bag','[]'::jsonb)) as b(obj)
        where b.obj->>'id'=v_key limit 1;
      if v_item is null then raise exception '바랑에서 해당 법구를 찾을 수 없습니다.'; end if;
      if coalesce((v_item->>'bound')::boolean,false) or v_item->>'slot' not in ('robe','cap','charm','sutra') then
         raise exception '귀속 법구 또는 잘못된 슬롯은 거래할 수 없습니다.';
      end if;
      v_name:=left(coalesce(v_item->>'name','법구'),80);
      select coalesce(jsonb_agg(value order by ord), '[]'::jsonb) into v_bag
        from jsonb_array_elements(coalesce(v_save->'bag','[]'::jsonb)) with ordinality as b(value,ord)
        where value->>'id'<>v_key;
      v_save:=jsonb_set(v_save,'{bag}',v_bag,true);
   else
      if v_kind='potion' and v_key ~ '^q[1-9][0-9]?$' then v_path:=array['potion',v_key];
      elsif v_kind='dish' and v_key ~ '^d([1-9]|1[0-5])$' then v_path:=array['kit','have',v_key];
      elsif v_kind='consumable' and v_key ~ '^[a-z][a-z0-9_]{0,20}$' then v_path:=array['inv',v_key];
      elsif v_kind='material' and v_key=any(array['가루','약초','어물','열매','뿌리','꽃','혼백']) then v_path:=array['mat',v_key];
      elsif v_kind='ingredient' and v_key=any(array['먼지','홍월초','톱니','집광편','잿불씨','인광','먹잉크','종모래','심연정']) then v_path:=array['ing',v_key];
      else raise exception '거래할 수 없는 품목입니다.'; end if;
      v_have:=coalesce((v_save#>>v_path)::integer,0);
      if v_have<v_qty then raise exception '보유한 수량이 부족합니다.'; end if;
      v_item:=jsonb_build_object('kind',v_kind,'key',v_key);
      v_save:=jsonb_set(v_save,v_path,to_jsonb(v_have-v_qty),true);
   end if;
   -- 제1구역의 거처 혜택을 기존 규칙대로 수수료에 반영합니다.
   if v_save->>'hall'='w1' and
      coalesce((v_save#>>'{home,due}')::numeric,0)>coalesce((v_save->>'t')::numeric,0) then
      v_discount:=round(0.02*(case coalesce((v_save#>>'{home,stage}')::int,0)
        when 1 then 0.25 when 2 then 0.50 when 3 then 0.75 when 4 then 1.0
        when 5 then 1.2 else 0 end),4);
   end if;
   insert into public.market_listings(seller_id,seller_name,kind,item_key,item_name,item_data,quantity,price,discount)
      values(p_actor,left(coalesce(v_save->>'name',a.name,p_actor),70),v_kind,v_key,v_name,v_item,v_qty,v_price,v_discount)
      returning id into v_id;
 elsif p_action='cancel' or p_action='buy' then
   v_id:=(p_data->>'id')::bigint;
   select * into l from public.market_listings where id=v_id for update;
   if not found or l.status<>'active' then raise exception '이미 거래 또는 취소된 매물입니다.'; end if;
   if p_action='cancel' then
     if l.seller_id<>p_actor then raise exception '자신의 매물만 취소할 수 있습니다.'; end if;
     if l.kind='gear' then
       v_bag:=coalesce(v_save->'bag','[]'::jsonb);
       v_cap:=40+coalesce((v_save#>>'{res,r11}')::int,0)*5;
       if jsonb_array_length(v_bag)>=v_cap then raise exception '바랑이 가득 찼습니다. 빈칸을 만든 뒤 취소해 주세요.'; end if;
       v_bag:=v_bag||jsonb_build_array(l.item_data);
       v_save:=jsonb_set(v_save,'{bag}',v_bag,true);
     else
       if l.kind='potion' then v_path:=array['potion',l.item_key];
       elsif l.kind='dish' then v_path:=array['kit','have',l.item_key];
       elsif l.kind='consumable' then v_path:=array['inv',l.item_key];
       elsif l.kind='material' then v_path:=array['mat',l.item_key];
       else v_path:=array['ing',l.item_key]; end if;
       v_have:=coalesce((v_save#>>v_path)::integer,0);
       v_save:=jsonb_set(v_save,v_path,to_jsonb(v_have+l.quantity),true);
     end if;
     update public.market_listings set status='cancelled',completed_at=now() where id=v_id;
   else
     if l.seller_id=p_actor then raise exception '자기 매물은 구매할 수 없습니다.'; end if;
     if v_rin<l.price then raise exception '구매할 륜이 부족합니다.'; end if;
     if l.kind='gear' then
       v_bag:=coalesce(v_save->'bag','[]'::jsonb);
       v_cap:=40+coalesce((v_save#>>'{res,r11}')::int,0)*5;
       if jsonb_array_length(v_bag)>=v_cap then raise exception '바랑이 가득 찼습니다.'; end if;
       v_gid:=greatest(coalesce((v_save->>'gid')::bigint,1),
         coalesce((select max((g.obj->>'id')::bigint)+1 from jsonb_array_elements(v_bag) as g(obj)),1));
       v_item:=jsonb_set(jsonb_set(l.item_data,'{id}',to_jsonb(v_gid),true),'{isNew}','true'::jsonb,true);
       v_save:=jsonb_set(v_save,'{bag}',v_bag||jsonb_build_array(v_item),true);
       v_save:=jsonb_set(v_save,'{gid}',to_jsonb(v_gid+1),true);
     else
       if l.kind='potion' then v_path:=array['potion',l.item_key];
       elsif l.kind='dish' then v_path:=array['kit','have',l.item_key];
       elsif l.kind='consumable' then v_path:=array['inv',l.item_key];
       elsif l.kind='material' then v_path:=array['mat',l.item_key];
       else v_path:=array['ing',l.item_key]; end if;
       v_have:=coalesce((v_save#>>v_path)::integer,0);
       v_save:=jsonb_set(v_save,v_path,to_jsonb(v_have+l.quantity),true);
     end if;
     v_save:=jsonb_set(v_save,'{rin}',to_jsonb(v_rin-l.price),true);
     v_fee:=greatest(1,round(l.price * greatest(0.01,(case when l.price<=100000 then 0.05 when l.price<=1000000 then 0.07 else 0.10 end)-l.discount))::bigint);
     -- 판매자의 1구역 거처 수수료 우대(최대 2.4%p)는 판매 등록 당시 저장된 혜택에 따라 적용됩니다.
     -- 정산 대기는 별도 계정에 적립되므로 판매자 오프라인/자동저장에도 사라지지 않습니다.
     insert into public.market_balances(account_id,pending_rin) values(l.seller_id,l.price-v_fee)
       on conflict(account_id) do update set pending_rin=public.market_balances.pending_rin+excluded.pending_rin;
     update public.market_listings set status='sold',buyer_id=p_actor,fee=v_fee,completed_at=now() where id=v_id;
   end if;
 elsif p_action='withdraw' then
   select pending_rin into v_wallet from public.market_balances where account_id=p_actor for update;
   v_wallet:=coalesce(v_wallet,0);
   if v_wallet<=0 then raise exception '정산할 판매 대금이 없습니다.'; end if;
   v_save:=jsonb_set(v_save,'{rin}',to_jsonb(v_rin+v_wallet),true);
   update public.market_balances set pending_rin=0 where account_id=p_actor;
 else
   raise exception '지원하지 않는 거래 요청입니다.';
 end if;
 v_rev:=a.market_rev+1;
 v_save:=jsonb_set(v_save,'{marketRev}',to_jsonb(v_rev),true);
 update public.accounts set save=v_save,market_rev=v_rev where id=p_actor;
 return jsonb_build_object('ok',true,'id',v_id,'rev',v_rev,'save',
   jsonb_build_object('rin',v_save->'rin','bag',v_save->'bag',
     'potion',v_save->'potion','kit',v_save->'kit','inv',v_save->'inv',
     'mat',v_save->'mat','ing',v_save->'ing','gid',v_save->'gid',
     'marketRev',to_jsonb(v_rev)));
end $$;
revoke all on function public.market_trade(text,text,text,jsonb) from public;
grant execute on function public.market_trade(text,text,text,jsonb) to anon,authenticated;
commit;
