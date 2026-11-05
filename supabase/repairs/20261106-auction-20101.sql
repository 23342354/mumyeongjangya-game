-- Supabase SQL Editor에서 두 러너가 게임 탭을 닫은 뒤 전체 실행합니다.
-- 경매 20101 낙찰품 미수령 시 지급 + 보호 각인 오류에 대한 사리 9개 보상.
-- 사리 실차감 여부는 확인되지 않았으므로 9개는 운영 보상입니다.
-- 같은 repair_key로 재실행해도 중복 지급하지 않습니다. 재화 차감/경매 환불은 하지 않습니다.
BEGIN;
CREATE TABLE IF NOT EXISTS public.operator_game_repairs (
 repair_key text PRIMARY KEY,
 account_id text NOT NULL,
 lot_id bigint NOT NULL,
 before_state jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.operator_game_repairs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.operator_game_repairs FROM PUBLIC, anon, authenticated;
DO $$
DECLARE
 repair_id constant text := '20261106-auction-20101-protection-compensation';
 l public.wandering_auction_lots%ROWTYPE;
 p public.pairs%ROWTYPE;
 st public.pair_play_state%ROWTYPE;
 backup jsonb;
 reward_wallet jsonb;
BEGIN
 PERFORM pg_advisory_xact_lock(726503220061::bigint);
 IF EXISTS(SELECT 1 FROM public.operator_game_repairs WHERE repair_key=repair_id) THEN
  RAISE NOTICE '이미 처리한 복구입니다. 추가 지급하지 않습니다.';
  RETURN;
 END IF;
 SELECT * INTO STRICT l FROM public.wandering_auction_lots WHERE id=20101 FOR UPDATE;
 IF l.winner_id IS NULL OR l.winner_name IS DISTINCT FROM '코우케이 요우'
    OR l.bid_amount<>245000 OR (l.item_data->>'lv')::int IS DISTINCT FROM 59 THEN
  RAISE EXCEPTION '경매 20101이 확인한 낙찰 기록과 다릅니다. 변경을 중단합니다.';
 END IF;
 IF l.ends_at>clock_timestamp() THEN RAISE EXCEPTION '아직 마감되지 않았습니다.'; END IF;
 SELECT * INTO p FROM public.pairs
 WHERE status='accepted' AND l.winner_id IN(from_id,to_id)
 ORDER BY id DESC LIMIT 1 FOR UPDATE;
 IF p.id IS NOT NULL THEN
  SELECT * INTO st FROM public.pair_play_state WHERE pair_id=p.id FOR UPDATE;
  IF NOT FOUND OR st.closed THEN RAISE EXCEPTION '활성 공동 지갑을 먼저 확인해 주세요.';END IF;
  PERFORM 1 FROM public.accounts WHERE id IN(p.from_id,p.to_id) ORDER BY id FOR UPDATE;
 ELSE
  PERFORM 1 FROM public.accounts WHERE id=l.winner_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION '낙찰 계정이 없습니다.'; END IF;
 END IF;
 SELECT jsonb_build_object('lot',to_jsonb(l),'pairState',to_jsonb(st),
  'accounts',(SELECT jsonb_agg(jsonb_build_object('id',a.id,'save',a.save,'pair_play_rev',a.pair_play_rev,'market_rev',a.market_rev))
   FROM public.accounts a WHERE a.id=l.winner_id OR (p.id IS NOT NULL AND a.id IN(p.from_id,p.to_id)))) INTO backup;
 INSERT INTO public.operator_game_repairs(repair_key,account_id,lot_id,before_state)
 VALUES(repair_id,l.winner_id,l.id,backup);
 IF l.claimed_at IS NULL THEN
  -- 정상 수령과 같은 함수를 사용합니다. 페어면 공동 바랑에 한 번 지급합니다.
  PERFORM public.wandering_auction_wallet(l.winner_id,0,l.item_data);
  UPDATE public.wandering_auction_lots SET claimed_at=clock_timestamp(),status='closed' WHERE id=l.id;
 END IF;
 IF p.id IS NOT NULL THEN
  SELECT * INTO STRICT st FROM public.pair_play_state WHERE pair_id=p.id FOR UPDATE;
  reward_wallet:=jsonb_set(st.wallet,'{sari}',to_jsonb(coalesce((st.wallet->>'sari')::numeric,0)+9));
  UPDATE public.pair_play_state SET wallet=reward_wallet,revision=revision+1 WHERE pair_id=p.id;
  UPDATE public.accounts SET save=public.pp_apply(save,reward_wallet,st.progress),
   pair_play_rev=pair_play_rev+1,market_rev=market_rev+1
  WHERE id IN(p.from_id,p.to_id);
 ELSE
  UPDATE public.accounts SET save=jsonb_set(save,'{sari}',to_jsonb(coalesce((save->>'sari')::numeric,0)+9)),
   pair_play_rev=pair_play_rev+1,market_rev=market_rev+1 WHERE id=l.winner_id;
 END IF;
 RAISE NOTICE '경매 20101 수령 처리 및 사리 9개 운영 보상 완료. 페어면 공동 지갑에 9개 지급됩니다.';
END $$;
COMMIT;
-- 계정 비밀번호 등 인증 정보는 출력하지 않습니다.
SELECT r.repair_key,r.account_id,l.item_name,l.claimed_at AT TIME ZONE 'Asia/Seoul' AS received_kst
FROM public.operator_game_repairs r JOIN public.wandering_auction_lots l ON l.id=r.lot_id
WHERE r.repair_key='20261106-auction-20101-protection-compensation';
