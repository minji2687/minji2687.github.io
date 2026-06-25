---
title: 농기계 자율주행 실시간 모니터링 시스템
description: AWS IoT Core(MQTT) 기반 농기계 GPS·센서 데이터를 실시간으로 수신해 MapLibre GL로 위치·주행 경로를 시각화하는 웹 모니터링 애플리케이션. Next.js 15, React 19 기반 단독 개발.
date: "2025-10"
tags:
  - Next.js
  - React
  - TypeScript
  - MQTT
  - AWS IoT Core
  - MapLibre GL
  - Zustand
  - NextAuth
status: active
org: 회사
featured: true
---

## 배경

긴트는 농기계 자율주행 소프트웨어를 만드는 회사다. 트랙터가 논밭을 자율로 달리는 동안 관리자가 실시간으로 위치와 장비 상태를 확인할 수 있어야 했다. 기존에는 단말기 데이터 수신 여부조차 확인하기 어려웠다.

비즈니스 플랫폼팀 프론트엔드 단독으로 기획부터 배포까지 담당했다. AWS 인프라는 백엔드팀이 구성했고, 나는 그 위에서 데이터를 받아 화면으로 만드는 역할이었다.

---

## 1. MQTT over WebSocket

농기계 단말기는 GPS, 센서 상태를 수백 ms 단위로 계속 쏜다. REST API로 폴링하면 트래픽도 많고 지연도 크다. MQTT는 IoT 환경 표준이기도 했고, 이미 백엔드가 AWS IoT Core로 구성돼 있어서 자연스러운 선택이었다.

브라우저에서 MQTT를 쓰려면 WebSocket 위에 올려야 한다. `aws-crt` 라이브러리로 AWS IoT Core에 WebSocket 연결을 맺고, Custom Authorizer 방식으로 인증했다. 클라이언트 시크릿을 브라우저 코드에 두지 않아도 되는 구조라 보안상 맞다고 판단했다.

단말기마다 토픽이 다르고, 모니터링 화면에서 구독해야 할 토픽이 GPS·상태머신·알림 등 여러 종류였다. 연결 하나를 유지하면서 토픽만 동적으로 구독·해제하는 방식으로 구성했다.

→ [MQTT over WebSocket — 브라우저에서 실시간 IoT 데이터 받기](/articles/frontend/mqtt-websocket-aws-iot)

---

## 2. JWT 쿠키 4KB 초과 → iOS 세션 버그

NextAuth JWT payload에 Cognito 토큰 3종(accessToken, idToken, refreshToken)과 DynamoDB 호출에 쓰던 AWS 임시 자격증명 3개 필드(accessKeyId, secretAccessKey, sessionToken)를 모두 담았다. API 라우트에서 `getToken()`으로 JWT를 직접 읽으면 자격증명을 바로 꺼낼 수 있어서 편했기 때문이다. 개발 환경에서는 문제없었는데 실사용 중 iOS Chrome에서 종종 세션 에러가 났다.

원인은 CloudWatch에서 찾았다. 각 토큰 자체는 크지 않지만, NextAuth는 payload 전체를 JWE(JSON Web Encryption)로 암호화해 하나의 문자열로 만든다. 이 직렬화·암호화 과정에서 원본보다 훨씬 커지고, 결국 쿠키 하나가 4KB를 초과했다. 4KB를 초과한 쿠키는 iOS Chrome에서 3개로 청킹되는데, 그 과정에서 세션이 깨지고 있었다.

해결은 JWT payload를 줄이는 것이었다. AWS 자격증명은 그때까지 API 호출마다 쿠키에서 꺼내 DynamoDB 클라이언트를 만드는 방식이었는데, 서버에 IAM Role을 부여하는 방식으로 전환해 쿠키에서 완전히 제거했다. accessToken과 idToken은 코드베이스 어디서도 직접 쓰이지 않아서 함께 제거했다. JWT에는 refreshToken과 최소한의 메타데이터만 남겼다.

→ [코드 레벨 상세](/notes/nextauth-jwt-cookie-overflow)

---

## 3. 백그라운드 탭 처리

MQTT 연결은 브라우저 탭이 백그라운드로 내려가면 끊기거나 불안정해진다. 관리자 입장에서는 탭을 잠깐 다른 곳으로 전환했다 돌아왔을 때 화면이 멈춰있으면 곤란하다.

`visibilitychange` 이벤트를 감지해 탭이 백그라운드로 내려가면 5분 타이머를 시작하고, 5분이 지나면 연결을 명시적으로 끊는다. 탭이 다시 활성화될 때 타이머를 취소하고, 연결이 끊겨있으면 재연결한다. 재연결할 때 연결만 다시 맺는 게 아니라 구독 토픽도 다시 등록해야 한다. 연결 상태와 구독 상태를 분리해서 관리했고, 재연결 흐름을 하나의 함수로 정리해 어디서든 호출할 수 있게 했다.

```ts
const handleVisibilityChange = () => {
  if (document.visibilityState === "hidden") {
    backgroundTimerRef.current = setTimeout(() => {
      disconnect().catch(console.error);
    }, 5 * 60 * 1000);
  } else if (document.visibilityState === "visible") {
    if (backgroundTimerRef.current) {
      clearTimeout(backgroundTimerRef.current);
      backgroundTimerRef.current = null;
    }
    if (!isConnected()) {
      initializeMqtt();
    }
  }
};
```

실시간 데이터를 다루는 서비스에서 "연결이 끊기는 상황"을 예외가 아닌 기본 전제로 설계해야 한다는 걸 이 과정에서 배웠다.

---

## 4. Binary 프로토콜 파싱 (AI 활용)

단말기가 데이터를 텍스트 JSON이 아닌 바이너리로 쏜다. GPS 좌표는 Int32로 인코딩되어 있고, 수신 후 1e7로 나눠야 실제 위경도가 된다. 알림 코드는 Uint8Array로 받아 DataView로 읽고, 코드에 맞는 메시지를 124개 코드 테이블에서 찾는 구조다.

바이너리 파싱은 처음 접하는 영역이었다. 프로토콜 문서를 AI에게 주고 파싱 코드를 만들었다. 내가 직접 처음부터 설계한 건 아니지만, 코드가 왜 그렇게 동작하는지는 리뷰하면서 이해했고 이후 파싱 필드가 추가될 때 직접 수정했다.

바이너리로 통신하는 이유는 데이터 크기다. 같은 데이터를 JSON으로 보내면 필드명과 구조까지 포함되어 크기가 훨씬 커진다. IoT 환경에서는 대역폭이 중요하기 때문에 바이너리가 표준처럼 쓰인다는 걸 이 프로젝트에서 처음 알았다.
