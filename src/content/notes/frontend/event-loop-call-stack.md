---
title: "이벤트 루프, 콜 스택, 태스크 큐"
description: "브라우저의 비동기 동작 원리 — 이벤트 루프가 콜 스택과 큐를 어떻게 조율하는지"
date: "2026-06-13"
tags: ["JavaScript", "브라우저", "async", "이벤트루프"]
---

## 전체 구조

자바스크립트는 스레드가 하나다(싱글 스레드). 그런데도 여러 작업을 동시에 처리하는 것처럼 보이는 이유가 이벤트 루프다.

```
┌─────────────────┐     ┌──────────────────┐
│   Call Stack    │     │  Web APIs / I/O  │
│                 │     │                  │
│  (running now)  │     │  setTimeout      │
│                 │     │  DB query        │
└────────┬────────┘     │  network request │
         │              └────────┬─────────┘
         │ 스택 비면               │ 완료되면
         │ 꺼내서 올림              │ 큐에 넣음
         │              ┌────────▼─────────┐
         └──────────────│    Task Queue    │
                        │  (pending tasks) │
                        └──────────────────┘
```

이벤트 루프의 역할: **콜 스택이 비어있으면 큐에서 꺼내서 스택에 올려줌**. 개념적으로는 그냥 무한 루프다.

```
while (true) {
  // 콜 스택이 비어있는지 확인
  // 비어있으면 마이크로태스크 큐 → (필요하면) 렌더링 → 태스크 큐 순으로 꺼내서 실행
}
```

`Web APIs` 박스에 들어가는 `setTimeout`, `fetch`, DOM 이벤트 리스너 같은 건 사실 **자바스크립트 "언어" 자체가 제공하는 게 아니라 브라우저(호스트 환경)가 제공하는 API**다. ECMAScript 스펙에는 `setTimeout`이 정의돼 있지 않다 — JS 엔진은 콜 스택과 힙만 담당하고, 비동기 작업 자체는 그 바깥(브라우저 또는 Node)이 처리한 뒤 완료되면 큐에 콜백을 넣어주는 구조다. Node.js는 브라우저가 아니라서 정확히는 "Web APIs"가 아니라 libuv 기반의 자체 바인딩(C++)으로 같은 역할을 한다 — 이름은 다르지만 "JS 엔진 바깥에서 비동기 작업을 처리하고 끝나면 큐에 넣어준다"는 구조 자체는 동일하다.

---

## 콜 스택

지금 실행 중인 코드가 쌓이는 곳이다. 함수가 호출되면 올라가고, 끝나면 내려온다.

```typescript
console.log("1번");       // 스택에 올라갔다가 즉시 내려옴
setTimeout(() => {
    console.log("3번");   // Web API에 넘겨짐, 지금 스택에 없음
}, 2000);
console.log("2번");       // 스택에 올라갔다가 즉시 내려옴

// 출력: 1번 → 2번 → (2초 후) 3번
```

콜 스택이 절대 안 비면 무슨 일이 생기는지도 직접 확인할 수 있다.

```typescript
const runButton = document.querySelector('#run-heavy-task');

runButton.addEventListener('click', () => {
  setTimeout(() => console.log('이 로그, 대체 언제 찍힐까?'), 0);

  let sum = 0;
  for (let i = 0; i < 5_000_000_000; i++) {
    sum += i; // 이 반복문이 끝날 때까지 콜 스택을 계속 붙잡고 있음
  }
  console.log('합계:', sum);
});

// 0ms 뒤 실행되도록 예약했는데도, "이 로그..."는 "합계: ..."보다 먼저 못 찍힌다.
// for문이 도는 동안 콜 스택이 안 비어서, 이벤트 루프가 태스크 큐에 손도 못 대기 때문이다.
```

`setTimeout(..., 0)`은 "0ms 뒤에 실행해달라"는 예약일 뿐, "즉시 실행"이 아니다. 콜 스택이 `for`문으로 꽉 차 있는 동안에는 이벤트 루프가 태스크 큐를 확인하러 갈 틈 자체가 없어서, 예약된 시간이 지나도 실행이 그만큼 밀린다. 이 반복문이 `while (true) { ... }`처럼 아예 끝나지 않는 무한 루프라면, 그 뒤로는 영원히 아무 것도(다른 클릭, 호버 효과, 렌더링, 마이크로태스크) 처리되지 않는다 — 페이지가 완전히 멈춘 것처럼 보이는 이유다.

정확히는 "이벤트 루프가 콜 스택에 머무는" 게 아니다. 이벤트 루프는 콜 스택 안에 들어가는 게 아니라, **콜 스택이 비어있는지를 계속 지켜보는 바깥의 감시자**에 가깝다. 문제는 어떤 함수 하나가 콜 스택을 오래 붙잡고 있으면, 그동안 이벤트 루프가 다음 할 일(마이크로태스크 처리, 렌더링, 태스크 큐 확인)로 넘어갈 기회 자체를 못 얻는다는 것이다. **그래서 "콜 스택을 오래 붙잡는 동기 코드"가 안 좋다** — 그 시간만큼 화면 갱신과 사용자 입력 처리가 통째로 밀리기 때문이다.

---

## 큐가 두 개다

```
┌─────────────────────┐  ← 1순위 (먼저 전부 비움)
│  Microtask Queue    │  Promise.then(), await
└─────────────────────┘
┌─────────────────────┐  ← 2순위
│  Task Queue         │  setTimeout, setInterval
└─────────────────────┘
```

이 두 번째 큐의 공식 명칭은 **태스크 큐(task queue)** — WHATWG HTML 스펙에서 실제로 쓰는 용어다. **매크로태스크 큐(macrotask queue)**, **콜백 큐(callback queue)**라는 이름도 자료마다 자주 보이는데, 셋 다 같은 큐를 가리키는 비공식 별칭일 뿐이다. "매크로"는 마이크로태스크와 짝을 맞추려고 편의상 붙인 말이고, "콜백 큐"는 안에 콜백 함수가 쌓여있다는 뜻으로 붙은 통칭이다 — 스펙에 있는 이름은 아니다. 이 노트에서는 공식 명칭인 태스크 큐로 통일한다.

```typescript
setTimeout(() => console.log("setTimeout"), 0);
Promise.resolve().then(() => console.log("Promise"));
console.log("sync");

// 출력: sync → Promise → setTimeout
// 0ms짜리 setTimeout도 Promise보다 늦게 실행됨
```

마이크로태스크 큐를 전부 비운 다음에야 태스크 큐로 넘어간다. 그런데 두 큐를 비우는 방식이 다르다 — **마이크로태스크 큐는 한 번에 전부 비우고, 태스크 큐는 한 번에 딱 하나씩만 꺼내 실행한다.** 그리고 그 하나가 끝날 때마다, 다음 태스크로 넘어가기 전에 마이크로태스크 큐부터 다시 확인한다.

```typescript
setTimeout(() => {
  console.log("macro 1");
  Promise.resolve().then(() => console.log("macro1 안에서 만든 micro"));
}, 0);

setTimeout(() => console.log("macro 2"), 0);

// 출력: macro 1 → macro1 안에서 만든 micro → macro 2
// macro 2가 아니라, macro 1 안에서 새로 생긴 micro가 먼저 실행된다 —
// 태스크를 하나 꺼내 실행한 직후 다음 태스크로 넘어가기 전에 마이크로태스크 큐부터 다시 비우기 때문이다.
```

---

## 렌더링은 언제 끼어드는가

두 큐에 실제로 뭐가 쌓이는지 정리하면 이렇다.

- **Task Queue**: `setTimeout`/`setInterval` 콜백, 클릭 같은 이벤트 콜백 — Web API가 처리를 끝내고 등록해주는 것들
- **Microtask Queue**: `Promise.then/catch/finally`, `queueMicrotask()`, 그리고 **`MutationObserver` 콜백**도 여기 포함된다


**한 바퀴의 정의**: 이벤트 루프 한 바퀴는 이 4단계로 이뤄진다.

```
① 콜 스택 비어있는지 확인
② 마이크로태스크 큐 — 있는 거 전부 비움 (도중에 또 생기면 그것도 마저 비움)
③ (렌더링 타이밍이면) 렌더링 단계
     (a) rAF 콜백 리스트 실행  ← 먼저
     (b) Style 재계산 → Layout → Paint  ← 그다음
④ 태스크 큐 — 딱 1개만 꺼내서 실행
```

④가 끝나면 다시 ①로 돌아간다. **태스크 큐는 한 바퀴당 딱 1개**만 처리된다는 게 핵심이다.

"렌더링 단계"는 rAF 실행부터 Paint까지를 묶어 부르는 이름이고, 그 안에서 **rAF가 항상 Layout/Paint보다 먼저** 실행된다. `requestAnimationFrame` 콜백은 Task Queue·Microtask Queue와는 별도로 **자기만의 콜백 리스트**에 쌓였다가, 이 렌더링 단계가 시작되면 등록된 순서대로 가장 먼저 한꺼번에 실행되고, 그 결과(콜백 안에서 바꾼 DOM/스타일)를 반영해서 Style→Layout→Paint가 진행된다.

순서가 이런 이유: `requestAnimationFrame`은 "이번 프레임을 그리기 직전, JS에게 마지막으로 DOM을 바꿀 기회를 주는" 용도로 설계됐다. 만약 Layout/Paint를 먼저 하고 rAF를 나중에 실행한다면, rAF 콜백에서 바꾼 값은 이미 그려진 화면에 반영이 안 되고 다음 프레임까지 밀려서 애니메이션이 한 프레임씩 늦게 보인다. 그래서 항상 "rAF로 마지막 변경 반영 → 그 최종 상태를 기준으로 실제 계산해서 그리기(Layout/Paint)" 순서다.

다만 ③ 전체는 매 바퀴 실행되는 게 아니라 대략 **초당 60번(약 16.7ms 주기, 60fps)**에 맞춰서만 실행된다 — 아래 예시에서는 이해를 돕기 위해 매 바퀴 렌더링이 일어난다고 단순화했다.

### 여러 바퀴로 트레이스

```js
Promise.resolve().then(() => console.log('micro A'));
requestAnimationFrame(() => console.log('rAF A'));

setTimeout(() => {
  console.log('macro 1');
  Promise.resolve().then(() => console.log('micro from macro1'));
  requestAnimationFrame(() => console.log('rAF from macro1'));
}, 0);

setTimeout(() => {
  console.log('macro 2');
  Promise.resolve().then(() => console.log('micro from macro2'));
}, 0);

console.log('sync');
```

최초 동기 실행 때: `micro A`는 마이크로태스크 큐에, `rAF A`는 rAF 리스트에 등록되고, `macro1`/`macro2`는 타이머가 끝나면 태스크 큐에 들어갈 예정으로 대기한다. `console.log('sync')`가 실행돼 **"sync"**가 찍히고, 콜 스택이 비면서 이벤트 루프가 돌기 시작한다.

| 바퀴 | ② 마이크로태스크 비우기 | ③ 렌더링(rAF 리스트) | ④ 태스크 큐에서 1개 |
|---|---|---|---|
| 1 | `micro A` 실행 → "micro A" | `rAF A` 실행 → "rAF A" | `macro1` 실행 → "macro 1" (도중에 `micro from macro1`, `rAF from macro1`을 새로 등록) |
| 2 | `micro from macro1` 실행 → "micro from macro1" | `rAF from macro1` 실행 → "rAF from macro1" | `macro2` 실행 → "macro 2" (도중에 `micro from macro2`를 새로 등록) |
| 3 | `micro from macro2` 실행 → "micro from macro2" | 등록된 rAF 없음 → 스킵 | 태스크 큐 빔 → 대기(idle) |

최종 출력 순서:

```
sync
micro A
rAF A
macro 1
micro from macro1
rAF from macro1
macro 2
micro from macro2
```

여기서 잡아야 할 포인트: `macro 1`과 `macro 2` 사이에는 반드시 마이크로태스크 비우기 + 렌더링이 끼어든다. macro1이 실행 도중에 만든 마이크로태스크·rAF가 전부 처리되고 나서야 다음 바퀴로 넘어가 macro2 차례가 오기 때문이다. "태스크 큐는 한 번에 하나씩만"이라는 규칙이 이 간격을 만든다.

---

## async/await 내부 동작

`async/await`는 Promise를 읽기 좋게 감싼 문법이다. `await`를 만나면 함수가 스택에서 내려오고, 결과가 오면 마이크로태스크 큐를 통해 다시 올라온다.

```typescript
async function handleRequest() {
    console.log("A: 요청 들어옴");

    const user = await db.findUser(1);       // DB 쿼리 날리고 스택에서 내려옴
    console.log("B: 유저 찾음", user.name);  // 응답 오면 여기서 이어서 실행

    const posts = await db.findPosts(1);     // 또 내려감
    console.log("C: 포스트 찾음");
}

handleRequest();
console.log("D: 다른 요청 처리중");

// 출력: A → D → B → C
```

`A` 출력 후 `await` 만나는 순간 `handleRequest()`는 스택에서 내려온다. 그 사이에 `D`가 실행되고, DB 응답이 오면 마이크로태스크 큐를 통해 `B`부터 이어진다.



> 더 공부할 것: Node.js의 이벤트 루프 페이즈(timers, poll, check...) — 브라우저처럼 태스크 큐 하나가 아니라 단계별로 큐가 나뉜 구조라 여기서 다룬 내용과는 다르다. libuv, Worker Thread로 CPU 작업 분리도 함께.
