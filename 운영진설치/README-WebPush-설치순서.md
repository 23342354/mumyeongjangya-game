# 無明長夜 · 사이트가 닫혀 있어도 도착하는 푸시 알림 설치

대상: `https://ignorance.site/` / GitHub Pages + Supabase / 사무전 자체 계정

> **중요**: GitHub Pages에 파일만 올리는 것으로는 종료 상태 알림이 도착하지 않습니다. 이 안내서의 **SQL → 서버 비밀키 → Edge Function → Database Webhook → Cron → 사이트 배포 → 수신 허용**을 모두 진행해야 합니다. 실제 서비스에서 적용 전 Supabase DB 및 GitHub 저장소를 백업하세요. 이번 코드는 운영 서버에 자동 설치되지 않았습니다.

## 1. 사이트와 DB 백업

- GitHub 저장소의 기존 웹사이트 파일과 운영 중인 `config.js`를 백업합니다.
- Supabase 기존 데이터베이스의 백업을 확인합니다.
- 주소창에서 `https://ignorance.site/`가 유효한 HTTPS로 열리는지 확인합니다.
- Supabase 프로젝트의 실제 URL과 브라우저용 anon/publishable 키는 **기존 `config.js`에서 그대로 사용**합니다. 새 버전 ZIP에 `config.js`를 넣지 않은 이유는 운영 연결 정보를 덮어쓰지 않기 위해서입니다.

## 2. SQL 적용

Supabase 대시보드 → **SQL Editor → New query**에서 먼저 `운영진설치/WebPush-데이터베이스.sql` 전체를 실행합니다.

이 SQL은 푸시 구독(기기별), 수신자별 알림, 텃밭·수업·연구·의뢰 예약표와 기존 페어·RP·거래 이벤트에 연결하는 트리거를 추가합니다. 원래 데이터는 삭제하지 않습니다. 기존 RP 답글 알림을 아직 설치하지 않았다면 `RP-답글알림-업데이트.sql`을 먼저 실행하세요. (후에 설치하면 WebPush-데이터베이스.sql을 재실행하여 RP 트리거를 연결하세요.)

### 안전 확인

실행이 성공하면 다음 테이블이 생겨 있습니다:
- `mm_push_subscriptions`
- `mm_push_events`
- `mm_push_farm_due`
- `mm_push_timer_due`

이 테이블은 사이트 방문자에게 직접 공개하지 않습니다. 접근은 계정 검증이 있는 Edge Function으로만 합니다.

## 3. 운영진 PC에서 VAPID 키 생성

Windows에서 Node.js가 설치되어 있다면 `Node-VAPID키생성.cjs`가 있는 폴더에서 다음을 실행합니다:

```powershell
node "Node-VAPID키생성.cjs"
```

출력된 공개키와 개인키 두 개를 **Supabase → Edge Functions → Secrets**에 각각 입력합니다.

| Secret 이름 | 입력할 값 |
| --- | --- |
| `MMJY_VAPID_PUBLIC_KEY` | 생성된 공개키 |
| `MMJY_VAPID_PRIVATE_KEY` | 생성된 개인키 |
| `MMJY_VAPID_SUBJECT` | `https://ignorance.site` |
| `MMJY_PUSH_WEBHOOK_SECRET` | 32자 이상 무작위 비밀 문자열 |

Webhook 비밀값은 예를 들어 `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`로 생성하세요. `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`는 Supabase가 Edge Function 환경에 자동 제공하는 값으로 사용합니다. Supabase에서 비밀키 이름을 `SUPABASE_`로 새로 등록하면 안 됩니다.

**VAPID 개인키와 Webhook 비밀값은 GitHub, `config.js`, HTML, 블로그, 채팅에 올리지 마세요.** 사용자가 볼 수 있는 공개키는 사이트로 전달해도 됩니다. 개인키는 유실하면 기존 브라우저의 푸시 구독을 재설정해야 할 수 있습니다.

## 4. Supabase Edge Function 배포

서버 설치 ZIP의 `supabase/functions/samu-push/index.ts`가 서버 함수 코드입니다. 아래 두 가지 중 편한 방법을 택합니다.

**방법 A: Supabase Dashboard**

1. Supabase 프로젝트 → **Edge Functions → Deploy a new function → Via Editor**에서 `samu-push`라는 함수를 만듭니다.
2. 기본 코드를 지우고 `supabase/functions/samu-push/index.ts`의 내용을 통째로 붙여 넣습니다.
3. 함수를 배포한 후 **Verify JWT를 OFF**로 전환합니다. 자체 사무전 계정으로 요청을 검증하고, 발송용 Webhook도 별도의 비밀 헤더를 검사하기 때문에 Supabase Auth JWT를 사용하지 않습니다.
4. Function URL은 아래 형식입니다: `https://<프로젝트-ref>.supabase.co/functions/v1/samu-push`

**방법 B: Supabase CLI**

`supabase` CLI 로그인 및 프로젝트 연결을 마친 뒤 서버 설치 ZIP 폴더에서:

```sh
supabase functions deploy samu-push --no-verify-jwt
```

`supabase/config.toml`에도 `verify_jwt = false` 설정이 들어 있습니다. 함수는 DB를 직접 읽지 않고 Supabase service-role 클라이언트를 이용합니다. URL 및 서비스 비밀키는 브라우저에 노출되지 않습니다.

### 함수 간단 확인

위 함수 URL에 POST로 `{"action":"public-key"}`를 전송하면 `ready:true`와 VAPID `publicKey`가 반환되어야 합니다. 브라우저 계정 구독 버튼은 실제 비밀키가 준비되기 전에는 동작하지 않습니다.

## 5. Database Webhook 등록 (매우 중요)

**Supabase → Database → Webhooks → Create a new webhook**로 들어가 아래대로 설정합니다.

| 설정 | 값 |
| --- | --- |
| Name | `mmjy_webpush_events` |
| Schema / Table | `public` / `mm_push_events` |
| Events | **INSERT**만 |
| Type of webhook | Supabase Edge Functions (또는 HTTP Request) |
| Edge Function | `samu-push` |
| HTTP Method | `POST` |
| HTTP URL (직접 입력 방식) | `https://<프로젝트-ref>.supabase.co/functions/v1/samu-push` |
| Header `Content-Type` | `application/json` |
| Header `x-mmjy-push-secret` | 3단계의 `MMJY_PUSH_WEBHOOK_SECRET`과 **동일한 값** |

커스텀 헤더 추가 기능을 사용해 `x-mmjy-push-secret`을 직접 설정하세요. Secret 값이 다르면 Edge Function이 401 응답을 돌려줍니다. Webhook은 DB에 알림 이벤트가 INSERT될 때 서버 발송을 시작하는 역할을 합니다. 원문 채팅 내용은 서버 푸시 본문에 포함하지 않고 '새 메시지'로만 표시됩니다.

※ `Verify JWT=OFF`라도 **외부인이 알림을 임의 발송할 수 있도록 공개한 것은 아닙니다**. 이벤트 발송은 서버 비밀 헤더가 있어야 하며, 브라우저 구독/해제/내역은 계정 ID와 토큰을 확인합니다. 토큰은 HTTPS로만 전송합니다.

## 6. 텃밭·수업·연구·의뢰 예약 알림 켜기

Supabase Dashboard → **Integrations → Cron** (또는 Database → Extensions의 `pg_cron`)에서 pg_cron을 활성화합니다. 그 다음 **SQL Editor**에서 `운영진설치/WebPush-텃밭-예약실행.sql`을 실행합니다.

분 단위로 예정 시각을 확인합니다. 실제 발송 시각은 Cron 실행·Push 서비스·기기 상태에 따라 몇 초에서 수 분 이상 차이가 날 수 있습니다. 텃밭은 **기존 계정 저장본에 기록된 심기·비료 후 성장 완료 예정 시각**을 기준으로 합니다. 오프라인 푸시를 켠 뒤에 심은 작물부터 가장 안정적으로 동작합니다.

**확인 쿼리 (SQL Editor):**

```sql
select jobname,schedule,command from cron.job where jobname='mmjy-push-farm-minute';
```

## 7. GitHub Pages 사이트 파일 업로드

별도로 제공한 `무명장야-사무전-WebPush-사이트배포용.zip`을 압축 해제하고 **기존 GitHub Pages 사이트 루트**에 내용을 추가/덮어씁니다.

- `index.html`, `part12.js`, `part11.js` 등 기존 JS 전체는 함께 배포합니다.
- **추가 필수 파일:** `notification-worker.js`, `manifest.webmanifest`, `part12.js`.
- **운영 중인 `config.js`는 덮어쓰지 마세요.** 사이트 ZIP에는 포함하지 않았습니다.
- 서버 SQL, VAPID 생성기, Edge Function 소스는 사이트 ZIP에서 제외했습니다.
- 배포 후 브라우저에서 `Ctrl + Shift + R`로 강력 새로고침하고, `https://ignorance.site/notification-worker.js`와 `https://ignorance.site/manifest.webmanifest`가 열리는지 확인합니다.

## 8. 러너가 Web Push를 켜는 방법

1. 사무전 로그인 → **상단 종 모양 알림 아이콘**을 엽니다.
2. **사이트를 닫아도 받는 알림 · Web Push → 푸시 알림 켜기** 클릭.
3. 브라우저에서 `허용` 선택. 같은 화면의 **서버 시험 발송**을 눌러 실제 수신 확인.
4. 탭을 닫은 후 다른 계정으로 페어 채팅이나 RP 답글을 보내 수신되는지 확인합니다.

수신 항목을 체크박스로 변경하거나 **이 기기에서 끄기**로 해제할 수 있습니다. 브라우저/기기별로 한 번씩 구독해야 합니다.

**iPhone/iPad**: Safari에서 사이트를 연 뒤 **공유 → 홈 화면에 추가**, 생성된 홈 화면 아이콘으로 실행하고 알림 허용을 진행합니다. iOS의 Web Push는 홈 화면에 추가한 웹앱에서 지원됩니다(지원 운영체제 버전 및 알림 권한 필요). Android/PC도 브라우저·OS 알림 설정에 따라 달라집니다.

### 푸시가 안 온다면

- `https://` 접속인지 확인하고, 기기에서 브라우저/홈 화면 웹앱의 알림을 허용합니다.
- Supabase Secrets 4개와 `samu-push`의 Verify JWT OFF를 재확인합니다.
- `mmjy_webpush_events` Database Webhook의 Table/INSERT 및 `x-mmjy-push-secret` 값이 일치하는지 확인합니다.
- Edge Functions → `samu-push` → **Logs**와 Database → Webhooks → Delivery History를 확인합니다.
- `Web Push`를 껐다가 다시 켜고 **서버 시험 발송**을 다시 실행합니다.
- 텃밭이 울리지 않을 때는 `cron.job`에서 예약 작업이 있는지, `mm_push_farm_due`에 해당 계정의 성장 예정 기록이 저장되었는지 확인합니다. 실제 계정 내용은 다른 러너에게 보여 주지 마세요.
- Safari/Chrome을 완전히 강제 종료하거나 기기의 배터리 절약·알림 차단 정책이 활성화된 경우 알림이 지연되거나 오지 않을 수 있습니다. 브라우저가 수신을 무조건 보장하는 기능은 아닙니다.

## 9. 현재 구현한 알림 범위

- **페어/1:1 채팅**: 다른 러너가 메시지를 보냈을 때
- **RP 게시판**: 운영 중인 `rp_reply_alerts` 서버 알림 테이블에 기록되는 답글
- **페어 신청/수락, 인연/관계 요청**: 서버에 상태 변경 기록이 남을 때
- **중개소**: 내 매물의 판매 완료
- **텃밭**: 작물 완료 시각 / 서버 분 단위 검사
- **수업·연구·의뢰**: 서버에 동기화된 예정 종료 시각 알림 (실제 결과 정산은 사이트에서)

**제한**: 러너가 로그인하지 않았거나 알림 구독을 켜지 않은 경우 푸시가 오지 않습니다. GitHub Pages 자체에는 알림 발송 기능이 없습니다. 서버 설치와 실제 복수 계정 테스트가 완료되기 전까지 운영상 정상 발송을 확정할 수 없습니다. 기존 사무전 데이터와 진행도는 초기화하지 않습니다.
