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
org: 회사
featured: true
---

## 배경

긴트는 트랙터·이앙기에 자율주행 소프트웨어를 얹는 회사다. 이 프로젝트는 실제 서비스로 배포된 게 아니라, 대학교와 함께 진행한 국가 R&D 과제의 일환이었다. 목표는 운전석에 사람이 타지 않고도 앱만으로 전기 트랙터를 조작할 수 있게 하는 것 — 주행/로더/PTO/히치 등의 기능을 앱에서 직접 제어하고, 현재 상태와 고장 여부까지 화면에서 확인할 수 있어야 했다.

React Native 기반 iOS/Android 크로스플랫폼 앱으로, 프론트엔드 파트를 단독으로 개발했다.

---

## 1. MQTT + WebSocket, 이중 통신 구조

제어 명령 송신과 CAN 데이터 수신은 AWS API Gateway 기반 WebSocket으로 처리한다. CAN 데이터는 ID·필드 종류가 많은데, MQTT로 보내려면 토픽(라우트)을 필드 단위로 일일이 쪼개서 만들어야 해서 번거롭다고 판단했다. 그래서 CAN payload를 필드 단위 토픽으로 쪼개기보다, 프레임 단위로 통째로 받아 앱에서 직접 파싱하는 방식을 택했다.

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

이 방식으로 바꾼 뒤에는 연결 상태를 소켓 이벤트 하나에만 의존하지 않게 됐다. 원격 제어 앱에서 중요한 건 "연결 객체가 열려 있는가"가 아니라 "장비가 실제로 응답하고 있는가"였기 때문에, alive-signal 기반 판단이 더 맞는 방식이었다.

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

원격 제어 앱인데 화면이 꺼지는 순간 트랙터와의 연결 상태를 알 수 없게 되는 건 치명적이었다. 같은 작업에서 네 가지를 같이 고쳤다.

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

4. `sendBuffer` 함수가 호출될 때마다 새 배열을 만들고 있었다.

```ts
// 수정 전 — 호출마다 새 배열 생성
const sendBuffer = () => {
  const bufferData = buffer.toJSON().data;
  // ...JSON.stringify(bufferData)
};

// 수정 후 — 배열을 한 번만 만들고 값만 갱신
let cachedBufferData: number[] = new Array(26);

const sendBuffer = () => {
  for (let i = 0; i < 26; i++) {
    cachedBufferData[i] = buffer[i];
  }
  // ...JSON.stringify(cachedBufferData), 결과는 동일
};
```

`buffer.toJSON().data`는 호출될 때마다 26바이트짜리 배열을 새로 할당한다. 데이터 전송은 앱이 연결돼 있는 동안 끊임없이 반복되는 작업이라, 매번 새 배열을 만들면 그만큼의 가비지가 계속 쌓인다. 가비지 컬렉터가 이를 다 회수하지 못하는 속도로 쌓이면 메모리 사용량이 계속 늘어나고, 현장에서 앱을 오래 켜두면 결국 메모리 부족으로 앱이 꺼지는 현상으로 이어졌다. 배열을 한 번만 만들어두고 값만 덮어쓰는 방식으로 바꿔 호출마다의 할당 자체를 없앴다.

---

## 3. CAN 버스 바이너리 데이터 파싱

차량 단말기는 상태 데이터를 CAN 프레임으로 보낸다. 4개의 CAN ID(`0x341`~`0x344`)에 속도·배터리 전압/SOC·오일 온도·히치 위치·인버터 온도·고장 코드 등이 나뉘어 담겨 있고, 각 필드는 바이트 단위가 아니라 비트 단위로 패킹돼 있다.

받는 쪽(트랙터 → 앱)과 보내는 쪽(앱 → 트랙터)의 실제 데이터 모양이 서로 다르다.

**받는 쪽**은 WebSocket으로 이런 JSON 텍스트가 온다.

```json
{
  "action": "canDataToApp",
  "data": {
    "bufferString": { "type": "Buffer", "data": [1, 0, 3, 49, 29, 49, 2, 0, 1, ...] }
  }
}
```

`bufferString.data`는 Node `Buffer`를 그대로 `JSON.stringify`한 결과라, 숫자 배열로 온다. 이걸 다시 `Buffer.from()`으로 복원하면 그 안에 CAN 프로필 ID(문자열, 36바이트) → 프레임 개수 → 20바이트짜리 프레임(CAN ID 4바이트 + CAN 데이터 8바이트 + 타임스탬프 8바이트)이 반복되는 구조가 들어있다. 이 8바이트 CAN 데이터 안에서 다시 `parseData`로 속도·전압·스위치 등을 비트 단위로 뽑아낸다.

**보내는 쪽**은 26바이트짜리 고정 버퍼 하나를 계속 재사용한다. 앞뒤로 고정 헤더/마커를 박아두고,

```ts
buffer.writeInt16BE(0x0200, 0);       // [0~1]  고정 헤더
buffer.writeInt32BE(0x11030000, 2);   // [2~5]  고정 마커
buffer.writeInt32BE(0x12030000, 14);  // [14~17] 고정 마커
```

나머지 자리에 실제 제어값(스위치 packing, 로더 압력, 램프 스위치 등)을 채운 뒤 이렇게 감싸서 보낸다.

```ts
const bufferRequestData = {
  action: 'canDataToEquipment',
  data: { bufferString: JSON.stringify(cachedBufferData) }, // 26개짜리 숫자 배열을 문자열로
};
wsService.sendMessage(JSON.stringify(bufferRequestData));
```

받는 쪽은 `Buffer`가 JSON으로 직렬화된 `{type, data}` 모양으로 오고, 보내는 쪽은 26개 숫자 배열을 문자열로 한 번 더 감싸서 보낸다는 점에서 인코딩 방식이 대칭이 아니다.

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

→ [바이너리 프로토콜 파싱 — GPS 좌표부터 CAN 버스 비트 신호까지](/articles/frontend/binary-protocol-parsing)

---

## 4. 제어 UI 구조

주행/로더/PTO/히치/수평/경심/외부압/램프&혼 — 기능별로 탭을 나눠 모듈화했다. 기능이 늘어나도 탭 하나를 추가하는 식으로 확장할 수 있는 구조다.

제어 상태는 Zustand 스토어 하나로 모았다. 사용자가 버튼이나 슬라이더를 조작하면 스토어 상태가 바뀌고, 그 변경이 WebSocket을 통해 차량으로 전송되는 흐름을 표준화했다. 화면마다 따로 상태를 들고 전송 로직을 짜지 않고, "조작 → 상태 업데이트 → 전송"이라는 한 가지 패턴만 따르도록 했다. Redux 대비 보일러플레이트(action/reducer/Provider) 없이 `create()` 한 줄로 스토어를 만들 수 있어 가벼웠다.

**로컬 저장** — 마지막으로 연결한 장비 정보나 제어 설정값처럼 앱을 껐다 켜도 유지해야 하는 값이 있었다. 이런 값은 스토어를 만들 때 `persist` 미들웨어로 한 번 감싸주기만 하면 됐다.

```ts
export const useConnectionStore = create<State & Action>()(
  persist(
    (_set, _get) => ({
      isConnected: false,
      mqttConnected: false,
      productKey: '',
      activeMenu: 'connect',
    }),
    {
      name: 'connectionState',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
```

`persist(creator, options)`가 스토어 생성 함수(`creator`)를 감싸는 구조다. `options.storage`로 실제 저장소(`AsyncStorage`)를 지정하고, `createJSONStorage`가 상태 객체를 JSON 문자열로 직렬화/역직렬화해 그 저장소에 읽고 쓸 수 있게 어댑터 역할을 한다. `name`은 `AsyncStorage`에 저장될 때 쓰이는 키 이름이다.

이렇게 한 번 연결해두면, 그 이후로는 컴포넌트에서 `set()`으로 상태를 바꿀 때마다 미들웨어가 알아서 최신 상태를 `AsyncStorage`에 써준다. 화면 코드에서 저장 시점을 따로 챙기거나 `AsyncStorage.setItem`을 직접 호출할 필요가 없고, 앱을 다시 켰을 때도 미들웨어가 저장된 값을 읽어와 스토어 초기 상태로 복원해준다.

**보내는 흐름** — 기본적으로 연결돼 있는 동안 500ms마다 현재 스토어 상태를 자동으로 반복 전송한다. 그런데 사용자가 버튼/슬라이더를 조작한 순간에도 이 자동 전송 타이머가 우연히 같이 발동하면, 같은 데이터가 두 번 보내질 수 있다. 그래서 조작이 일어나면(`sendDataOnEvent()`) ① 자동 전송 타이머를 멈추고 ② 그 자리에서 즉시 한 번만 보낸 뒤 ③ 타이머를 다시 0부터 시작한다. 즉 "조작 시 전송"과 "주기적 전송"이 겹치지 않도록, 조작이 있을 때마다 주기적 전송의 카운트를 리셋하는 방식이다. 실제 전송 자체는 `updateAndSendData`가 스토어 값을 비트 단위로 buffer에 채운 뒤 `sendBuffer`가 그 buffer를 WebSocket으로 보낸다(`action: 'canDataToEquipment'`).

**받는 흐름** — 차량 단말기가 CAN 프레임을 WebSocket으로 전송 → `App.tsx`의 메시지 리스너가 `action: 'canDataToApp'`을 받으면 `handleCanData` 호출 → CAN ID(`0x341`~`0x344`)별로 비트 위치를 파싱해 필드를 뽑아냄 → 상태값은 `useStateStore`, 고장 코드는 `useTroubleStore`에 반영 → 두 스토어를 구독 중인 화면(StateScreen, TroubleScreen 등)이 자동으로 다시 그려짐.

즉 조작 쪽은 컨트롤 스토어를 거쳐 나가고, 수신 쪽은 상태/고장 스토어로 들어와 화면에 반영되는, 방향이 분리된 두 흐름이다.

---

## 메모 (TODO)

- [ ] alive-signal 5초 타이머 값을 어떻게 정했는지(현장 네트워크 환경 기준) 보강
- [ ] 관련 이미지(제어 UI 스크린샷) 추가
- [x] CAN 바이너리 파싱을 별도 아티클로 정리 — [바이너리 프로토콜 파싱](/articles/frontend/binary-protocol-parsing)
- [ ] 보내는 흐름/받는 흐름(인터벌+이벤트 중복 방지)을 별도 아티클로 정리 — 면접 준비용으로도 활용
