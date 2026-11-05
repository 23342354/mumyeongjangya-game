-- 기존 건의함에 추가 실행. 게시글과 답변을 보존합니다.
begin;
alter table public.suggestions add column if not exists author_account_id text;
alter table public.suggestions add column if not exists author_receipt_hash text;
revoke select,update on public.suggestions from public,anon,authenticated;
alter table public.suggestions enable row level security;
create or replace function public.suggestion_account_identity(p_actor text,p_token text)
returns text language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 if p_actor is null or p_token is null or not exists(select 1 from public.accounts where id=p_actor and pw=p_token) then
  raise exception '로그인한 계정을 확인해 주세요.';
 end if;
 return p_actor;
end;$$;
create or replace function public.submit_account_suggestion(p_actor text,p_token text,p_name text,p_cat text,p_title text,p_body text,p_secret boolean)
returns bigint language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_actor text;v_id bigint;
begin
 v_actor:=public.suggestion_account_identity(p_actor,p_token);
 if nullif(btrim(p_title),'') is null or nullif(btrim(p_body),'') is null then raise exception '제목과 내용을 적어 주세요.';end if;
 insert into public.suggestions(name,cat,title,body,secret,likes,status,reply,author_account_id)
 values(left(coalesce(nullif(btrim(p_name),''),'이름 없는 차사'),20),left(coalesce(p_cat,'기타'),20),left(btrim(p_title),60),left(btrim(p_body),1500),coalesce(p_secret,false),0,'접수','',v_actor) returning id into v_id;
 return v_id;
end;$$;
create or replace function public.read_account_suggestion(p_actor text,p_token text,p_id bigint,p_legacy_receipt text default '')
returns table(body text,reply text) language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_actor text;
begin
 v_actor:=public.suggestion_account_identity(p_actor,p_token);
 -- 기존 기기에 남은 유효한 증명으로만 과거 글을 계정에 연결합니다. 이름 일치로 연결하지 않습니다.
 update public.suggestions s set author_account_id=v_actor
 where s.id=p_id and s.author_account_id is null and p_legacy_receipt ~ '^[a-f0-9]{64}$' and s.author_receipt_hash=md5(p_legacy_receipt);
 return query select s.body,coalesce(s.reply,'') from public.suggestions s where s.id=p_id and s.author_account_id=v_actor;
end;$$;
revoke all on function public.suggestion_account_identity(text,text) from public;
revoke all on function public.submit_account_suggestion(text,text,text,text,text,text,boolean) from public;
revoke all on function public.read_account_suggestion(text,text,bigint,text) from public;
grant execute on function public.suggestion_account_identity(text,text) to anon,authenticated;
grant execute on function public.submit_account_suggestion(text,text,text,text,text,text,boolean) to anon,authenticated;
grant execute on function public.read_account_suggestion(text,text,bigint,text) to anon,authenticated;
notify pgrst,'reload schema';
commit;
