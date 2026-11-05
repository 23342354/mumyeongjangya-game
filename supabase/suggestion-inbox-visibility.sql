-- 공개/비공개 선택 업데이트. 기존 문의는 비공개로 유지됩니다.
-- 내부 DM 문의함 설치. 기존 suggestions/시트 게시글은 삭제하지 않습니다.
begin;
create table if not exists public.suggestion_staff(account_id text primary key references public.accounts(id) on delete cascade);
create table if not exists public.suggestion_threads(
 id bigserial primary key,author_id text not null references public.accounts(id),title text not null,
 status text not null default '접수',created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.suggestion_dm(
 id bigserial primary key,thread_id bigint not null references public.suggestion_threads(id) on delete cascade,
 sender_id text references public.accounts(id),staff boolean not null default false,body text not null,
 request_id text not null,created_at timestamptz not null default now(),unique(sender_id,request_id)
);
alter table public.suggestion_threads add column if not exists secret boolean not null default true;
-- 작성 계정이 검증되어 연결된 기존 문의만 가져옵니다. 이름으로 소유자를 추측하지 않습니다.
alter table public.suggestion_threads add column if not exists legacy_id bigint unique;
do $$begin
 if exists(select 1 from information_schema.columns where table_schema='public' and table_name='suggestions' and column_name='author_account_id') then
  execute $m$insert into public.suggestion_threads(author_id,title,status,created_at,updated_at,legacy_id,secret)
   select s.author_account_id,s.title,coalesce(s.status,'접수'),s.created_at,s.created_at,s.id,coalesce(s.secret,true) from public.suggestions s
   where s.author_account_id is not null and exists(select 1 from public.accounts a where a.id=s.author_account_id)
   on conflict(legacy_id) do nothing$m$;
  execute $m$insert into public.suggestion_dm(thread_id,sender_id,staff,body,request_id,created_at)
   select t.id,t.author_id,false,s.body,'legacy-body-'||s.id,s.created_at from public.suggestions s join public.suggestion_threads t on t.legacy_id=s.id
   where not exists(select 1 from public.suggestion_dm d where d.thread_id=t.id and d.request_id='legacy-body-'||s.id)$m$;
  execute $m$insert into public.suggestion_dm(thread_id,sender_id,staff,body,request_id,created_at)
   select t.id,null,true,s.reply,'legacy-reply-'||s.id,s.created_at from public.suggestions s join public.suggestion_threads t on t.legacy_id=s.id
   where nullif(btrim(s.reply),'') is not null and not exists(select 1 from public.suggestion_dm d where d.thread_id=t.id and d.request_id='legacy-reply-'||s.id)$m$;
 end if;
end;$$;
create index if not exists suggestion_threads_author_idx on public.suggestion_threads(author_id,updated_at desc);
create index if not exists suggestion_dm_thread_idx on public.suggestion_dm(thread_id,id);
alter table public.suggestion_staff enable row level security;
alter table public.suggestion_threads enable row level security;
alter table public.suggestion_dm enable row level security;
revoke all on public.suggestion_staff,public.suggestion_threads,public.suggestion_dm from public,anon,authenticated;
create or replace function public.suggestion_inbox_v2(p_actor text,p_token text,p_action text default 'list',p_thread bigint default null,p_title text default '',p_body text default '',p_request text default '',p_status text default '',p_secret boolean default true)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_staff boolean;v_thread public.suggestion_threads%rowtype;v_id bigint;v_rows jsonb;v_messages jsonb;
begin
 if p_actor is null or p_token is null or not exists(select 1 from public.accounts where id=p_actor and pw=p_token) then raise exception '로그인한 계정을 확인해 주세요.';end if;
 v_staff:=exists(select 1 from public.suggestion_staff where account_id=p_actor);
 if p_action='list' then
  select coalesce(jsonb_agg(to_jsonb(t) order by t.updated_at desc),'[]') into v_rows from (
   select id,author_id,title,status,created_at,updated_at,secret from public.suggestion_threads where not secret or author_id=p_actor or v_staff order by updated_at desc limit 200
  )t;
  return jsonb_build_object('staff',v_staff,'threads',v_rows);
 end if;
 if p_action not in ('read','send','reply','status') then raise exception '허용되지 않은 문의 요청입니다.';end if;
 if p_action in ('send','reply') then
  if p_request is null or p_request !~ '^[A-Za-z0-9_-]{8,160}$' then raise exception '전송 요청 정보가 올바르지 않습니다.';end if;
  if nullif(btrim(p_body),'') is null or length(p_body)>5000 then raise exception '내용을 1~5000자로 적어 주세요.';end if;
  perform pg_advisory_xact_lock(hashtextextended('inbox:'||p_actor,0));
  select thread_id into v_id from public.suggestion_dm where sender_id=p_actor and request_id=p_request;
  if v_id is not null then return jsonb_build_object('id',v_id,'replayed',true);end if;
 end if;
 if p_action='send' then
  if nullif(btrim(p_title),'') is null or length(p_title)>100 then raise exception '제목을 1~100자로 적어 주세요.';end if;
  insert into public.suggestion_threads(author_id,title,secret) values(p_actor,btrim(p_title),coalesce(p_secret,true)) returning id into v_id;
  insert into public.suggestion_dm(thread_id,sender_id,staff,body,request_id) values(v_id,p_actor,false,btrim(p_body),p_request);
  return jsonb_build_object('id',v_id);
 end if;
 select * into v_thread from public.suggestion_threads where id=p_thread for update;
 if not found or (v_thread.secret and v_thread.author_id<>p_actor and not v_staff) then raise exception '작성자와 운영진만 볼 수 있는 문의입니다.';end if;
 if p_action='reply' then
  if v_thread.author_id<>p_actor and not v_staff then raise exception '작성자와 운영진만 답변할 수 있습니다.';end if;
  insert into public.suggestion_dm(thread_id,sender_id,staff,body,request_id) values(p_thread,p_actor,v_staff,btrim(p_body),p_request);
  update public.suggestion_threads set updated_at=now(),status=case when v_staff then '답변' else '접수' end where id=p_thread;
  return jsonb_build_object('id',p_thread);
 elsif p_action='status' then
  if not v_staff then raise exception '운영진만 상태를 변경할 수 있습니다.';end if;
  if p_status not in ('접수','확인 중','답변','완료') then raise exception '올바른 상태를 선택해 주세요.';end if;
  update public.suggestion_threads set status=p_status,updated_at=now() where id=p_thread;
 end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'sender_id',sender_id,'staff',staff,'body',body,'created_at',created_at) order by id),'[]') into v_messages from public.suggestion_dm where thread_id=p_thread;
 return jsonb_build_object('staff',v_staff,'thread',(select to_jsonb(t) from public.suggestion_threads t where id=p_thread),'messages',v_messages);
end;$$;
revoke all on function public.suggestion_inbox_v2(text,text,text,bigint,text,text,text,text,boolean) from public;
grant execute on function public.suggestion_inbox_v2(text,text,text,bigint,text,text,text,text,boolean) to anon,authenticated;
notify pgrst,'reload schema';
commit;
-- 운영진 지정: 아래 문자열을 실제 로그인 ID(@ 제외)로 바꾸고 별도로 실행합니다.
-- insert into public.suggestion_staff(account_id) values('운영진ID') on conflict do nothing;
-- 운영진 해제: delete from public.suggestion_staff where account_id='운영진ID';
