# 무명장야 · 사무전

기존 서버를 사용하는 정적 웹 게임입니다. `index.html`을 진입점으로 배포합니다.

## 파일 구성

| 파일 | 역할 |
| --- | --- |
| `index.html`, `game.css` | 화면 뼈대와 통합 스타일 |
| `game.js` | 기본 상태·게임 시계·공통 화면·초기화 |
| `config.js` | 운영 서버 설정 |
| `notifications.js` | 알림음 |
| `gameplay.js` | 전투·성장·거처·제작·계정 |
| `social.js` | 공용 교류 데이터 |
| `community.js` | 페어 게시판·텃밭·상점·푸시·중개소·PvP·저장 보호·로그 내보내기 |
| `visuals.js` | 도트 화면·생활 화면·밸런스 |
| `coop.js` | 공동 지갑·동행·공동 경매 |
| `notification-worker.js` | 웹 푸시 서비스 워커 |
| `assets/`, `sounds/` | 이미지와 효과음 |
| `supabase/functions/` | 푸시 서버 함수 |
| `scripts/` | VAPID 키 생성·건의함 Apps Script |
| `tests/` | 파일 연결·페어 저장·브라우저·전투 모형 검증 |

각 통합 JS 안의 `module:` 주석은 원래 기능의 경계입니다. `index.html`의 스크립트 순서를 유지하고, `async`·`defer`·`type="module"`을 임의로 추가하지 마세요. 함수가 같은 전역 상태와 순차적인 확장을 사용합니다. 엄격 모드가 없던 설정·알림음·교류 코드는 별도 파일로 유지했습니다.

## 배포와 서버 설정

- 저장소 전체를 배포합니다. 이전의 `part*.js`와 개별 스타일 파일은 통합 파일로 대체되었습니다.
- `config.js`의 운영 서버 주소·공개 키를 유지합니다. 서버 비밀 키는 넣지 않습니다.
- 이번 정리는 파일 구성만 변경합니다. 기존 DB·계정·공동 지갑·채팅을 삭제하거나 SQL을 실행하지 않습니다.
- 배포 뒤 페이지를 새로고침합니다. 통합 파일에는 새 캐시 버전이 지정되어 있습니다.
- 예전 안내·SQL·검증 결과는 저장소에서 정리했습니다. 신규 서버를 구축하거나 과거 설치 자료를 확인할 때에는 [정리 이전 버전](https://github.com/23342354/mumyeongjangya-game/tree/6bd6f4bc34557781092f4129675c5d600000aaf5)을 참고하세요. 초기화·전체 삭제 SQL을 운영 서버에 일괄 실행하지 마세요.

## 확인

Node.js로 `npm test`를 실행하면 JS 문법·HTML/CSS/에셋 참조·스크립트 순서·페어 저장 회귀 검증을 수행합니다. 별도 설치 없이 실행할 수 있습니다.

브라우저 검증은 `npm install`, `npx playwright install chromium` 뒤 `npm run test:browser`로 실행합니다. 테스트는 로컬 서버와 모의 응답을 사용하며 운영 서버로 요청하지 않습니다. 기존 버전과 비교하려면 `GAME_BASELINE_DIR=/path/to/old-version npm run test:browser`를 사용합니다. 준비된 Chromium을 쓸 경우 `CHROMIUM_EXECUTABLE`에 실행 파일 경로를 지정할 수 있습니다.

선택적으로 `npm run test:combat`을 실행하면 Python 전투 모형의 진행 난도 증가 조건을 확인합니다.
