-- 無明長夜 · 삭제하지 않고 기록만 확인 (Supabase SQL Editor)
-- 계정이 없는 학생이 나타나면 예전 브라우저 저장본이 다시 올라왔을 가능성이 있습니다.
SELECT s.id, s.name, s.lvl, s.power, s.updated_at,
       CASE WHEN a.id IS NULL THEN '계정 없음 (복원/잔존 의심)'
            ELSE '계정 존재' END AS account_status
FROM public.students AS s
LEFT JOIN public.accounts AS a ON a.id=s.id
ORDER BY s.updated_at DESC;

-- 정상적으로 초기화되었다면 계정 0, 학생 0, 그 밖의 아래 값도 0이어야 합니다.
SELECT
  (SELECT count(*) FROM public.accounts) AS accounts_left,
  (SELECT count(*) FROM public.students) AS students_left,
  (SELECT count(*) FROM public.messages) AS messages_left,
  (SELECT count(*) FROM public.pairs) AS pairs_left,
  (SELECT count(*) FROM public.suggestions) AS suggestions_left,
  (SELECT count(*) FROM pg_catalog.pg_constraint WHERE conrelid='public.students'::regclass
      AND conname='mm_students_account_fk') AS orphan_guard_enabled;

-- 설치 파일에 없는 다른 public 테이블이 있는지 이름만 확인합니다. 여기서는 삭제하지 않습니다.
SELECT tablename
FROM pg_catalog.pg_tables
WHERE schemaname='public'
  AND tablename NOT IN (
    'accounts','students','pairs','pair_play_state','pair_play_receipts',
    'messages','rooms','room_members','suggestions','social_links',
    'rp_posts','rp_reply_alerts','pair_posts','market_listings','market_balances',
    'pvp_rooms','pvp_messages','mm_push_subscriptions','mm_push_events',
    'mm_push_farm_due','mm_push_timer_due'
  )
ORDER BY tablename;
