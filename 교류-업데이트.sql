begin;
alter table public.pairs add column if not exists pair_name text not null default '';
create table if not exists public.social_links(id bigint generated always as identity primary key, from_id text not null references public.students(id), to_id text not null references public.students(id), kind text not null check(kind in ('friend','relation')), status text not null default 'pending' check(status in ('pending','accepted','declined','broken')), role_from text not null default '친구', role_to text not null default '친구', created_at timestamptz not null default now(), check(from_id<>to_id));
create unique index if not exists social_active_unique on public.social_links(least(from_id,to_id),greatest(from_id,to_id),kind) where status in ('pending','accepted');
create table if not exists public.rp_posts(id bigint generated always as identity primary key, author_id text not null references public.students(id), body text not null check(length(body) between 1 and 500), parent_id bigint references public.rp_posts(id) on delete cascade, created_at timestamptz not null default now());
alter table public.social_links enable row level security;
alter table public.rp_posts enable row level security;
drop policy if exists social_read on public.social_links;
create policy social_read on public.social_links for select using(true);
drop policy if exists rp_read on public.rp_posts;
create policy rp_read on public.rp_posts for select using(true);
grant select on public.social_links,public.rp_posts to anon,authenticated;
create or replace function public.social_action(actor text, token text, action text, data jsonb default '{}') returns jsonb language plpgsql security definer set search_path=public as $$
declare l social_links%rowtype; p pairs%rowtype; result_id bigint; target text; begin
 if not exists(select 1 from accounts where id=actor and pw=token) then raise exception '로그인이 필요합니다'; end if;
 if action='request' then
 target:=data->>'target';
 insert into social_links(from_id,to_id,kind,role_from,role_to) values(actor,target,data->>'kind',left(coalesce(data->>'a','친구'),20),left(coalesce(data->>'b','친구'),20)) returning id into result_id;
 elsif action='respond' then
 select * into l from social_links where id=(data->>'id')::bigint for update;
 if not found or l.to_id<>actor or l.status<>'pending' then raise exception '받은 신청만 처리할 수 있습니다'; end if;
 update social_links set status=case when data->>'accept'='true' then 'accepted' else 'declined' end where id=l.id;
 elsif action='remove' then
 update social_links set status='broken' where id=(data->>'id')::bigint and actor in(from_id,to_id);
 elsif action='post' then
 if data->>'parent' is not null and not exists(select 1 from rp_posts where id=(data->>'parent')::bigint and parent_id is null) then raise exception '원글이 없습니다'; end if;
 insert into rp_posts(author_id,body,parent_id) values(actor,trim(data->>'body'),(data->>'parent')::bigint) returning id into result_id;
 elsif action='delete_post' then
 delete from rp_posts where id=(data->>'id')::bigint and author_id=actor;
 elsif action='pair_name' then
 update pairs set pair_name=left(trim(data->>'name'),30),updated_at=now() where id=(data->>'id')::bigint and actor in(from_id,to_id) and status='accepted';
 else raise exception '지원하지 않는 요청'; end if;
 return jsonb_build_object('ok',true,'id',result_id);
end $$;
revoke all on function public.social_action(text,text,text,jsonb) from public;
grant execute on function public.social_action(text,text,text,jsonb) to anon,authenticated;
create or replace function public.pair_exclusive_guard() returns trigger language plpgsql set search_path=public as $$
begin
 if new.status in ('pending','accepted') and (TG_OP='INSERT' or old.status is distinct from new.status) then
 perform pg_advisory_xact_lock(726341);
 if exists(select 1 from pairs where id<>new.id and status='accepted' and (from_id in(new.from_id,new.to_id) or to_id in(new.from_id,new.to_id))) then raise exception '이미 페어가 있는 학생입니다'; end if;
 end if;
 return new;
end $$;
drop trigger if exists pair_exclusive_guard on public.pairs;
create trigger pair_exclusive_guard before insert or update on public.pairs for each row execute function public.pair_exclusive_guard();
commit;
