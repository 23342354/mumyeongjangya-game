-- 운영 Supabase SQL Editor에서 전체 실행합니다.
-- 재화/장비/수업 진행은 변경하지 않고 중개소 저장 버전 메타데이터를 일치시킵니다.
-- 기존 구버전 저장 거부 검사를 유지합니다. 사리/낙찰품을 재지급하지 않습니다.
BEGIN;
CREATE OR REPLACE FUNCTION public.market_save_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path=public AS $$
DECLARE incoming_rev bigint;
BEGIN
 -- 먼저 이전과 같은 방식으로 구버전 덮어쓰기를 거부합니다.
 IF NEW.save IS DISTINCT FROM OLD.save AND OLD.market_rev>0 THEN
  BEGIN incoming_rev:=coalesce((NEW.save->>'marketRev')::bigint,0);
  EXCEPTION WHEN OTHERS THEN incoming_rev:=0; END;
  IF incoming_rev<OLD.market_rev THEN
   RAISE EXCEPTION 'MARKET_STALE_SAVE: 거래 후 변경된 저장본입니다. 중개소에서 동기화하세요.';
  END IF;
 END IF;
 -- 검증을 통과한 저장에만 서버 열의 최종 버전 번호를 기록합니다.
 IF NEW.save IS NOT NULL THEN
  NEW.save:=jsonb_set(NEW.save,'{marketRev}',to_jsonb(NEW.market_rev),true);
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS market_save_guard ON public.accounts;
CREATE TRIGGER market_save_guard BEFORE UPDATE OF save,market_rev ON public.accounts
FOR EACH ROW EXECUTE FUNCTION public.market_save_guard();
-- 이미 어긋난 서버 기록 정정. CAS 버전을 올려 이전 스냅샷의 저장도 충돌 확인하도록 합니다.
UPDATE public.accounts
SET save=jsonb_set(save,'{marketRev}',to_jsonb(market_rev),true),
    pair_play_rev=pair_play_rev+1
WHERE save IS NOT NULL AND (save->'marketRev') IS DISTINCT FROM to_jsonb(market_rev);
COMMIT;
-- 비밀번호/토큰/개인 저장 내용 없이 버전 불일치 개수만 확인합니다. 정상: 0
SELECT count(*) AS mismatched_accounts FROM public.accounts
WHERE save IS NOT NULL AND (save->'marketRev') IS DISTINCT FROM to_jsonb(market_rev);
