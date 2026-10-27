---
title: 임시 프로젝트 정리
description: KT POTS EMS 웹 프론트엔드 분석. HttpOnly 쿠키 JWT와 서버 세션을 함께 쓰는 인증 구조, STOMP 웹소켓 스냅샷을 Recoil로 뿌리는 실시간 알람 구조를 코드 분석과 로컬 서버 테스트로 정리했다.
date: "2026-10"
tags:
  - React
  - TypeScript
  - Recoil
  - React Query
  - STOMP
  - JWT
status: wip
org: 회사
draft: true
---

## 배경

KT POTS EMS 웹 프론트엔드(`nec-web`)를 처음 맡으면서 구조를 파악한 기록이다. 가장 먼저 인증 흐름을, 그다음 이 시스템의 핵심 기능인 실시간 알람을 정리했다. 코드만으로는 확정할 수 없는 부분은 로컬 서버(`localhost:3000`)에 실제로 요청을 보내 확인했다.

---

## 프로젝트 개요

### 무엇을 하는가

KT POTS(일반 전화망) 장비 관리용 EMS 웹 프론트엔드다. 장비·클러스터·호스트 모니터링, 실시간 알람, 통계, 설정, 보안/이력 관리를 한다.

### 기술 스택

| 영역 | 사용 기술 |
| --- | --- |
| 기반 | React 18 + TypeScript, CRA + craco (esbuild 로더) |
| 상태 관리 | 서버 상태 react-query / 전역 상태 Recoil |
| UI | Kendo React + styled-components |
| 시각화 | 차트 echarts, 토폴로지 cytoscape |
| 실시간 | STOMP over WebSocket |
| 다국어 | i18next |

### 전체 흐름

```text
index.tsx → i18n / QueryClient / RecoilRoot → App
  App → Router → PotsRoute
  PotsLayout (로그인 후 공통)
   ├─ 알람 훅 4개 실행 (소켓 구독 포함)
   ├─ PotsMenu / PotsHeader / PotsContent(<Outlet>)
   └─ PotsPanelAlarmList (항상 떠 있음)
```

### 메뉴 라우트

| 경로 | 내용 |
| --- | --- |
| `/main` | 대시보드 (토폴로지, 트래픽, 클러스터, 호스트) |
| `/alarm` | 알람 관리 |
| `/statistics` | 통계 |
| `/config` | 설정 |
| `/security` | 보안 (사용자/권한/IP) |
| `/historyManagement` | 이력 관리 |

### 백엔드 프록시 (개발용 `setupProxy.js`)

백엔드가 기능별 서비스로 나뉘어 있어서, 개발 서버에서 경로별로 다른 포트로 프록시한다.

| 경로 | 포트 |
| --- | --- |
| `/api` | 28741 |
| `/history` | 28777 |
| `/trace` | 28745 |
| `/stat` | 28747 |
| `/prov` | 28751 |
| `/axis` | 9090 |

---

## 인증

결론부터 말하면, 이 시스템은 JWT를 쿠키에 담아 쓰지만 **인증 유지와 만료는 백엔드 세션이 결정한다.** 토큰은 "누구인지"만 알려주고, "지금 로그인 중인지"는 서버가 따로 확인한다. 프론트 코드만 보면 토큰을 다루는 곳이 거의 없어서 세션 방식처럼 보였는데, git 이력을 따라가 보니 JWT를 HttpOnly 쿠키로 주고받는 구조였다.

| 항목 | 상태 | 근거 |
| --- | --- | --- |
| 토큰 형식 | JWT (HS512) | 쿠키 값 디코딩 |
| 토큰 내용 | 아이디(`sub`)만, 만료(`exp`) 없음 | 디코딩 결과 |
| 재로그인 시 토큰 | 매번 동일 | 두 번 로그인해 값 비교 |
| 쿠키 수명 | 세션 쿠키 (만료 시간 없음) | `Set-Cookie` 헤더 |
| 쿠키 속성 | `HttpOnly` 있음 / `Secure`·`SameSite` 없음 | `Set-Cookie` 헤더 |
| 인증 유지·만료 | 백엔드 세션이 관리 | 로그아웃 후 401 테스트 |

### 1. 토큰 구조 — 쿠키에 담긴 JWT

로그인하면 서버가 `auth-token` 쿠키로 JWT를 내려준다. 프론트엔드는 토큰 값을 읽지 않고, 브라우저가 매 요청에 쿠키를 자동으로 실어 보낸다(`withCredentials: true`).

```text
// 쿠키 값을 디코딩한 결과
Header  : { "typ": "JWT", "alg": "HS512" }
Payload : { "iss": "nes-api", "sub": "<userId>" }
Cookie  : auth-token=<…>; path=/; HttpOnly   // Max-Age·Expires 없음 → 세션 쿠키
```

- **토큰 자체는 만료되지 않는다.** `exp`도 `iat`도 없어서, 서명 키가 바뀌지 않는 한 토큰은 계속 유효하다.
- **로그인할 때마다 같은 토큰이 나온다.** 담긴 정보가 사용자 아이디뿐이라, 시간을 두고 두 번 로그인해 봐도 값이 완전히 같았다.
- **쿠키는 브라우저를 닫으면 사라진다.** 만료 시간이 없는 세션 쿠키이고, 로그아웃 시에는 서버가 `Max-Age=0`으로 즉시 삭제한다.

프론트가 토큰을 직접 다루지 않는 지금 구조는 2026년 1월 리팩터링에서 만들어졌다.

| | 변경 전 | 변경 후 |
| --- | --- | --- |
| 토큰 획득 | 로그인 응답 헤더 `authorization`에서 꺼내 저장 | 서버가 `Set-Cookie`로 설정 |
| API 요청 | 요청 인터셉터가 `Authorization: Bearer {token}` 첨부 | `withCredentials`로 쿠키 자동 첨부 |
| 웹소켓 | connect 시 토큰 전송 | 쿠키 자동 첨부 |
| 로그인 여부 판단 | 저장된 토큰이 비어 있으면 `/login`으로 이동 | 제거 (서버 401에 맡김) |

`localStorage`의 `auth`에는 사용자 정보(username 등)만 들어 있고, `package.json`에 남아 있는 `jwt-decode`는 사실상 쓰이지 않는 의존성이다. 이력 전체에서 refreshToken / accessToken을 나눠 쓴 적도 없다. 토큰은 처음부터 하나뿐이었다.

### 2. 인증 모델 — 서명과 세션을 둘 다 본다

핵심은 서버가 요청마다 **"토큰 서명이 맞는가"와 "지금 로그인 명단에 있는가"를 둘 다 확인한다**는 점이다.

{% steps %}
{% step title="로그인 — POST /api/v1/auth" %}
성공하면 서버가 HttpOnly 쿠키로 JWT를 발급하고, 서버 세션(로그인 명단)에 등록한다. 이후 WebSocket(STOMP)을 연결한다.
{% /step %}
{% step title="요청마다 검증" %}
① 쿠키의 토큰 서명을 확인하고 ② 그 사용자가 서버 세션에 있는지 확인한다. 둘 중 하나라도 아니면 401.
{% /step %}
{% step title="중복 로그인 — 402" %}
이미 접속 중이면 402가 온다. 사용자 확인을 받은 뒤 `/user/kill/{id}`로 기존 세션을 끊고 재접속한다.
{% /step %}
{% step title="로그아웃 — DELETE /user/logout" %}
서버 세션에서 제거하고 쿠키를 삭제한다. 이후 같은 토큰은 거부된다.
{% /step %}
{% step title="원격 로그아웃 — WebSocket /topic/kill" %}
동일 아이디 접속(type 1), 비밀번호 변경(type 3), 관리자 강제 로그아웃(type 4) 시 서버가 밀어내고 클라이언트가 자동 로그아웃한다.
{% /step %}
{% step title="세션 만료 — 401" %}
axios 응답 인터셉터가 401을 받으면 WebSocket을 끊고 `/login`으로 이동한다.
{% /step %}
{% /steps %}

{% callout type="info" title="토큰은 출입증, 세션은 근무자 명단" %}
토큰은 이름만 적힌 출입증이고, 실제 통과 여부는 경비실의 "근무 중 명단"이 정한다. 출입증 자체에는 유효기간이 없어도, 명단에서 빠지면 들어갈 수 없다. 그래서 순수한 무상태 JWT가 아니라 JWT + 서버 세션의 혼합형이다.
{% /callout %}

### 3. 로그인 — `PotsLogin` → `useLogin`

`POST /api/v1/auth`에 `{ name, pass }`를 보내고, 응답 상태 코드에 따라 분기한다.

```text
POST /api/v1/auth { name, pass }
 ├─ 200 → login(): localStorage 'auth'에 사용자 정보 저장
 │        ├─ currType === 'true' (초기 비밀번호) → 비밀번호 변경 모달 열고 중단
 │        └─ STOMP 클라이언트 생성·activate
 │           → react-query 캐시와 전역 변수에 저장
 │           → recoil-persist 초기화 → /main 이동
 ├─ 401 → "비밀번호 불일치" 토스트
 ├─ 402 → "이미 로그인됨, 끊고 재접속?" 확인
 │        → DELETE /user/kill/{id} → { duplicate: true }로 다시 로그인
 ├─ 403 → 로그인 실패 문의 안내
 ├─ 406 → currType === 'true' : 비밀번호 변경 필요 → currentUser{ userId, crypto } 저장 후 변경 모달
 │        chgTerm === 'true'  : 비밀번호 유효기간 만료 → 변경 모달
 │        그 외               : 접근이 허용되지 않은 IP
 └─ 500 → 서버 에러 토스트
```

비밀번호 변경 모달은 서버가 내려준 `crypto` 값을 함께 `/user/changePassword`로 보낸다.

### 4. 페이지 접근 권한 — `AuthRedirect`

클라이언트에서 로그인 여부를 따로 검사하지 않는다. 대신 `GET /menu`를 호출해서 서버 응답으로 판단한다.

- 쿠키가 없거나 세션이 끝났으면 401이 오고, 5번의 응답 인터셉터가 `/login`으로 보낸다.
- 성공하면 현재 경로가 허용된 메뉴 목록에 있는지 `matchPath`로 확인하고, 없으면 첫 번째 허용 메뉴로 리다이렉트한다.

로그인 여부와 메뉴 권한을 API 한 번으로 같이 확인하는 셈이다.

### 5. API 요청 중 세션 만료 — `lib/api.ts` 응답 인터셉터

| 응답 | 처리 |
| --- | --- |
| 401 | 플래그로 알림을 한 번만 띄우고 → 웹소켓 연결 해제 → `logout()` → `localStorage`에 401 에러 표시 → `/login` 이동 |
| Network Error | alert 후 새로고침 |
| 5xx | `api-error-toast` 이벤트 발행 → `App`에서 받아 토스트 표시 |

### 6. 웹소켓 연결과 원격 로그아웃

로그인 직후나 새로고침 시 `useSocketInitSubscription`이 실행된다. react-query 캐시에 소켓이 없으면 새로 연결한다.

`/topic/kill`로 온 메시지의 `value`가 내 username이면 알림을 띄우고 `logout()`한다.

| type | 사유 |
| --- | --- |
| 1 | 다른 곳에서 같은 아이디로 접속 |
| 3 | 비밀번호 변경 |
| 4 | 관리자 강제 로그아웃 |

### 7. 로그아웃 — `PotsLogoutButton` → `useLogout`

{% steps %}
{% step title="확인" %}
사용자에게 로그아웃 여부를 확인받는다.
{% /step %}
{% step title="클라이언트 상태 정리" %}
recoil-persist 저장값을 지운다.
{% /step %}
{% step title="서버 로그아웃" %}
`DELETE /user/logout`을 호출해 서버 세션에서 제거하고, 응답의 `Set-Cookie`(`Max-Age=0`)로 쿠키를 삭제한다.
{% /step %}
{% step title="마무리" %}
성공하면 `logout()`(localStorage `auth` 삭제 → `/login` 이동)을 실행하고, react-query에서 소켓 쿼리를 제거한다.
{% /step %}
{% /steps %}

### 8. 검증 테스트 — 로그아웃한 토큰은 정말 막히는가

토큰에 만료가 없고 로그인할 때마다 같은 값이 나온다면, 로그아웃한 뒤에도 그 토큰으로 계속 요청할 수 있는 건 아닌지 의심스러웠다. 로컬 서버에 쿠키를 직접 실어 요청을 보내 확인했다.

```bash
# 로그아웃된 토큰으로 메인 API 호출
curl -H "Cookie: auth-token=<로그아웃 전에 받은 토큰>" \
     http://localhost:3000/api/v1/menu
```

| 상황 | 대상 | 결과 | 판정 |
| --- | --- | --- | --- |
| 쿠키 없음 | `/api/v1/menu` | 401 | 정상 |
| 유효한 토큰 | `/api/v1/menu` | 200 | 정상 |
| 로그아웃 후 같은 토큰 | `/api/v1/menu` | 401 | 차단됨 ✅ |
| 로그아웃 후 같은 토큰 | `/api/v1/statistics` | 401 | 차단됨 ✅ |
| 로그아웃 응답 | `/user/logout` | `Set-Cookie`로 삭제 | 정상 |

메인 API(`/api/v1/*`)는 로그아웃하면 같은 토큰이어도 더 이상 통하지 않는다. 토큰에 만료가 없어도 서버 세션이 막아주고 있어서, 로그아웃이 실제로 동작한다.

{% callout type="warning" title="아직 확인하지 못한 부분" %}
통계(`/stat`)·이력(`/history`)처럼 별도 백엔드 서비스는 요청 본문 검증에서 먼저 400이 나서 세션 검증까지 테스트하지 못했다. 이 서비스들도 같은 세션 검증을 하는지는 백엔드 확인이 필요하다.
{% /callout %}

### 9. 눈여겨볼 점

- **`/cytoscape` 라우트에는 `AuthRedirect`가 없다.** 다른 페이지와 달리 메뉴 권한 확인을 거치지 않는다.
- **통계 API는 프론트의 401 인터셉터를 거치지 않는다.** `axiosStatInstance`, `axiosStatExcelInstance`, `axiosKtamsJoinerHistory` 계열 인스턴스가 별도로 생성돼 있다. 서버는 401을 제대로 내려주지만(8번 테스트), 통계 화면에서 세션이 만료되면 로그인 화면으로 가지 않고 그냥 에러가 난다.
- **`logout()`은 클라이언트만 정리한다.** `localStorage`를 지우고 페이지를 이동할 뿐이고, 서버 세션과 쿠키 삭제는 `/user/logout` API에 맡긴다. 그래서 401 인터셉터 경로에서는 서버 로그아웃 호출 없이 클라이언트 쪽만 정리된다.
- **요청 인터셉터의 `/login` 분기는 효과가 없다.** 어느 경우든 `config`를 그대로 반환하는 코드만 남아 있다. 토큰 첨부 로직이 빠지면서 껍데기만 남은 것으로 보인다.
- **사용자 정보의 출처는 `localStorage`다.** 다른 화면에서 쓰는 사용자 정보는 `getLocalAuth()`로 `auth`에서 읽고, 웹소켓 구독 경로(`/user/{userId}/...`)도 이 값으로 만든다.

### 10. 보안 관점에서 검토할 것

| 구분 | 내용 |
| --- | --- |
| 검토 | 토큰에 `exp`가 없다. 세션 검증이 빠진 API가 하나라도 있으면, 한 번 유출된 토큰을 그 API에 계속 쓸 수 있다. |
| 검토 | 쿠키에 `Secure`·`SameSite`가 없다. 운영이 HTTPS라면 `Secure`를, CSRF 대비로 `SameSite`를 권장한다. |
| 검토 | 운영 환경이 HTTPS가 아니면 비밀번호와 토큰이 평문으로 노출된다. 코드에 `wss` 분기가 있어 프록시 단에서 TLS를 처리하는 것으로 보인다. |
| 참고 | 통계용 axios 인스턴스는 401 인터셉터를 거치지 않아, 해당 API에서 세션이 만료돼도 로그인 화면으로 이동하지 않는다. |

**남은 확인 사항**

| 질문 | 상태 | 확인 방법 |
| --- | --- | --- |
| 통계·이력 서비스도 세션을 확인하는가 | 미확인 | 백엔드 확인 / 올바른 요청으로 재테스트 |
| 유휴 타임아웃이 있는가 (오래 두면 자동 로그아웃) | 미확인 | 백엔드 세션 TTL 정책 확인 |
| 모든 API가 세션 명단을 확인하는가 | 미확인 | 백엔드 확인 |

### 인증 관련 파일

| 파일 | 역할 |
| --- | --- |
| `lib/auth.ts` | login/logout, 사용자 정보 저장, WebSocket 전역 관리 |
| `lib/api.ts` | axios 인스턴스, 401 처리 인터셉터 |
| `lib/websocketConfig.ts` | STOMP 브로커 URL(`/api/ws`) |
| `hooks/query/pots-auth/*` | `useLogin`, `useLogout`, `useKillUser` 등 인증 API 훅 |
| `hooks/websocket/useSocketInitSubscription` | `/topic/kill` 구독 (원격 로그아웃) |
| `components/pots-common/AuthRedirect.tsx` | 메뉴 권한 기반 라우트 가드 |
| `components/pots-login/` | 로그인 화면, 비밀번호 변경 모달 |

---

## 알람

알람은 이 시스템의 핵심 기능이다. 장비에 문제가 생기면 운영자가 화면과 소리로 바로 알아채야 한다.

{% callout type="success" title="가장 중요한 파일 하나 — useSocketInitSubscription.ts" %}
`src/hooks/websocket/useSocketInitSubscription.ts`에 알람 로직의 대부분이 몰려 있다. 이 파일만 이해하면 알람의 90%를 안다.
{% /callout %}

### 1. 동작 원리 — 서버가 매번 전체를 보낸다

```text
서버 ──소켓──> [useSocketInitSubscription] ──저장──> Recoil ──구독──> 모든 화면
```

- 서버가 WebSocket(STOMP)으로 **"현재 알람 전체 스냅샷"을 통째로** 보낸다. 바뀐 것만 보내는 증분 방식이 아니다.
- 프론트는 받은 데이터를 가공해서 Recoil 전역 상태에 저장한다.
- 알람 화면들은 데이터를 직접 가져오지 않는다. 그 상태를 구독해서 보여주기만 한다.

데이터를 받는 곳이 한 군데뿐이라 흐름을 따라가기는 쉽다. 대신 서버가 매번 전체를 보내므로, 화면 상태가 꼬이면 대개 프론트보다 서버 데이터 쪽 문제다.

### 2. 구독 토픽

| 토픽 | 역할 |
| --- | --- |
| `/user/{userId}/topic/alarm` | 새 알람 (전체 스냅샷) |
| `/topic/alarm/nms-alarm` | 알람 해제 (`seq`로 제거 + 해제음 재생) |
| `/topic/kill` | 원격 로그아웃 (알람 아님, 인증 6번 참고) |

새 알람은 사용자별 토픽(`/user/{userId}/...`)으로, 해제는 전체 공용 토픽으로 온다.

### 3. 핵심 Recoil 상태 — `store/pots-current-alarm.ts`

| 상태 | 용도 |
| --- | --- |
| `allAlarmList` | 현재 알람 전체 (모니터링 화면) |
| `potsMessage` | 패널용 묶음 (건수, 최근 10개) |
| `elementAlarmSeverityList` | `{ 구성요소ID: 심각도 }` — 토폴로지 색칠 |
| `potsAudibleList` | 소리 재생 큐 |

### 4. 알람 소리

소리는 아래 세 조건을 **모두** 만족해야 울린다.

1. 가청 설정(`useFlag`)이 켜져 있다.
2. 서버가 보낸 `audibleSeq`에 포함돼 있다.
3. 아직 울리지 않은 새 알람이다.

울릴 때는 3단계로 이어서 재생한다.

```text
클러스터 음성 → 구성요소 음성 → 심각도음 (critical_clear.mp3 등)
```

{% callout type="warning" title="React 흐름 밖에서 DOM을 직접 제어한다" %}
화면에 숨겨진 `<audio id="alarm-audio">`, `<audio id="release-audio">`를 `document.querySelector`로 직접 잡아서 재생한다. React 상태와 별개로 움직이기 때문에, 이 부분을 수정할 때는 재생 순서와 중복 재생을 특히 조심해야 한다.
{% /callout %}

### 5. 알람 API

모든 응답은 `{ result, status, type, transactionID, timestamp, path }` 형태의 껍데기로 감싸져 있고, 실제 데이터는 `result` 안에 있다.

| 기능 | Method · Route | 응답 핵심 |
| --- | --- | --- |
| 현재 알람 (핵심) | `GET /api/v2/alarm/currentAlarm` | `Alarm` (`message.recent` 등) |
| 실시간 알람 | `WS /user/{id}/topic/alarm` | `Alarm` (REST와 같은 구조) |
| 실시간 해제 | `WS /topic/alarm/nms-alarm` | `{ seq, severity, ... }` |
| 이벤트 프로파일 | `GET /api/v1/eventProfile` | `AlarmEvent[]` → `{ prn: ... }`로 변환 |
| 알람 이력 | `GET /api/v1/alarm/currentAlarmHistory` | 과거 알람 배열 |
| 억제 목록 / 등록 | `GET /inhibition` · `POST /inhibition/{type}/{id}` | 억제 설정 |

현재 알람은 REST와 WebSocket이 같은 구조로 내려온다. 처음 화면을 열 때는 REST로 받고, 그 뒤로는 소켓 스냅샷으로 갱신되는 구조다.

### 6. 주요 타입

```ts
interface Message {
  recent: AlarmRecent[];          // 현재 알람 목록
  summary: Summary;               // 심각도별 개수
  audibleSeq: number[];           // 소리 울릴 seq
  elementAlarmSeverities: { elementId: number; severity: string }[]; // 토폴로지 색칠
  panelConfigTime: number;        // 패널 자동 닫힘(초)
  privateAlarm: any[];
  currentPanelAlarmList: any[];   // 패널 표시 (최대 10개)
  panelUnreadCount: number;       // 미확인
  panelAlarmCount: number;        // 중요 알람 미해지
}

interface AlarmRecent {
  seq: number;            // 고유키 (해제·확인·삭제 기준)
  severityCode: number;   // 아래 심각도 코드 표 참고
  elementId: number;
  elementName: string;
  clusterName: string;
  prn: string;            // 이벤트 코드 (eventProfile 매칭 키)
  info: string;
  audible: 'YES' | 'NO';
  checked: boolean;
  // 프론트가 eventProfile을 붙여 채우는 값
  severity?: string;
  help?: string;
  action?: string;
  sound?: boolean;
}
```

| `severityCode` | 심각도 |
| --- | --- |
| 0 | Critical |
| 1 | Major |
| 2 | Minor |
| 3 | Normal |
| 4 | Threshold |
| 9 | NotUsed |

`seq`가 알람의 고유키라서 해제·확인·삭제가 전부 이 값 기준이다. `severity`, `help`, `action`, `sound`는 서버가 주는 값이 아니라, 프론트가 `prn`으로 이벤트 프로파일을 찾아 붙여 넣는 값이다.

### 7. 알람 화면

| 화면 | URL |
| --- | --- |
| 알람 모니터링 | `/alarm` |
| 최근 알람 | `/alarm/alarm-recent` |
| 알람 이력 | `/alarm/alarm-history` |
| 패널 알람 | 라우트 없음 — `PotsLayout`에 항상 떠 있는 전역 UI |
| 토폴로지 (심각도 색칠) | `/main` |

### 8. 주의점

- **상태가 꼬이면 서버 데이터부터 의심한다.** 서버가 매번 전체 스냅샷을 보내므로, 프론트가 누적해서 생기는 꼬임보다는 서버가 보낸 값 자체의 문제인 경우가 많다.
- **타이밍 보정 코드가 많다.** "해제한 알람이 간헐적으로 다시 들어오는" 현상처럼, 스냅샷과 해제 이벤트의 도착 순서 때문에 생기는 문제를 막는 코드가 곳곳에 있다. 의도를 모르고 지우면 같은 버그가 다시 생길 수 있다.
