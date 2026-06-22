---
title: 전기 트랙터 원격 제어 앱
description: 전기 트랙터를 모바일에서 원격으로 제어·점검하는 React Native 앱. AWS IoT Core(MQTT)와 WebSocket을 함께 써서 연결 상태를 모니터링하고, CAN 버스 바이너리 데이터를 실시간으로 파싱해 화면에 반영한다. 프론트엔드 파트 단독 개발.
date: "2025-08"
tags:
  - React Native
  - TypeScript
  - MQTT
  - AWS IoT Core
  - WebSocket
  - Zustand
status: archived
featured: true
---

## 배경

긴트는 트랙터·이앙기에 자율주행 소프트웨어를 얹는 회사다. 이 프로젝트는 실제 서비스로 배포된 게 아니라, 대학교와 함께 진행한 국가 R&D 과제의 일환이었다. 목표는 운전석에 사람이 타지 않고도 앱만으로 전기 트랙터를 조작할 수 있게 하는 것 — 주행/로더/PTO/히치 등의 기능을 앱에서 직접 제어하고, 현재 상태와 고장 여부까지 화면에서 확인할 수 있어야 했다.

React Native 기반 iOS/Android 크로스플랫폼 앱으로, 프론트엔드 파트를 단독으로 개발했다.

---

## 1. MQTT + WebSocket, 이중 통신 구조

제어 명령 송신과 CAN 데이터 수신은 AWS API Gateway 기반 WebSocket으로 처리한다. CAN 데이터는 ID·필드 종류가 많은데, MQTT로 보내려면 토픽(라우트)을 필드 단위로 일일이 쪼개서 만들어야 해서 번거롭다고 판단했다. 그래서 CAN 데이터 전체를 하나로 묶어 WebSocket으로 보내는 구조를 처음부터 직접 설계했다.

문제는 이 앱이 차량과 실제로 연결되어 있는지, 즉 "살아있는지"를 확인하는 부분이었다. WebSocket 쪽에는 이 상태를 판단할 코드를 따로 두지 않았다. 그래서 별도로 AWS IoT Core에 `react-native-paho-mqtt`로 MQTT 연결을 새로 맺고, `alive-signal` 토픽 하나만 구독해서 연결 상태를 확인하는 채널을 추가했다. 결과적으로 통신 채널이 두 개로 나뉘게 됐다 — 제어/데이터는 기존 WebSocket, 연결 상태 확인은 새로 추가한 MQTT.

앱이 켜지는 시점에 두 연결을 같이 띄운다.

```ts
// App.tsx 초기 연결 설정
useEffect(() => {
  connectWebSocket(); // 제어 명령 / CAN 데이터
  initializeBuffer();
  startMqtt(); // 연결 상태 확인용 alive-signal 구독

  return () => {
    const wsService = WebSocketService.getInstance();
    wsService.closeConnection();
    if (mqttServiceRef.current) {
      mqttServiceRef.current.disconnect();
      stopAliveTimeout();
    }
  };
}, [connectWebSocket, stopAliveTimeout, startMqtt]);
```

```ts
const subscribeTopic = `e-tractor-dev/v1/${PRODUCT_KEY}/noti/alive-signal`;
mqttServiceRef.current.subscribe(subscribeTopic, payload => {
  useConnectionStore.setState({ mqttConnected: true });
  startAliveTimeout(); // alive-signal 올 때마다 5초 타이머 리셋
});
```

`startAliveTimeout`이 바로 그 "5초" 부분이다. alive-signal을 받을 때마다 기존 타이머를 지우고 새로 5초를 잰다. 그 5초 안에 다음 alive-signal이 안 오면 타이머가 끝까지 살아남아 `mqttConnected`를 `false`로 떨어뜨린다.

```ts
const startAliveTimeout = useCallback(() => {
  stopAliveTimeout(); // 기존 타이머 제거
  aliveTimeoutRef.current = setTimeout(() => {
    // 5초 동안 alive-signal이 안 와서 여기까지 살아남으면 연결 끊김으로 간주
    useConnectionStore.setState({ mqttConnected: false });
  }, 5000);
}, [stopAliveTimeout]);
```

`AwsIotMqttService`에는 `onConnected`/`onDisconnected`라는 콜백이 이미 있지만, 이 이벤트만 믿고 끊김을 판단하기엔 불안했다. 라이브러리가 끊김을 감지하지 못하거나 늦게 알려주는 경우, `onDisconnected`가 안 불려도 실제로는 끊겨 있을 수 있기 때문이다. 그래서 더 확실한 방법으로 바꿨다 — 살아있는 동안 트랙터가 계속 보내는 `alive-signal`이 들어오는 동안에는 연결된 것으로 보고, 5초 안에 그 신호가 끊기면 그때 연결이 끊긴 것으로 판단한다. 연결 여부를 라이브러리의 이벤트가 아니라 실제 데이터가 계속 오는지로 직접 검증하는 쪽을 택한 것이다.

---

## 2. 화면이 꺼지면 연결도 끊긴다

현장에서 앱을 켜두면 일정 시간 뒤 화면이 자동으로 꺼졌다. 화면이 꺼지는 순간 웹소켓 연결이 끊겼고, 재연결도 지연 없이 즉시 시도하다 보니 네트워크가 살짝 불안정한 구간에서는 끊김과 재연결 요청이 끝없이 반복됐다. MQTT 쪽은 원인이 더 직접적이었다 — 앱이 백그라운드로 전환되는 순간 연결을 명시적으로 끊는 코드가 있어서, 화면이 꺼지자마자 연결 상태 확인 자체가 멈춰버렸다.

```ts
// 백그라운드 진입 시 (수정 전)
if (mqttServiceRef.current) {
  mqttServiceRef.current.disconnect();
  stopAliveTimeout();
  useConnectionStore.setState({ mqttConnected: false });
}
```

원격 제어 앱인데 화면이 꺼지는 순간 트랙터와의 연결 상태를 알 수 없게 되는 건 치명적이었다. 세 가지를 같이 고쳤다.

1. `react-native-keep-awake`로 화면 자동 꺼짐 자체를 막았다 — 화면이 꺼지면서 발생하는 OS 레벨 연결 끊김을 원천적으로 줄이는 쪽을 선택했다.
2. 백그라운드 진입 시 MQTT 연결을 끊던 코드를 제거해, 앱이 백그라운드에 있어도 연결 상태 확인이 계속되도록 했다.
3. 웹소켓 재연결을 즉시 시도하던 걸 지연 후 재시도로 바꿨다.

```ts
this.webSocket.onclose = () => {
  if (this.shouldReconnect) {
    setTimeout(() => this.connect(this.url), 2000); // 즉시 재연결 → 2초 지연
  }
};
```

지연 없는 즉시 재연결은 연결이 한 번 불안정해지면 끊김과 재시도가 같은 틱에서 반복되며 오히려 상태를 더 불안정하게 만들었다. 2초 지연을 두는 것만으로 이 반복이 끊겼다.

---

## 3. CAN 버스 바이너리 데이터 파싱

차량 단말기는 상태 데이터를 CAN 프레임으로 보낸다. 4개의 CAN ID(`0x341`~`0x344`)에 속도·배터리 전압/SOC·오일 온도·히치 위치·인버터 온도·고장 코드 등이 나뉘어 담겨 있고, 각 필드는 바이트 단위가 아니라 비트 단위로 패킹돼 있다.

```ts
const CF_HitchPosAct = canFrame.parseData({
  canData: canDataBuffer,
  startByte: 4,
  startBit: 0,
  bitLength: 7,
  scale: 1,
  offset: 0,
  signed: false,
});
```

`startByte`/`startBit`/`bitLength`로 비트 위치를 지정하고 `scale`/`offset`으로 실제 물리값으로 변환하는 파서를 CAN ID별로 만들어, 수신한 프레임을 곧바로 상태 스토어(Zustand)에 반영한다.

---

## 4. 제어 UI 구조

주행/로더/PTO/히치/수평/경심/외부압/램프&혼 — 기능별로 탭을 나눠 모듈화했다. 기능이 늘어나도 탭 하나를 추가하는 식으로 확장할 수 있는 구조다.

제어 상태는 Zustand 스토어 하나로 모았다. 사용자가 버튼이나 슬라이더를 조작하면 스토어 상태가 바뀌고, 그 변경이 WebSocket을 통해 차량으로 전송되는 흐름을 표준화했다. 화면마다 따로 상태를 들고 전송 로직을 짜지 않고, "조작 → 상태 업데이트 → 전송"이라는 한 가지 패턴만 따르도록 했다.

---

## 메모 (TODO)

- [ ] alive-signal 5초 타이머 값을 어떻게 정했는지(현장 네트워크 환경 기준) 보강
- [ ] 관련 이미지(제어 UI 스크린샷) 추가
