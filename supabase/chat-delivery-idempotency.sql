-- 클라이언트 배포 전에 Supabase SQL Editor에서 전체 실행합니다.
-- 기존 메시지·권한·채널 정책을 변경하지 않습니다.
BEGIN;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS client_request_id text;
CREATE UNIQUE INDEX IF NOT EXISTS messages_client_request_id_idx ON public.messages(client_request_id);
COMMIT;
