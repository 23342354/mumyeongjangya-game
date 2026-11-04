-- 無明長夜 · 사무전 · 배포 전 재초기화 + 삭제 계정 명부 재생성 방지
-- 대상: 2026-11-04 인증화면/공동지갑/알림/픽셀풍경 최신 통합본
-- 실행 위치: Supabase Dashboard > SQL Editor
-- 주의: 게임 테스트 계정 및 모든 게임 기록이 영구 삭제됩니다.
-- 실행 전 백업하고, 모든 기기의 테스트 사이트 탭을 종료한 뒤 웹 패치를 먼저 배포하세요.
-- 유지: 테이블 구조, 함수/RPC, 트리거, 정책, 설치 패치, GitHub Pages 파일.
-- 제외: auth / storage / cron 등 public 이외의 Supabase 시스템 스키마.
-- 옵션 기능이 설치되지 않아 해당 테이블이 없어도 실행할 수 있습니다.
-- 등록된 게임 테이블 외에 외래 키가 있으면 RESTRICT로 실패하도록 안전 처리합니다.
-- 핵심 방지책: students.id -> accounts.id 외래 키로 삭제된 계정의 명부 재등록을 차단합니다.

BEGIN;
SET LOCAL lock_timeout = '10s';

DO $reset$
DECLARE
    table_name text;
    all_game_tables text[] := ARRAY[
        'accounts', 'students', 'pairs',
        'pair_play_state', 'pair_play_receipts',
        'messages', 'rooms', 'room_members', 'suggestions',
        'social_links', 'rp_posts', 'rp_reply_alerts', 'pair_posts',
        'market_listings', 'market_balances',
        'pvp_rooms', 'pvp_messages',
        'mm_push_subscriptions', 'mm_push_events',
        'mm_push_farm_due', 'mm_push_timer_due'
    ];
    existing_tables text[] := ARRAY[]::text[];
BEGIN
    -- 다른 프로젝트의 SQL Editor를 열었다면 즉시 정지합니다.
    IF to_regclass('public.accounts') IS NULL
       OR to_regclass('public.pairs') IS NULL
       OR to_regclass('public.students') IS NULL THEN
        RAISE EXCEPTION '無明長夜 기본 테이블이 없습니다. 올바른 Supabase 프로젝트인지 확인하세요.';
    END IF;

    FOREACH table_name IN ARRAY all_game_tables LOOP
        IF EXISTS (
            SELECT 1
              FROM pg_catalog.pg_class c
              JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
             WHERE n.nspname = 'public'
               AND c.relname = table_name
               AND c.relkind IN ('r', 'p')
        ) THEN
            existing_tables := array_append(
                existing_tables, format('%I.%I', 'public', table_name)
            );
        END IF;
    END LOOP;

    -- 모든 테이블을 단일 TRUNCATE로 처리해야 외래 키 참조에 걸리지 않습니다.
    -- CASCADE를 쓰지 않으므로 예상하지 못한 다른 테이블의 자료는 지우지 않습니다.
    EXECUTE 'TRUNCATE TABLE ' || array_to_string(existing_tables, ', ')
         || ' RESTART IDENTITY RESTRICT';

    -- 학생 명부에 계정이 존재하지 않는 캐릭터가 생성되는 것을 차단합니다.
    -- 과거/오프라인 세이브의 임의 ID는 더 이상 명부로 되살아날 수 없습니다.
    IF NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_constraint
      WHERE conrelid='public.students'::regclass
        AND conname='mm_students_account_fk'
    ) THEN
       ALTER TABLE public.students
         ADD CONSTRAINT mm_students_account_fk
         FOREIGN KEY (id) REFERENCES public.accounts(id) ON DELETE CASCADE;
    END IF;

    RAISE NOTICE '재초기화 완료: %개 게임 테이블 + 학생-계정 연결 보호 적용',
        cardinality(existing_tables);
END;
$reset$;

COMMIT;

-- 필수 기록이 0건인지 확인합니다.
SELECT
  (SELECT count(*) FROM public.accounts) AS accounts_left,
  (SELECT count(*) FROM public.students) AS students_left,
  (SELECT count(*) FROM public.pairs) AS pairs_left,
  (SELECT count(*) FROM public.messages) AS messages_left,
  (SELECT count(*) FROM public.suggestions) AS suggestions_left,
  (SELECT count(*) FROM pg_catalog.pg_constraint WHERE conrelid='public.students'::regclass AND conname='mm_students_account_fk') AS orphan_guard_enabled;
