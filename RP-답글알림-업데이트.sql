-- 無明長夜 / RP 게시판: 서버에 남는 수신자별 답글 알림.
-- Supabase SQL Editor에서 전체 실행. 여러 번 실행해도 기존 RP 게시글은 그대로 유지됩니다.
-- 선행 조건: 교류-업데이트.sql (rp_posts, accounts), 페어-헤더-게시판.sql (중첩 답글 허용)
BEGIN;

CREATE TABLE IF NOT EXISTS public.rp_reply_alerts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  post_id bigint NOT NULL,
  parent_id bigint NOT NULL,
  root_id bigint NOT NULL,
  recipient_id text NOT NULL,
  actor_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rp_reply_alert_once UNIQUE (post_id, recipient_id)
);
CREATE INDEX IF NOT EXISTS rp_reply_alert_recipient_idx
  ON public.rp_reply_alerts (recipient_id, id);

-- 브라우저에 공개된 anon 키만으로 다른 사람의 알림을 읽을 수 없게 합니다.
ALTER TABLE public.rp_reply_alerts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rp_reply_alerts FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.rp_reply_alert_capture()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  direct_author text;
  root_author text;
  root_post bigint;
BEGIN
  IF NEW.parent_id IS NULL THEN RETURN NEW; END IF;

  SELECT author_id INTO direct_author FROM public.rp_posts WHERE id=NEW.parent_id;
  -- 답글의 답글까지 따라가 가장 위 원글의 작성자를 찾습니다.
  WITH RECURSIVE ancestors AS (
    SELECT id, parent_id, 1 AS depth FROM public.rp_posts WHERE id=NEW.parent_id
    UNION ALL
    SELECT p.id, p.parent_id, a.depth+1
    FROM public.rp_posts p JOIN ancestors a ON p.id=a.parent_id
    WHERE a.depth<80
  )
  SELECT id INTO root_post FROM ancestors ORDER BY depth DESC LIMIT 1;
  root_post := COALESCE(root_post, NEW.parent_id);
  SELECT author_id INTO root_author FROM public.rp_posts WHERE id=root_post;

  -- 바로 위 글의 작성자 + 원글 작성자에게 각각 한 번만 보냅니다.
  -- 본인 답글에는 알림을 만들지 않습니다.
  INSERT INTO public.rp_reply_alerts(post_id,parent_id,root_id,recipient_id,actor_id,created_at)
  SELECT DISTINCT NEW.id, NEW.parent_id, root_post, receiver, NEW.author_id, NEW.created_at
  FROM (VALUES (direct_author), (root_author)) AS recipients(receiver)
  WHERE receiver IS NOT NULL AND receiver<>NEW.author_id
  ON CONFLICT (post_id,recipient_id) DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_rp_reply_alert_capture ON public.rp_posts;
CREATE TRIGGER trg_rp_reply_alert_capture AFTER INSERT ON public.rp_posts
FOR EACH ROW EXECUTE FUNCTION public.rp_reply_alert_capture();

-- 서버가 해당 계정의 자격을 검증한 후 그 계정의 알림만 반환합니다.
CREATE OR REPLACE FUNCTION public.rp_read_alerts(
  p_actor text, p_token text, p_after bigint DEFAULT 0
)
RETURNS TABLE (
  id bigint, post_id bigint, parent_id bigint, root_id bigint,
  actor_id text, created_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.accounts a WHERE a.id=p_actor AND a.pw=p_token)
  THEN RAISE EXCEPTION '로그인이 필요합니다'; END IF;
  RETURN QUERY
    SELECT r.id,r.post_id,r.parent_id,r.root_id,r.actor_id,r.created_at
    FROM public.rp_reply_alerts r
    WHERE r.recipient_id=p_actor AND r.id>GREATEST(COALESCE(p_after,0),0)
      AND r.created_at>=now()-interval '30 days'
    ORDER BY r.id ASC LIMIT 200;
END;
$$;
REVOKE ALL ON FUNCTION public.rp_read_alerts(text,text,bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rp_read_alerts(text,text,bigint) TO anon, authenticated;
COMMIT;
