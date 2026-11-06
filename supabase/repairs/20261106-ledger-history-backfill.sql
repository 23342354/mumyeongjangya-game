-- 받은 조회 목록에 한정한 과거 지출 기입장 복원. 잔액/물품/보상은 변경하지 않습니다.
-- 먼저 ledger-money-events.sql과 해당 클라이언트 패치를 적용하세요.
-- 같은 날 같은 금액 또는 합산됐을 가능성이 있는 동종 기록은 중복 가능성으로 보류합니다.
BEGIN;
CREATE TABLE IF NOT EXISTS public.ledger_history_backfills (
 source_key text PRIMARY KEY,
 account_id text NOT NULL,
 amount numeric NOT NULL,
 item_name text NOT NULL,
 occurred_at timestamptz NOT NULL,
 status text NOT NULL CHECK(status IN('restored','held','already_recorded','missing_account')),
 note text NOT NULL,
 before_ledger jsonb,
 recorded_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ledger_history_backfills ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ledger_history_backfills FROM PUBLIC,anon,authenticated;
DO $$
DECLARE r record;a public.accounts%ROWTYPE;entries jsonb;new_entries jsonb;mark text;
BEGIN
 IF to_regprocedure('public.rin_ledger_snapshot(text,text)') IS NULL
    OR to_regprocedure('public.rin_ledger_preserve(jsonb,jsonb)') IS NULL THEN
  RAISE EXCEPTION 'ledger-money-events.sql을 먼저 적용해 주세요.';
 END IF;
 -- 같은 복원 SQL의 동시 실행을 직렬화합니다.
 PERFORM pg_advisory_xact_lock(726503220062::bigint);
 FOR r IN
  SELECT 'auction:'||l.id AS source_key,l.winner_id AS account_id,l.item_name,
         -l.bid_amount::numeric AS amount,l.ends_at AS occurred_at,'경매 낙찰 복원' AS label
  FROM public.wandering_auction_lots l
  WHERE l.status='closed' AND l.winner_id IS NOT NULL AND l.bid_amount>0
    AND l.ends_at<=timestamptz '2026-11-06 07:15:00+09'
    AND l.id=ANY(ARRAY[23644,23641,23452,23451,23458,23326,23275,23257,23083,22237,22222,22236,21271,21270,21358,21284,20624,20672,20548,20101,20125,20123,20227,19516,19528,19532,18703,18702,18625,17737,17736,17755,17793,17794,16812,16813,16782,16811,16909,16783,15718,15844,15721,15004,15136,15010,14380,14247,14230,13297,12559,12556,12555,11464,10990,9931,9930,9952,8011,7741,7338,7329,5301,3964,3240,2408]::bigint[])
  UNION ALL
  SELECT 'market:'||m.id,m.buyer_id,m.item_name,-m.price::numeric,m.completed_at,'중개소 구매 복원'
  FROM public.market_listings m WHERE m.status='sold' AND m.buyer_id IS NOT NULL
    AND m.completed_at<=timestamptz '2026-11-06 07:15:00+09'
    AND m.id=ANY(ARRAY[15,13,7,1,8,9,2]::bigint[])
  ORDER BY account_id,occurred_at,source_key
 LOOP
  -- 처리 결과를 별도 보관해 기입장 40줄 제한으로 사라져도 재실행 시 중복 추가하지 않습니다.
  IF EXISTS(SELECT 1 FROM public.ledger_history_backfills WHERE source_key=r.source_key) THEN CONTINUE;END IF;
  SELECT * INTO a FROM public.accounts WHERE id=r.account_id FOR UPDATE;
  IF NOT FOUND OR a.save IS NULL THEN
   INSERT INTO public.ledger_history_backfills(source_key,account_id,amount,item_name,occurred_at,status,note)
   VALUES(r.source_key,r.account_id,r.amount,r.item_name,r.occurred_at,'missing_account','계정 저장본을 확인할 수 없습니다.');
   CONTINUE;
  END IF;
  entries:=case when jsonb_typeof(a.save->'ledger')='array' then a.save->'ledger' else '[]'::jsonb end;
  mark:='history:'||r.source_key;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(entries) e
    WHERE e->>'id'=mark OR e->>'sourceKey'=r.source_key OR e->>'id'=r.source_key) THEN
   INSERT INTO public.ledger_history_backfills VALUES(r.source_key,r.account_id,r.amount,r.item_name,r.occurred_at,'already_recorded','동일한 거래 식별자가 이미 있습니다.',entries,now());
   CONTINUE;
  END IF;
  -- 식별자 없는 예전 기록/새 UUID 기록과 중복될 수 있으면 자동 복원하지 않습니다.
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(entries) e
    WHERE e->>'sourceKey' IS NULL
      AND jsonb_typeof(e->'a')='number' AND jsonb_typeof(e->'t')='number'
      AND ((e->>'a')::numeric=r.amount OR ((e->>'a')::numeric<0 AND
           ((r.source_key LIKE 'market:%' AND coalesce(e->>'k','') ~ '중개소|장터') OR
            (r.source_key LIKE 'auction:%' AND coalesce(e->>'k','') ~ '경매|상인|중개소'))))
      AND (to_timestamp((e->>'t')::double precision/1000) AT TIME ZONE 'Asia/Seoul')::date
          =(r.occurred_at AT TIME ZONE 'Asia/Seoul')::date) THEN
   INSERT INTO public.ledger_history_backfills VALUES(r.source_key,r.account_id,r.amount,r.item_name,r.occurred_at,'held','동일 금액 또는 동종 합산 기록과 중복될 가능성이 있습니다. 수동 대조가 필요합니다.',entries,now());
   CONTINUE;
  END IF;
  INSERT INTO public.ledger_history_backfills VALUES(r.source_key,r.account_id,r.amount,r.item_name,r.occurred_at,'restored','기입장만 복원. 최근 40줄 이외는 이 원장에서 조회합니다. 경매 기준시간은 마감 시각입니다.',entries,now());
  SELECT coalesce(jsonb_agg(value ORDER BY (value->>'t')::numeric DESC),'[]') INTO new_entries FROM (
   SELECT value FROM jsonb_array_elements(entries||jsonb_build_array(jsonb_build_object(
    'id',mark,'sourceKey',r.source_key,'src','server','restored',true,
    't',floor(extract(epoch FROM r.occurred_at)*1000),'a',r.amount,'k',r.label,'item',r.item_name)))
   ORDER BY (value->>'t')::numeric DESC LIMIT 40
  ) recent;
  UPDATE public.accounts SET save=jsonb_set(save,'{ledger}',new_entries,true)
       ||jsonb_build_object('marketRev',market_rev),pair_play_rev=pair_play_rev+1
  WHERE id=r.account_id;
 END LOOP;
END $$;
COMMIT;
SELECT status AS 처리상태,count(*) AS 건수,sum(amount) AS 기록금액
FROM public.ledger_history_backfills GROUP BY status ORDER BY status;
SELECT source_key AS 복원키,account_id AS 계정,item_name AS 물품,amount AS 금액,
 occurred_at AT TIME ZONE 'Asia/Seoul' AS 기준시간,status AS 처리상태,note AS 안내
FROM public.ledger_history_backfills ORDER BY occurred_at DESC,source_key;
