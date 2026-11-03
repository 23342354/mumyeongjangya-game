-- ════════════════════════════════════════════════════════════
--  無明長夜 · 사무전 — 페어 헤더 + 페어 전용 게시판
--
--  Supabase 왼쪽 메뉴 → SQL Editor → New query 에 이 파일을 통째로
--  붙여 넣고 Run 을 한 번 누르면 됩니다.
--  · 여러 번 실행해도 기존 기록을 지우지 않습니다.
--  · 「Supabase-표만들기.sql」과 「교류-업데이트.sql」을 먼저 실행한
--    환경을 기준으로 합니다.
-- ════════════════════════════════════════════════════════════
begin;

-- ── 1. 페어 헤더 ────────────────────────────────────────────
-- header    : 헤더 그림 자체(작게 줄인 뒤 글자로 바꾼 것)
-- header_at : 마지막으로 바꾼 시각. 그림이 바뀌었을 때만 내려받으려고 둡니다.
alter table public.pairs add column if not exists header    text;
alter table public.pairs add column if not exists header_at timestamptz;

-- ── 2. 페어 전용 게시판 ─────────────────────────────────────
create table if not exists public.pair_posts (
  id          bigint generated always as identity primary key,
  pair_id     bigint not null references public.pairs(id) on delete cascade,
  author_id   text   not null,
  author_name text   not null default '',
  body        text   not null check (length(body) between 1 and 1000),
  parent_id   bigint references public.pair_posts(id) on delete cascade,
  created_at  timestamptz not null default now()
);
create index if not exists pair_posts_pair_idx on public.pair_posts (pair_id, id desc);

alter table public.pair_posts enable row level security;
drop policy if exists p_pair_posts_all on public.pair_posts;
create policy p_pair_posts_all on public.pair_posts for all using (true) with check (true);
grant select, insert, update, delete on public.pair_posts to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

-- ── 3. RP 게시판 — 댓글에 다시 답글 달기 ──────────────────
-- 지금까지는 원글에만 답글을 달 수 있었습니다. 이제 댓글에도 답글을 달아
-- 그 댓글 바로 아래로 이어 붙일 수 있게 합니다.
-- (아래는 「교류-업데이트.sql」의 함수를 그대로 다시 만들면서 그 한 줄만 고친 것입니다.)
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
 if data->>'parent' is not null and not exists(select 1 from rp_posts where id=(data->>'parent')::bigint) then raise exception '원글이 없습니다'; end if;
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

commit;

-- ── 알아 두실 점 ────────────────────────────────────────────
-- 이 게임은 공개된 anon 키 하나로 돌아갑니다. 화면에서는 페어 두 사람에게만
-- 보이지만, 키를 알아낸 사람은 표를 직접 들여다볼 수 있습니다.
-- 채팅·페어 채팅과 똑같은 수준입니다. 정말로 남이 보면 안 되는 이야기는
-- 여기에 적지 않도록 러너들에게 안내해 주세요.
