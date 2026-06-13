---
title: "MQTT over WebSocket — 브라우저에서 실시간 IoT 데이터 받기"
description: "농기계 자율주행 모니터링 프로젝트에서 AWS IoT Core + MQTT를 브라우저에 연결한 과정. MQTT가 뭔지, 왜 WebSocket이 필요한지, Custom Authorizer로 어떻게 인증하는지 실제 코드 기반으로 정리한다."
date: "2026-06-13"
category: "Frontend"
tags: ["MQTT", "WebSocket", "AWS IoT Core", "실시간", "IoT"]
featured: true
---

# MQTT over WebSocket — 브라우저에서 실시간 IoT 데이터 받기

농기계 자율주행 모니터링 시스템을 만들면서 MQTT를 처음 써봤다. 트랙터가 논밭을 달리는 동안 GPS 좌표와 센서 상태를 브라우저에서 실시간으로 받아야 했다. HTTP 폴링은 안 된다는 건 알겠는데, MQTT가 정확히 뭔지, 브라우저에서 어떻게 쓰는 건지 처음엔 잘 몰랐다. 프로젝트 코드 기반으로 정리한다.

---

## MQTT가 뭔지

**MQTT(Message Queuing Telemetry Transport)** 는 IoT 환경을 위해 설계된 경량 메시지 프로토콜이다. 핵심 개념은 **발행/구독(pub/sub)** 패턴이다.

HTTP는 클라이언트가 요청해야 서버가 응답한다. 새 데이터가 있는지 확인하려면 계속 물어봐야(폴링) 한다. 농기계 GPS처럼 200ms마다 데이터가 오는 경우엔 200ms마다 HTTP 요청을 날려야 하는데, 트래픽이 폭발하고 지연도 생긴다.

MQTT는 반대다. 데이터를 보내는 쪽(단말기)이 **토픽**에 **발행(publish)** 하면, 그 토픽을 **구독(subscribe)** 하고 있는 쪽(브라우저)이 자동으로 받는다. 폴링 없이 데이터가 오는 즉시 받는다.

```
단말기 → publish("pvat/v1/ABC123/upload/gps", GPS데이터)
브라우저 ← subscribe("pvat/v1/ABC123/upload/gps") → 자동 수신
```

토픽은 슬래시로 구분되는 경로 형태다. 이 프로젝트에서는 `pvat/v1/{productKey}/...` 패턴을 썼는데, `productKey`가 농기계 고유 ID다. 토픽에 장비 ID가 들어가기 때문에 특정 트랙터의 데이터만 구독할 수 있다.

실제 코드에서 토픽은 이렇게 생겼다:

```ts
// 단말기가 발행하는 토픽 (upload)
export const gpsTopic = (productKey: string) =>
  `pvat/v1/${productKey}/upload/gps`;

export const stateMachineTopic = (productKey: string) =>
  `pvat/v1/${productKey}/upload/state-machine`;

// 브라우저가 발행하는 토픽 (제어 명령, sreq = send request)
export const resetAllTopic = (productKey: string) =>
  `pvat/v1/${productKey}/sreq/reset`;

// 단말기가 명령에 응답하는 토픽 (sres = send response)
export const vehicleConfigTopic = (productKey: string) =>
  `pvat/v1/${productKey}/sres/vehicle-conf`;
```

`upload`는 단말기가 올리는 데이터, `sreq`는 브라우저가 보내는 제어 명령, `sres`/`cres`는 단말기의 응답이다. 토픽 이름에 방향과 역할이 담겨있다.

---

## 그냥 WebSocket 쓰면 안 되나

WebSocket도 실시간 양방향 통신이 된다. 그러면 굳이 MQTT를 쓰는 이유가 뭘까.

WebSocket은 **연결만** 해준다. 뭔 데이터가 오든 `onmessage` 하나로 다 들어온다. GPS인지 알림인지 상태 변경인지 직접 파싱해서 분기해야 한다. 장비가 여러 대고 데이터 종류도 많으면 이 분기 로직이 복잡해진다.

MQTT는 **토픽이 라우터 역할**을 한다. GPS 토픽을 구독하면 GPS만 오고, 알림 토픽을 구독하면 알림만 온다. 받는 쪽에서 데이터 종류를 판단할 필요가 없다.

```
WebSocket만 쓰면:
  단말기 → 서버 → onmessage() → "이게 GPS야? 알림이야? 어떤 장비 거야?" 직접 파싱

MQTT 쓰면:
  단말기 → publish("ABC123/upload/gps")   → GPS 콜백만 실행
  단말기 → publish("ABC123/noti/message") → 알림 콜백만 실행
```

그리고 이 프로젝트에서 **가장 실질적인 이유**가 있다. 백엔드가 이미 AWS IoT Core로 구성돼 있고, AWS IoT Core는 MQTT 브로커다. 브라우저가 순수 WebSocket을 쓴다면 중간에 "MQTT → WebSocket 변환 서버"를 따로 만들어야 한다. MQTT over WebSocket을 쓰면 브라우저가 AWS IoT Core에 직접 붙을 수 있다. 서버가 하나 줄어든다.

## WebSocket과 MQTT는 다른 층에 있다

헷갈리기 쉬운 부분이다. WebSocket과 MQTT는 대체재가 아니다.

- **WebSocket** = 전화선. 연결만 해준다. 뭘 주고받든 상관없다.
- **MQTT** = 전화 통화 규칙. 누가 어떤 채널로 말하고 누가 듣는지 정한다.

MQTT over WebSocket은 전화선(WebSocket)으로 연결하되, 통화 규칙(MQTT)대로 주고받는 것이다. 둘이 같이 쓰이는 개념이지 하나를 고르는 게 아니다.

### 토픽은 URL이다

MQTT 토픽 구조를 보면 REST API 경로랑 비슷하다.

```
REST API:   GET /api/v1/ABC123/gps
MQTT 토픽:      pvat/v1/ABC123/upload/gps
```

둘 다 슬래시로 계층을 나누고, 장비 ID(`ABC123`)가 중간에 들어가서 특정 장비 데이터만 지정할 수 있다. 차이는 REST API는 내가 요청해야 데이터가 오고, MQTT 토픽은 구독하면 데이터가 생길 때 자동으로 온다.

### WebSocket만 쓰면 라우팅을 직접 구현해야 한다

WebSocket으로만 실시간 데이터를 받으면, 서버가 `action` 같은 필드를 붙여서 내려보내고 프론트가 switch문으로 직접 분기해야 한다.

```ts
// 서버가 action 필드를 붙여서 내려보냄
// { action: 'canData', data: {...} }
// { action: 'connection', data: {...} }

wsService.addMessageListener(data => {
  const parseData = JSON.parse(data);
  switch (parseData.action) {
    case 'canData':
      handleCanData(parseData.data);
      break;
    case 'connection':
      handleConnection(parseData);
      break;
  }
});
```

MQTT를 쓰면 토픽 자체가 분기 역할을 한다. switch문 없이 구독한 토픽에 맞는 콜백만 실행된다.

```ts
// 토픽이 라우터 역할을 함
subscribe("pvat/v1/ABC123/upload/gps", handleGps);
subscribe("pvat/v1/ABC123/noti/message", handleNotification);
```

| | WebSocket + 서버 분류 | MQTT 토픽 |
|---|---|---|
| 누가 분류 | 서버(action 필드 부착) | AWS IoT Core(토픽) |
| 프론트 코드 | switch문 | 토픽별 콜백 |
| 변환 서버 필요 여부 | 필요 | 불필요 |

---

## 왜 WebSocket 위에 올려야 하나

MQTT는 원래 **TCP** 위에서 동작한다. 근데 브라우저는 TCP를 직접 열 수 없다. 보안 정책상 브라우저에서 열 수 있는 외부 연결은 HTTP와 WebSocket뿐이다.

그래서 브라우저에서 MQTT를 쓰려면 WebSocket을 터널로 쓰는 방식이 필요하다. 이걸 **MQTT over WebSocket**이라고 한다. MQTT 메시지를 WebSocket 프레임 안에 담아서 주고받는다.

```
브라우저 ──WebSocket──► AWS IoT Core ──MQTT──► 단말기
```

단말기는 순수 TCP MQTT를 쓰고, 브라우저는 WebSocket 위의 MQTT를 쓴다. 중간의 AWS IoT Core가 두 가지를 모두 받아서 라우팅해준다.

코드에서:

```ts
const config =
  iot.AwsIotMqttConnectionConfigBuilder.new_builder_for_websocket()
    .with_use_websockets()   // WebSocket 사용 선언
    .with_endpoint(MQTT_ENDPOINT)
    .with_keep_alive_seconds(30)
    .build();
```

`.with_use_websockets()`가 "나는 WebSocket으로 연결할게"라는 설정이다.

---

## AWS IoT Core가 하는 일

**AWS IoT Core**는 이 구조에서 **MQTT 브로커** 역할을 한다. 브로커는 발행자와 구독자 사이에서 메시지를 중개하는 서버다.

단말기도 AWS IoT Core에 연결하고, 브라우저도 AWS IoT Core에 연결한다. 단말기가 GPS 토픽에 발행하면, AWS IoT Core가 같은 토픽을 구독 중인 브라우저에게 전달한다. 둘이 직접 연결하는 게 아니다.

```
트랙터 단말기
    │ publish(gps topic)
    ▼
AWS IoT Core ─── MQTT 브로커
    │ forward
    ▼
브라우저 (구독 중)
```

AWS가 브로커를 직접 운영하는 덕분에 서버 관리가 필요 없다. 단말기가 수백 개가 되어도 AWS가 알아서 처리한다. 이 프로젝트에서 AWS 인프라는 백엔드팀이 구성했고, 나는 브라우저 쪽 연결만 담당했다.

하나 특이한 점은 AWS IoT Core가 기본 **Lifecycle 토픽**을 제공한다는 것이다.

```ts
export const deviceDisconnectedTopic = (productKey: string) =>
  `$aws/events/presence/disconnected/${productKey}`;
```

`$aws/...`로 시작하는 이 토픽은 AWS가 자동으로 발행한다. 단말기(트랙터)가 오프라인이 되면 AWS IoT Core가 이 토픽에 메시지를 보내준다. 브라우저가 이걸 구독하고 있으면 "트랙터가 끊겼다"는 걸 별도 API 없이 바로 알 수 있다.

---

## Custom Authorizer로 인증하기

브라우저는 AWS 시크릿을 코드에 담을 수 없다. 소스가 공개되는 환경이라서다. 이 문제를 우회하기 위해 **Custom Authorizer** 방식을 썼다. 브라우저가 자격증명 없이 연결 요청을 보내면, AWS IoT Core가 미리 등록된 Lambda를 호출해서 허용 여부를 판단하는 구조다.

```ts
.with_custom_authorizer("", AUTHORIZER_NAME, "", "", "", "")
```

인증 로직은 백엔드팀이 구성했고, 프론트에서는 Authorizer 이름만 넘기면 됐다. Custom Authorizer 상세 동작은 별도로 정리할 예정이다.

---

## 연결 상태 관리

MQTT 연결은 한 번 맺으면 유지되면서 여러 토픽을 구독할 수 있다. HTTP처럼 요청마다 연결을 새로 만들지 않는다.

코드에서 연결 상태를 모듈 수준 변수로 관리했다:

```ts
interface MqttConnection {
  connection: mqtt.MqttClientConnection;
  isConnected: boolean;
  topicCallbacks: Map<string, (topic: string, message: ArrayBuffer) => void>;
}

let mqttConnection: MqttConnection | null = null;
```

`topicCallbacks`가 Map인 이유가 있다. 같은 연결 위에서 여러 토픽을 구독하고 각각 다른 처리를 해야 하기 때문이다. GPS가 오면 지도 업데이트, 알림이 오면 팝업 표시 — 토픽마다 콜백이 다르다.

이미 구독된 토픽이 들어오면 재구독하지 않고 콜백만 교체한다:

```ts
if (mqttConnection.topicCallbacks.has(topic)) {
  mqttConnection.topicCallbacks.set(topic, callback);
  return;
}
```

연결 이벤트도 네 종류로 구분해서 처리한다:
- `connect` — 연결 성공
- `interrupt` — 네트워크 불안정 등으로 일시 중단
- `resume` — 중단 후 자동 복구
- `disconnect` — 완전히 끊김

`interrupt` → `resume` 은 MQTT가 자동으로 처리해주는 재연결이다. `disconnect`는 완전히 끊긴 것이라 수동으로 `connect()`를 다시 호출해야 한다.

---

## 정리

| | HTTP 폴링 | MQTT |
|---|---|---|
| 데이터 수신 방식 | 주기적으로 요청 | 발행 즉시 수신 |
| 브라우저 지원 | 기본 지원 | WebSocket 위에 올려야 함 |
| 트래픽 | 변화 없어도 요청 발생 | 변화가 있을 때만 전송 |
| 적합한 상황 | 가끔 확인하는 데이터 | 실시간, 고빈도 데이터 |

브라우저에서 MQTT를 쓰는 건 결국 이 흐름이다:

```
브라우저
  → aws-crt 라이브러리로 WebSocket 연결 생성
  → AWS IoT Core (Custom Authorizer로 인증)
  → 토픽 구독
  → 단말기가 발행하면 자동으로 콜백 실행
```

처음엔 생소했는데, HTTP 요청/응답에서 pub/sub으로 사고방식을 바꾸면 구조가 단순하다.
