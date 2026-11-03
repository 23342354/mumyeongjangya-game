# 無明長夜 Web Push · CORS 복구 안내

## 확인한 증상
- Supabase Dashboard에서 POST `{"action":"public-key"}` 시험: HTTP 200, `ready: true`.
- `https://ignorance.site/`에서 `samu-push` 호출: `Response to preflight request ... It does not have HTTP ok status`.
- 별도 오류: `POST /rest/v1/rpc/mm_account_save` HTTP 400. 이는 Web Push preflight 문제와 별개입니다.

## 반드시 먼저 할 일
1. Supabase Dashboard → Edge Functions → `samu-push` → **Details** (또는 Settings) → **Verify JWT OFF** 저장.
2. 이전 ZIP 서버 코드에는 이미 CORS `OPTIONS → 204` 처리가 있었습니다. 따라서 401 사전 차단이면 **JWT 토글이 근본 원인**입니다. Dashboard의 `public-key` POST 200만으로 브라우저의 OPTIONS 허용이 증명되지 않습니다.
3. 함수 코드가 과거 버전인 경우 본 ZIP의 `supabase/functions/samu-push/index.ts`를 **전체 교체 후 Deploy**.
4. 사이트가 과거 코드인 경우 `index.html`과 `part12.js`만 사이트에 함께 교체. 새 클라이언트에서는 Supabase publishable key를 `Authorization: Bearer`로 보내지 않습니다. 프로젝트의 `config.js`는 **절대 덮어쓰지 마세요**.
5. `Ctrl + Shift + R` 후 알림함에서 '푸시 알림 켜기' 재시도.

## Windows에서 실제 OPTIONS 응답 확인
명령 프롬프트(cmd)에 아래를 그대로 입력합니다. 이 명령에는 비밀키가 필요하지 않습니다.

```
curl.exe -i -X OPTIONS "https://vxqfwlfkywyrbxfqnrbj.supabase.co/functions/v1/samu-push" -H "Origin: https://ignorance.site" -H "Access-Control-Request-Method: POST" -H "Access-Control-Request-Headers: content-type,apikey"
```

정상 예: `HTTP/2 204` 또는 `HTTP/1.1 204 No Content`와 `Access-Control-Allow-Origin: https://ignorance.site`, `Access-Control-Allow-Methods: POST, OPTIONS`, `Access-Control-Allow-Headers: ... apikey, content-type ...`.
- `401`: Verify JWT 켜짐 또는 게이트웨이 인증 문제. 함수 코드만 고쳐서는 해결되지 않습니다.
- `404`: 함수 이름/프로젝트 주소 확인.
- `500`: Edge Functions → `samu-push` → Logs 확인.
- `204`지만 브라우저 오류 지속: DevTools Network → OPTIONS 응답 헤더·요청 헤더를 확인합니다.

## mm_account_save 400 (중요 · 별도 문제)
이 코드는 서버 계정 저장본 보호를 위해 특정 오류를 400으로 응답할 수 있습니다. 오류를 추측해 SQL을 변경하거나 계정을 초기화하지 마세요.

1. 사무전 화면 → 설정 → 기록 → **기록 복사** → 텍스트 파일로 로컬에 안전하게 보관. 계정/개인 설정값이 포함될 수 있으므로 공유하지 마세요.
2. 개발자 도구(F12) → Network → `mm_account_save` 요청 → **Response** 에서 `message`만 확인.
3. `MARKET_STALE_SAVE`이면 중개소의 서버 거래 버전과 저장본이 다른 상태입니다. 임의로 `market_rev`를 초기화하거나 SQL 보호 트리거를 삭제하지 마세요. 서버와 보유 재고를 안전하게 맞추는 절차가 필요합니다.
4. `Could not find the function ... in the schema cache`이면 최신 중개소 SQL 및 함수 정의와 PostgREST 캐시가 맞는지 확인해야 합니다.

## 보안
VAPID 개인키, `MMJY_PUSH_WEBHOOK_SECRET`, `service_role`, 계정 토큰은 브라우저 콘솔/스크린샷/채팅에 공개하지 마세요. 서버에서 `Verify JWT`를 OFF 하더라도 서버 코드 자체의 account+token 검증과 webhook secret 검증은 그대로 유지합니다.
