---
title: "바이너리 프로토콜 파싱 — GPS 좌표부터 CAN 버스 비트 신호까지"
description: "농기계 모니터링 시스템과 전기트랙터 원격 제어 앱, 두 프로젝트에서 실제로 바이너리 데이터를 파싱한 코드를 비교한다. DataView로 바이트 단위 필드를 읽는 법과, 바이트 하나에 여러 신호가 압축된 CAN 데이터를 비트 단위로 풀어내는 법."
date: "2026-07-08"
category: "Frontend"
tags: ["Binary Protocol", "DataView", "CAN Bus", "IoT", "TypeScript"]
featured: false
draft: false
---

{% callout type="warning" title="아직 완전히 소화한 내용은 아니다" %}
비트/바이트, 엔디안, CAN 비트 패킹을 실제 코드로 검증하며 정리했지만, 프로토콜을 처음부터 직접 설계해본 적은 없어서 이해가 얕은 부분이 있을 수 있다. 나중에 더 보충할 예정.
{% /callout %}

## 왜 바이너리로 통신하는가

두 프로젝트 모두 단말기가 데이터를 JSON이 아니라 바이너리로 보낸다. 같은 데이터를 JSON으로 보내면 필드명과 구조까지 텍스트로 포함되니 크기가 훨씬 커진다. IoT 환경에서는 무선 대역폭이 한정적이고 전송 빈도도 높아서(GPS는 수백 ms 단위로 계속 온다), 바이트 단위로 꽉꽉 채운 바이너리가 표준처럼 쓰인다.

문제는 받은 쪽에서 이 바이트 덩어리가 어떤 의미인지 프로토콜 문서를 보고 직접 풀어내야 한다는 것이다. 두 프로젝트에서 이 "풀어내는" 방식이 서로 다르다. 하나는 필드가 바이트 경계에 깔끔하게 정렬돼 있어 `DataView`로 충분했고, 다른 하나는 신호 여러 개가 한 바이트 안에 비트 단위로 욱여넣어져 있어 직접 비트 연산을 짜야 했다.

---

> 비트/바이트, 엔디안, `DataView` 메서드 같은 기초 개념은 별도 노트로 뺐다 — [비트·바이트 기초 — 엔디안, 그리고 하나의 바이트에 여러 신호 담기](/notes/frontend/bit-byte-endian-basics). 여기서는 바로 실제 코드로 들어간다.

---

## 1. 바이트 단위 파싱 — GPS 좌표 (`DataView`)

농기계 자율주행 모니터링 시스템(`auto-check-frontend-next`)에서 GPS 데이터를 파싱하는 코드다.

```ts
const GPS_UNIT = 10_000_000; // 10^7
const BEARING_POINT = 100_000; // 10^5
const VELOCITY_DIVIDE = 277.78; // mm/s => km/h 변환상수

export const parseGpsPayload = (bytes: Uint8Array): GpsData | null => {
  const payloadVersion = bytes.length;

  try {
    const buffer = bytes instanceof ArrayBuffer ? bytes : bytes.buffer;
    const view = new DataView(buffer);

    const parseTimestamp = (offset: number): number => {
      const second = view.getInt32(offset, true);
      const nanoSecond = view.getInt32(offset + 4, true);
      return second * 1000 + Math.floor(nanoSecond / 1000000);
    };

    return {
      longitude: view.getInt32(0, true) / GPS_UNIT,
      latitude: view.getInt32(4, true) / GPS_UNIT,
      bearing: view.getInt32(8, true) / BEARING_POINT,
      velocity: Number((view.getInt32(12, true) / VELOCITY_DIVIDE).toFixed(2)),
      // ...
      timestamp: payloadVersion === 88 ? parseTimestamp(80) : 0,
    };
  } catch (error) {
    console.error("GPS 데이터 파싱 실패:", error);
    return null;
  }
};
```

`DataView`는 "이 오프셋부터 몇 바이트를, 어떤 타입으로, 어떤 엔디안으로 읽을지"를 메서드 하나로 처리해주는 표준 API다. `view.getInt32(0, true)`는 "0번 바이트부터 4바이트를 부호 있는 32비트 정수로, 리틀 엔디안으로 읽어라"는 뜻이다. 두 번째 인자 `true`가 리틀 엔디안 지정이다.

경도·위도가 정수로 오는 이유는 부동소수점을 그대로 전송하면 표현이 불안정하고 크기도 커지기 때문이다. 실제 값에 1천만(`GPS_UNIT`)을 곱한 정수로 인코딩해서 보내고, 받는 쪽에서 다시 나눠서 복원한다. 위경도는 소수점 7자리면 위치 정밀도가 센티미터 단위까지 나오니, 정수 곱셈-나눗셈으로 충분하다.

`payloadVersion === 88`처럼 바이트 길이로 분기하는 부분도 눈에 띈다. 프로토콜에 별도의 버전 필드가 없어서, "이 페이로드가 88바이트짜리 최신 버전인지"를 길이로 추론한다. 스키마에 버전 바이트를 하나 넣어뒀다면 더 명시적이었을 텐데, 그렇지 않아서 길이로 우회한 셈이다.

같은 파일에 있는 상태 머신 파싱 코드는 조금 더 복잡하다. 프레임 개수 자체가 가변이고, 프레임마다 길이도 다르다.

```ts
export function parseStateMachine(bytes: Uint8Array): StateFrame[] | null {
  if (bytes.length === 0) {
    console.error("[state-machine] empty payload");
    return null;
  }

  try {
    const view = new DataView(bytes.buffer);
    const states = [];
    let offset = 0;

    const stateCnt = view.getUint8(offset++);
    for (let i = 0; i < stateCnt; i++) {
      const frameLen = view.getUint8(offset++);

      if (frameLen === 9) {
        // 상태 1byte + longitude 4byte + latitude 4byte
        const state = view.getUint8(offset++);
        const longitude = view.getInt32(offset, true) / GPS_UNIT;
        offset += 4;
        const latitude = view.getInt32(offset, true) / GPS_UNIT;
        offset += 4;
        states.push({ state, longitude, latitude });
      } else if (frameLen === 1) {
        // 상태값만 포함
        const state = view.getUint8(offset++);
        states.push({ state });
      } else {
        throw new Error(`[state-machine] idx[${i}] Invalid frame length: ${frameLen}`);
      }
    }

    return states.map(({ state, longitude, latitude }) => ({
      state: getEcuStateName(state),
      longitude,
      latitude,
      stateNumber: state,
    }));
  } catch (error) {
    console.error("[state-machine] parse error:", error);
    return [];
  }
}
```

`offset++`로 커서를 직접 옮겨가며 읽는 구조다. 첫 바이트로 "프레임이 몇 개 들었는지"를 읽고, 그 개수만큼 루프를 돌면서 각 프레임의 길이 바이트를 보고 "위치 정보가 포함된 프레임(9바이트)"인지 "상태값만 있는 프레임(1바이트)"인지 분기한다. 정해지지 않은 길이가 나오면 `throw`로 즉시 실패시킨다.

여기서 두 가지를 눈여겨볼 만하다.

첫째, **에러 계약이 두 가지로 갈린다.** 페이로드가 아예 비어 있으면 `null`을 반환하고, 루프 도중 잘못된 프레임 길이를 만나면 `catch`에서 잡아 빈 배열 `[]`을 반환한다. 호출하는 쪽은 "파싱 실패"를 두 가지 다른 모양(`null` 그리고 `[]`)으로 받게 되는데, 이런 비대칭은 나중에 호출부에서 `if (!result)` 같은 체크를 빠뜨리기 쉬운 지점이 된다.

둘째, **`GPS_UNIT = 1e7`이 여러 파일에 독립적으로 다시 정의돼 있다.** `gps.ts`, `state-machine.ts`, `upload_waypoint.ts`에 각각 같은 상수가 따로 선언돼 있다. 프로토콜을 다루는 파일이 하나씩 늘어날 때마다 그 파일에 필요한 상수를 그때그때 복사해 넣은 흔적이다. 상수 하나 값이 바뀔 경우 세 곳을 다 찾아 바꿔야 하니, 공용 `constants.ts` 하나로 모으는 게 맞는 방향이다. 실제로 지금 그렇게 되어 있지 않다는 것 자체가, 바이너리 프로토콜 코드는 파일이 늘어날수록 이런 파편화가 자연스럽게 생긴다는 걸 보여준다.

---

## 2. 비트 단위 파싱 — CAN 버스 신호 (전기트랙터 원격 제어)

전기트랙터 원격 제어 앱(`electrictractor`)은 차량의 CAN 버스 데이터를 받아 화면에 표시한다. CAN은 프레임 하나가 최대 8바이트로 매우 작기 때문에, 신호 하나에 바이트 하나를 통째로 쓰는 게 아니라 **비트 단위로 여러 신호를 한 바이트에 욱여넣는다.** 여기서부터는 `DataView`로 안 되고 직접 비트 연산이 필요해진다.

### CAN ID로 프레임 나누기

CAN 메시지는 식별자(CAN ID)별로 담긴 내용이 다르다. 이 프로젝트는 `0x341`~`0x344` 네 가지 ID를 쓴다.

```ts
uploadCanModel.canFrames.forEach(canFrame => {
  if (canFrame.canIdentifier === '0x00000341') {
    // 차량 속도, 배터리 전압, 오일 온도, 히치 위치, 레버 스위치, PTO 스위치 ...
  } else if (canFrame.canIdentifier === '0x00000342') {
    // BMS 팩 전압/SOC/온도, 열관리 온도
  } else if (canFrame.canIdentifier === '0x00000343') {
    // 고장 코드 8바이트
  } else if (canFrame.canIdentifier === '0x00000344') {
    // 인버터/모터 온도
  }
});
```

`0x341` 프레임 하나만 봐도, 2번 바이트 안에 서로 다른 스위치 신호 네 개가 겹쳐 있다.

```ts
// 2번 바이트(byte index 2) 안에 4개 신호가 비트 단위로 packing되어 있다
const CF_PosnLvrSw = canFrame.parseData({
  startByte: 2, startBit: 5, bitLength: 3, signed: false,
});
const CF_PTOActSw = canFrame.parseData({
  startByte: 2, startBit: 2, bitLength: 1, signed: false,
});
const CF_BrkSeperatedSw = canFrame.parseData({
  startByte: 2, startBit: 0, bitLength: 1, signed: false,
});
const CF_RemoteCtrlValid = canFrame.parseData({
  startByte: 2, startBit: 4, bitLength: 1, signed: false,
});
```

같은 바이트(`startByte: 2`)인데 시작 비트(`startBit`)와 길이(`bitLength`)만 다르다. `DataView.getUint8(2)`로는 이 바이트 전체를 하나의 숫자로만 읽을 수 있지, "5번 비트부터 3비트만" 같은 요청은 못 들어준다. 그래서 비트 단위로 잘라내는 함수를 직접 만들어 썼다.

### `parseData` — 비트마스크로 원하는 구간만 잘라내기

```ts
parseData({startByte, startBit, bitLength, scale = 1, offset = 0, signed = false}: ParseDataParam) {
  const endByte = startByte + Math.floor((startBit + bitLength - 1) / 8);
  const parsedByteValue = this.canData.parseNumber(startByte, endByte + 1);

  const value =
    (parsedByteValue &
      (parseInt(
        Array(bitLength - (signed ? 1 : 0)).fill(1).join(''),
        2,
      ) << startBit)) >> startBit;

  const sign =
    (parsedByteValue & (1 << (bitLength + startBit - 1))) >> (bitLength + startBit - 1) === 1
      ? false
      : true;

  return signed
    ? sign
      ? value * scale + offset
      : -1 * (parseInt(value.toString(2).split('').map(v => (v === '1' ? '0' : '1')).join(''), 2) + 1) * scale + offset
    : value * scale + offset;
}
```

한 줄씩 뜯어보면 이렇다.

**1) 필요한 바이트 범위 계산.** `startBit + bitLength - 1`을 8로 나눈 몫이 "몇 바이트째까지 걸쳐 있는지"를 알려준다. 비트가 바이트 경계를 넘어갈 수도 있다는 걸 감안한 계산이다.

**2) 비트마스크를 문자열로 만든다.** `Array(bitLength).fill(1).join('')`은 `bitLength`가 3이면 문자열 `"111"`을 만들고, 이걸 `parseInt("111", 2)`로 2진수 해석하면 정수 `7`이 된다. 흔히 쓰는 `(1 << n) - 1` 같은 비트 시프트 트릭 대신 문자열을 조립해서 마스크를 만든 점이 독특하다. 결과는 같지만 다소 우회적인 방식이다.

**3) 마스크를 시작 비트만큼 밀고(`<< startBit`), 원본 바이트와 `AND` 연산한 뒤, 다시 오른쪽으로 밀어서(`>> startBit`) 값만 남긴다.** 이게 "특정 구간의 비트만 도려내는" 표준적인 방법이다. 예를 들어 `CF_PosnLvrSw`(`startByte: 2, startBit: 5, bitLength: 3`)라면, 2번 바이트의 5~7번 비트 3개만 뽑아내는 것이다.

**4) 부호 판별과 2의 보수 변환도 직접 구현했다.** `signed: true`일 때, 최상위 비트가 1인지 보고(`sign` 변수) 음수인지 양수인지 가른다. 음수라면 표준적인 2의 보수 계산(비트 반전 후 1을 더하는 것) 대신, **값을 2진수 문자열로 바꾼 뒤 각 문자를 `'1' → '0'`, `'0' → '1'`로 바꾸고 다시 정수로 파싱**하는 방식으로 비트를 반전시킨다. `~value`처럼 네이티브 비트 연산자로 반전하면 한 줄로 끝날 일을, 문자열 변환으로 우회해서 구현한 부분이다. 동작은 하지만, 부호 있는 CAN 신호가 있는 필드마다 이 문자열 변환 비용이 매번 든다.

### 반대 방향 — 값을 다시 비트로 채워 넣기 (전송)

받는 쪽만 비트 연산이 있는 게 아니라, 앱에서 트랙터로 제어 명령을 보낼 때도 여러 상태값을 한 바이트로 압축해서 보낸다.

```ts
let byte6 = 0;
byte6 |= (CF_DiffLockSw & 0x01) << 0;
byte6 |= (CF_4wdSw & 0x01) << 1;
byte6 |= (CF_SubShiftSw & 0x01) << 2;
byte6 |= (CF_PTOSw & 0x01) << 3;
byte6 |= (CF_PTOSpdSel & 0x07) << 4;
byte6 |= (CF_HornSw & 0x01) << 7;
updateBufferByte(byte6, 6, 'Unsigned');
```

여기서는 `parseData`처럼 재사용 가능한 함수를 거치지 않고, 바이트마다 `|=`와 `<<`를 직접 나열해서 비트를 채운다. 즉 **디코딩(수신)은 `parseData`라는 공용 함수를 거치는데, 인코딩(송신)은 바이트마다 손으로 비트를 조립하는 별도 코드**다. 같은 프로토콜의 앞뒤인데 대칭적으로 재사용되지 않고 따로 구현된 셈이다. 인코딩 쪽도 같은 스키마(`startByte`/`startBit`/`bitLength`)를 받는 함수로 뽑아냈다면 필드가 추가될 때 두 번 손댈 일이 줄었을 것이다.

---

## `DataView` vs 수동 비트 연산, 언제 뭘 쓰나

두 프로젝트를 나란히 보면 기준이 명확해진다.

**필드가 바이트 경계에 정렬돼 있으면(`8/16/32`비트 단위로 딱 떨어지면) `DataView`로 충분하다.** GPS 좌표, 알림 코드처럼 "이 필드는 4바이트 정수", "저 필드는 2바이트 정수"로 나뉘는 데이터가 여기 해당한다. 엔디안 지정, 부호 처리, 오프셋 계산까지 표준 API가 다 해주니 직접 비트를 만질 이유가 없다.

**신호 하나가 바이트 경계와 무관하게 몇 비트만 차지하면(3비트 스위치 값, 1비트 플래그처럼) `DataView`로는 표현이 안 된다.** CAN 버스처럼 프레임 크기가 극단적으로 작아서 여러 신호를 한 바이트에 압축해 넣는 프로토콜이 여기 해당하고, 이때는 마스크·시프트를 직접 조합하는 수밖에 없다.

에러 처리 방식도 대조적이다. `auto-check-frontend-next` 쪽은 GPS·알림·상태머신 파서 모두 `try/catch`와 길이 체크가 있다. 반면 `electrictractor`의 CAN 파싱 경로(`canDataHandler`, `UploadCanFrame.parseData`, `MqttBuffer.parseNumber`)에는 길이 검증이나 예외 처리가 전혀 없다 — 짧거나 손상된 버퍼가 들어오면 `Buffer.subarray`나 `reduce` 내부에서 그대로 예외가 터지거나, 조용히 `NaN`이나 엉뚱한 값을 반환한다. 실시간 원격 제어처럼 끊김이 잦은 무선 환경에서는 이 차이가 실제 장애로 이어질 수 있는 지점이다.

두 프로젝트를 비교하면서 정리한 기준은 이거다: **바이트 정렬 데이터는 표준 API(`DataView`)를 믿고 쓰고, 비트 단위로 압축된 데이터를 다룰 땐 마스크·시프트 로직을 최소한의 유틸 함수로 만들어 재사용하되, 인코딩과 디코딩 양쪽에 같은 함수를 쓰도록 맞추는 게 좋다.** 지금처럼 디코딩만 공용 함수를 쓰고 인코딩은 따로 구현되어 있으면, 필드 하나가 추가될 때마다 두 곳을 손으로 맞춰야 하는 부담이 계속 남는다.
