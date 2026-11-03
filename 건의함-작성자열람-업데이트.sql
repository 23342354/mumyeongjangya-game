-- 無明長夜 · 사무전 — 비공개 건의글 작성자 열람 (2026-11-03)
-- 운영 중인 Supabase SQL Editor에서 1회 실행하세요. 반복 실행해도 게시글은 삭제되지 않습니다.
-- 비공개 본문은 공개 뷰에 노출하지 않고, 글마다 발급한 256비트 열람 코드로만 조회합니다.

alter table public.suggestions
  add column if not exists author_receipt_hash text;

-- 과거 버전에서는 모든 필드를 익명 수정할 수 있었습니다.
-- 공개 본문 노출과 열람 코드 변조를 막기 위해 원본 테이블 직접 조회/수정 권한을 제한합니다.
revoke select, update on public.suggestions from public, anon, authenticated;
alter table public.suggestions enable row level security;

-- 원문을 숨기는 기존 뷰는 계속 사용합니다. 열람 코드의 해시는 공개 뷰에 넣지 않습니다.
create or replace view public.suggestions_public as
  select id, name, cat, title,
         case when secret then '(비공개 글입니다. 작성자와 운영진만 볼 수 있습니다.)' else body end as body,
         secret, likes, status, reply, created_at
  from public.suggestions;

-- 글을 새로 등록하고 등록된 글 번호를 반환합니다.
-- 개인 열람 코드는 서버에 원문 대신 MD5 해시로 저장합니다.
-- 입력 코드는 충분히 긴 난수(32바이트)이므로 대입 추측이 현실적으로 어렵습니다.
create or replace function public.submit_private_readable_suggestion(
  p_name text,
  p_cat text,
  p_title text,
  p_body text,
  p_secret boolean,
  p_receipt text
)
returns bigint
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare v_id bigint;
begin
  if nullif(btrim(coalesce(p_title,'')), '') is null
     or nullif(btrim(coalesce(p_body,'')), '') is null then
    raise exception '제목과 내용을 적어 주세요.';
  end if;
  if coalesce(p_secret,false) and (p_receipt is null or p_receipt !~ '^[a-f0-9]{64}$') then
    raise exception '올바른 개인 열람 코드가 필요합니다.';
  end if;

  insert into public.suggestions(name,cat,title,body,secret,likes,status,reply,author_receipt_hash)
  values (
    left(coalesce(nullif(btrim(p_name),''),'이름 없는 차사'),20),
    left(coalesce(p_cat,'기타'),20),
    left(btrim(p_title),60),
    left(btrim(p_body),1500),
    coalesce(p_secret,false),
    0,'접수','',
    case when coalesce(p_secret,false) then md5(p_receipt) else null end
  ) returning id into v_id;

  return v_id;
end;
$$;

-- 맞는 코드를 아는 사람에게만 본문 하나를 반환합니다.
-- 작성자 이름이나 화면에 표시된 닉네임만으로는 비공개 본문을 열 수 없습니다.
create or replace function public.read_my_private_suggestion(p_id bigint, p_receipt text)
returns table(body text)
language sql
security definer
set search_path = pg_catalog, public
as $$
  select s.body
  from public.suggestions s
  where s.id=p_id
    and s.secret is true
    and p_receipt ~ '^[a-f0-9]{64}$'
    and s.author_receipt_hash = md5(p_receipt)
  limit 1;
$$;

-- 공감 수는 원본 행의 UPDATE 권한 대신 이 함수로 변경합니다.
-- 다른 열(비공개 본문·열람 코드·관리자 답변)은 수정할 수 없습니다.
create or replace function public.bump_suggestion_like(p_id bigint)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare v_count integer;
begin
  update public.suggestions
     set likes = coalesce(likes,0) + 1
   where id = p_id
  returning likes into v_count;
  return coalesce(v_count,0);
end;
$$;

revoke all on function public.submit_private_readable_suggestion(text,text,text,text,boolean,text) from public;
revoke all on function public.read_my_private_suggestion(bigint,text) from public;
revoke all on function public.bump_suggestion_like(bigint) from public;
grant execute on function public.submit_private_readable_suggestion(text,text,text,text,boolean,text) to anon, authenticated;
grant execute on function public.read_my_private_suggestion(bigint,text) to anon, authenticated;
grant execute on function public.bump_suggestion_like(bigint) to anon, authenticated;
grant select on public.suggestions_public to anon, authenticated;

-- 운영진: 기존 비공개 글은 작성자를 확인할 수 있는 계정 ID가 기록되지 않았습니다.
-- 과거 글에 코드를 추가하려면 글 작성자를 직접 확인한 다음,
-- 아래 예시를 SQL Editor에서 따로 실행하여 코드를 발급해야 합니다.
-- 1) SELECT encode(gen_random_bytes(32), 'hex') AS issue_code;
-- 2) UPDATE public.suggestions SET author_receipt_hash=md5('위에서 발급한 64자리 코드')
--    WHERE id=해당_건의글_ID AND secret=true AND author_receipt_hash IS NULL;
-- 3) 코드를 해당 작성자에게만 전달하세요. 작성자는 건의글을 열고 코드를 입력하면 됩니다.
