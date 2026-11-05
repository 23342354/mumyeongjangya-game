-- 최신 기입장 클라이언트 배포 전에 전체 실행합니다. 기존 잔액/매물/영수증은 변경하지 않습니다.
-- 실제 금액 변경과 같은 트랜잭션에서 기록합니다. 과거 누락 기록은 추정해 생성하지 않습니다.
BEGIN;
CREATE OR REPLACE FUNCTION public.rin_ledger_add(s jsonb,amount numeric,label text) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SET search_path=public AS $$
DECLARE entries jsonb;
BEGIN
 IF coalesce(amount,0)=0 THEN RETURN s;END IF;
 SELECT coalesce(jsonb_agg(value ORDER BY ord),'[]') INTO entries FROM (
 SELECT value,ord FROM jsonb_array_elements(jsonb_build_array(jsonb_build_object(
 'id',gen_random_uuid()::text,'src','server','t',floor(extract(epoch FROM clock_timestamp())*1000),
 'a',amount,'k',left(label,24)))||case when jsonb_typeof(s->'ledger')='array' then s->'ledger' else '[]'::jsonb end) WITH ORDINALITY AS e(value,ord)
 ORDER BY ord LIMIT 40) q;
 RETURN jsonb_set(s,'{ledger}',entries,true);
END $$;
REVOKE ALL ON FUNCTION public.rin_ledger_add(jsonb,numeric,text) FROM PUBLIC,anon,authenticated;
-- 클라이언트 저장본에 아직 내려오지 않은 서버 영수증도 다음 저장에서 보존합니다.
CREATE OR REPLACE FUNCTION public.rin_ledger_preserve(old_entries jsonb,new_entries jsonb) RETURNS jsonb
LANGUAGE sql IMMUTABLE SET search_path=public AS $$
 SELECT coalesce(jsonb_agg(value ORDER BY (value->>'t')::numeric DESC),'[]') FROM (
 SELECT value FROM (
 SELECT DISTINCT ON(coalesce(value->>'id',value::text)) value
 FROM jsonb_array_elements(
  coalesce((SELECT jsonb_agg(e) FROM jsonb_array_elements(case when jsonb_typeof(old_entries)='array' then old_entries else '[]'::jsonb end) e WHERE e->>'src'='server'),'[]')
  ||case when jsonb_typeof(new_entries)='array' then new_entries else '[]'::jsonb end
 ) WITH ORDINALITY AS e(value,ord)
 WHERE jsonb_typeof(value->'t')='number' AND jsonb_typeof(value->'a')='number'
 ORDER BY coalesce(value->>'id',value::text),ord
 ) dedup ORDER BY (value->>'t')::numeric DESC LIMIT 40
 ) recent
$$;
REVOKE ALL ON FUNCTION public.rin_ledger_preserve(jsonb,jsonb) FROM PUBLIC,anon,authenticated;
-- 기존 함수의 확인된 기록 지점만 추가합니다. 예상한 코드가 아니면 전체 롤백합니다.
DO $patch$
DECLARE def text;needle text;replacement text;name text;
BEGIN
 -- 경매: 실제 차감 또는 환불을 받은 계정만 기록. 공동 지갑 복사본에는 중복 기록하지 않음.
 name:='public.wandering_auction_wallet(text,bigint,jsonb)';def:=pg_get_functiondef(name::regprocedure);
 IF position('rin_ledger_add' IN def)=0 THEN
  needle:='save=jsonb_set(public.pp_apply(save,w,t.progress),';
  IF position(needle IN def)=0 THEN RAISE EXCEPTION '경매 지갑 함수 버전을 확인해 주세요.';END IF;
  def:=replace(def,needle,'save=jsonb_set(case when id=p_actor then public.rin_ledger_add(public.pp_apply(save,w,t.progress),p_rin_delta,case when p_rin_delta<0 then ''떠돌이 상인 입찰'' else ''경매 입찰금 반환'' end) else public.pp_apply(save,w,t.progress) end,');
  needle:='v_save:=jsonb_set(v_save,''{marketRev}'',';
  IF position(needle IN def)=0 THEN RAISE EXCEPTION '단독 경매 지갑 버전을 확인해 주세요.';END IF;
  def:=replace(def,needle,'v_save:=public.rin_ledger_add(v_save,p_rin_delta,case when p_rin_delta<0 then ''떠돌이 상인 입찰'' else ''경매 입찰금 반환'' end);'||chr(10)||needle);EXECUTE def;
 END IF;
 -- 중개소: 페어 래퍼도 사용하는 실제 거래 함수. 잔액 확정 지점에만 추가.
 name:=case when to_regprocedure('public.market_trade_solo(text,text,text,jsonb)') IS NOT NULL THEN 'public.market_trade_solo(text,text,text,jsonb)' ELSE 'public.market_trade(text,text,text,jsonb)' END;
 def:=pg_get_functiondef(name::regprocedure);
 IF position('rin_ledger_add' IN def)=0 THEN
  needle:='update public.accounts set save=v_save,market_rev=v_rev where id=p_actor;';
  IF position(needle IN def)=0 THEN RAISE EXCEPTION '중개소 거래 함수 버전을 확인해 주세요.';END IF;
  replacement:='v_save:=public.rin_ledger_add(v_save,coalesce((v_save->>''rin'')::numeric,0)-coalesce((a.save->>''rin'')::numeric,0),case p_action when ''buy'' then ''중개소 구매'' when ''withdraw'' then ''중개소 판매 정산'' else ''중개소 거래'' end);';
  def:=replace(def,needle,replacement||chr(10)||needle);EXECUTE def;
 END IF;
 -- 공동 일세: 납부가 실제 확정될 때만 신청 계정에 기록. 읽기/이미 납부된 요청은 0건.
 name:='public.pair_play(text,text,text,bigint,text,jsonb,jsonb,jsonb,bigint,jsonb,jsonb,jsonb)';def:=pg_get_functiondef(name::regprocedure);
 IF position('rin_ledger_add' IN def)=0 THEN
  needle:='insert into public.pair_play_receipts(pair_id,request_id,actor)';
  IF position(needle IN def)=0 THEN RAISE EXCEPTION '공동 일세 함수 버전을 확인해 주세요.';END IF;
  def:=replace(def,needle,'if p_action=''rent'' then update public.accounts set save=public.rin_ledger_add(save,-cost,''일세'') where id=p_user;end if;'||chr(10)||needle);EXECUTE def;
 END IF;
 -- 동아리 금고·시설: 실제 출납 함수는 영수증으로 중복 실행을 차단합니다.
 IF to_regprocedure('public.runner_club_transfer(text,text,text,jsonb)') IS NOT NULL THEN
  name:='public.runner_club_transfer(text,text,text,jsonb)';def:=pg_get_functiondef(name::regprocedure);
  IF position('rin_ledger_add' IN def)=0 THEN
   needle:='insert into public.runner_club_receipts(user_id,request_id,signature)';
   IF position(needle IN def)=0 THEN RAISE EXCEPTION '동아리 출납 함수 버전을 확인해 주세요.';END IF;
   def:=replace(def,needle,'update public.accounts set save=public.rin_ledger_add(save,cash-coalesce((a.save->>''rin'')::numeric,0),case p_action when ''deposit'' then ''동아리 금고 입금'' when ''withdraw'' then ''동아리 금고 출금'' when ''donate'' then ''동아리 기부'' else ''동아리 시설'' end) where id=p_user;'||chr(10)||needle);EXECUTE def;
  END IF;
 END IF;
 -- 구버전 저장 거부 검사는 유지하면서, 서버가 이미 만든 영수증만 보존합니다.
 name:='public.market_save_guard()';def:=pg_get_functiondef(name::regprocedure);
 IF position('rin_ledger_preserve' IN def)=0 THEN
  needle:=case when position('RETURN NEW;' IN def)>0 then 'RETURN NEW;' else 'return new;' end;
  IF position(needle IN def)=0 THEN RAISE EXCEPTION '저장 보호 함수 버전을 확인해 주세요.';END IF;
  def:=replace(def,needle,'if NEW.save is not null then NEW.save:=jsonb_set(NEW.save,''{ledger}'',public.rin_ledger_preserve(OLD.save->''ledger'',NEW.save->''ledger''),true);end if;'||chr(10)||needle);EXECUTE def;
 END IF;

END $patch$;
CREATE OR REPLACE FUNCTION public.rin_ledger_snapshot(p_user text,p_token text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.accounts%ROWTYPE;p public.pairs%ROWTYPE;peer_id text;rows jsonb;
BEGIN
 SELECT * INTO a FROM public.accounts WHERE id=p_user AND pw=p_token;
 IF NOT FOUND THEN RAISE EXCEPTION '계정 인증이 필요합니다.';END IF;
 SELECT * INTO p FROM public.pairs WHERE status='accepted' AND p_user IN(from_id,to_id) ORDER BY id DESC LIMIT 1;
 peer_id:=case when p.from_id=p_user then p.to_id else p.from_id end;
 SELECT coalesce(jsonb_agg(jsonb_build_object('t',e->'t','a',e->'a','k',e->'k','id',e->'id','src',e->'src','who',coalesce(s.save->>'name',s.name),'color',coalesce(s.save->>'color','var(--violet)'),'me',s.id=p_user) ORDER BY (e->>'t')::numeric DESC),'[]') INTO rows
 FROM public.accounts s CROSS JOIN LATERAL jsonb_array_elements(case when jsonb_typeof(s.save->'ledger')='array' then s.save->'ledger' else '[]'::jsonb end) e WHERE s.id=p_user OR s.id=peer_id;
 RETURN jsonb_build_object('ok',true,'rows',rows);
END $$;
REVOKE ALL ON FUNCTION public.rin_ledger_snapshot(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rin_ledger_snapshot(text,text) TO anon,authenticated;
COMMIT;
