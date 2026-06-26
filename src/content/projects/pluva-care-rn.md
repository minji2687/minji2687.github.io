---
title: Pluva Care — React Native 앱 유지보수 및 리팩토링
description: 농기계 원격 제어·관제 React Native 앱. 초기 유지보수를 맡아 운영하다 Cognito+AppSync 기반 구조를 JWT+WebSocket으로 전면 리팩토링. 네이버 지도 기반 지오펜스 편집, 다국어, 브랜드 분기까지 담당.
date: "2023-07"
tags:
  - React Native
  - WebSocket
  - AWS AppSync
  - GraphQL
  - Cognito
  - JWT
  - Naver Map
  - i18n
status: archived
org: 회사
featured: false
---

## 배경

긴트 입사 후 처음 맡은 프로젝트. 농기계 관제 React Native 앱으로, 트랙터 상태 실시간 수신·원격시동·지도 기반 안심구역 설정 등의 기능을 제공했다. React Native 0.66 기반 레거시 코드베이스를 유지보수하다가, 이후 인증·실시간 통신 구조를 전면 리팩토링했다.

---

## 1. Cognito → JWT 인증 전환

기존 구조는 AWS Cognito + Amplify 기반이었다. 앱 전반에 `aws-amplify` 패키지 의존성이 깔려있었고, 인증 흐름이 Cognito 방식에 맞게 얽혀 있었다.

자체 서버 JWT 방식으로 전환하면서 인증 레이어를 처음부터 새로 작성했다.

- **axios 인스턴스 구성** — `baseURL`, `withCredentials` 설정이 담긴 `axios.js`를 만들어 API 호출 전반에서 공유
- **`useAuth.js` 훅 신규 작성** — `useLogin`, `useLogout`, `useGetUserinfo` 분리. 로그인 성공 시 `accessToken`을 Authorization 헤더에 세팅하고, `refreshToken`은 AsyncStorage에 저장
- **토큰 자동 갱신** — React Query의 `refetchInterval`(57분 주기)과 `refetchIntervalInBackground: true`로 백그라운드에서도 토큰을 갱신
- **aws-amplify 패키지 완전 삭제** — 의존성 정리까지 마무리

한 번 인증 로직 전환을 시도했다가 플로우 문제로 되돌린 뒤 다시 작업했다.

---

## 2. AppSync GraphQL Subscription → WebSocket 전환

기존에는 `streamProvider.js`가 AppSync GraphQL Subscription 3개(CAN 버스 데이터, 상태 변경, API 리패치 트리거)를 싱글톤으로 유지했다. AppSync 스키마를 직접 수정해가며 wildcard 구독 등을 추가했던 이력이 있는 구조였다.

AppSync를 걷어내고 `WebSocketContext.js`를 직접 작성했다. Context API로 WebSocket 연결을 앱 전역에서 관리하고, `useWebSocket()` 훅으로 `ws` 연결 객체와 `sendMessage` 함수를 컴포넌트에 제공하는 구조로 바꿨다. `src/graphql/` 디렉토리(mutations, queries, subscriptions, streamProvider) 전체를 삭제했다.

전환 후 WebSocket 데이터를 제대로 못 받는 이슈가 있었고, 별도 커밋으로 수정했다.

→ [GraphQL Subscription 경험](/uses)

---

## 3. 네이버 지도 + 지오펜스 편집 UI

`react-native-nmap` 기반으로 트랙터 실시간 위치를 지도에 표시하고, 안심구역(지오펜스) 다각형을 직접 그리고 수정하는 편집 UI를 구현했다.

- 지도 클릭으로 마커 추가, 마커 클릭으로 선택·삭제
- 선택된 마커 하이라이팅 — 선택 마커는 불투명, 나머지는 알파 0.4로 dim 처리
- 3개 이상 마커 시 Polygon으로 폐합 표시, 편집 중엔 Path로 전환
- 수정 모드 진입 시 기존 좌표 백업, 취소 시 이전 상태로 복원

---

## 4. 브랜드 분기 (pluva / daedong)

같은 앱을 두 브랜드(Pluva Care, 대동커넥트)로 배포하는 구조였다. `environment.js`에서 빌드 환경별로 `brand` 값을 내보내고, 컴포넌트 곳곳에서 `brand === 'pluva'` 분기로 아이콘·이미지·일부 동작을 달리 처리했다. `buildConfig/` 디렉토리에 브랜드별 `.env`와 Google 서비스 파일을 분리해 관리했다.

---

## 5. 다국어 (i18n-js + react-native-localize)

`react-native-localize`로 기기 언어를 감지해 자동 적용하는 구조다. 지원 언어를 못 가져오는 예외 케이스에서는 한국어를 기본값으로 fallback 처리했다. 텍스트 포맷이 필요한 경우 `react-string-format`으로 파라미터를 주입했다.

---

## 6. 유지보수 중 처리한 주요 이슈

- **원격시동 중복 클릭**: 처리 중 버튼 비활성화로 중복 요청 방지
- **지도 렌더링**: 배경 화면 미표시, 렌더링 중간 끊김 현상 개선
- **뒤로가기 탭 간 공유 이슈**: 내비게이션 구조 정리로 해결
- **자동로그인 시 로그인 화면 순간 노출**: 인증 상태 체크 타이밍 수정
