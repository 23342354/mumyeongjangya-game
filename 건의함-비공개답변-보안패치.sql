-- 無明長夜 · 비공개 건의함 운영진 답변 노출 방지 (2026-11-03)
-- 기존 건의글·답변·열람 코드는 지우지 않습니다. Supabase SQL Editor에서 1회 실행하세요.
-- 기존 `건의함-작성자열람-업데이트.sql`을 설치한 서버에 적용하는 소규모 패치입니다.
begin;

alter table public.suggestions
  add column if not exists author_receipt_hash text;

-- 비공개 글 원본을 누구나 직접 조회하지 못하게 합니다.
revoke select, update on public.suggestions from public, anon, authenticated;
alter table public.suggestions enable row level security;

-- 비공개 본문 + 운영진 답변 모두 공개 목록에서 삭제.
-- 기존 컬럼 순서 보존, has_reply만 마지막에 추가.
create or replace view public.suggestions_public as
  select id, name, cat, title,
         case when secret then '(비공개 글입니다. 작성자와 운영진만 볼 수 있습니다.)' else body end as body,
         secret, likes, status,
         case when secret then '' else coalesce(reply,'') end as reply,
         created_at,
         (nullif(btrim(coalesce(reply,'')), '') is not null) as has_reply
  from public.suggestions;

grant select on public.suggestions_public to anon, authenticated;

-- 64자리 열람 코드가 일치할 때에만 본문과 운영진 답변을 반환.
create or replace function public.read_my_private_suggestion_full(p_id bigint, p_receipt text)
returns table(body text, reply text)
language sql
security definer
set search_path = pg_catalog, public
as $$
  select s.body, coalesce(s.reply,'')
  from public.suggestions s
  where s.id = p_id
    and s.secret is true
    and p_receipt ~ '^[a-f0-9]{64}$'
    and s.author_receipt_hash = md5(p_receipt)
  limit 1;
$$;
revoke all on function public.read_my_private_suggestion_full(bigint,text) from public;
grant execute on function public.read_my_private_suggestion_full(bigint,text) to anon, authenticated;

-- PostgREST가 새 함수와 뷰 필드를 인지하도록 캐시 갱신을 요청합니다.
notify pgrst, 'reload schema';
commit;
