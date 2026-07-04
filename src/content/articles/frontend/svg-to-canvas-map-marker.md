---
title: "SVG 마커를 Canvas로: DOM 없이 애니메이션·클릭·DPR 다루기"
description: "D3로 그린 SVG 마커가 줌·팬에서 버벅이는 이유와, Canvas + RAF 루프로 전환해 DOM 업데이트를 없앤 과정. 히트 테스트, DPR 대응, sin 기반 애니메이션까지."
date: "2026-07-04"
category: "Frontend"
tags: ["Canvas", "SVG", "D3", "requestAnimationFrame", "성능 최적화"]
featured: false
draft: false
---

## 왜 SVG 마커는 줌에서 버벅이는가

D3로 지도를 그릴 때 마커는 보통 SVG `<circle>`로 만든다. 마커 수가 적을 때는 문제없지만, 수백 개가 쌓이면 줌·팬에서 버벅임이 생긴다.

이유는 SVG의 작동 방식에 있다. SVG는 마커 하나하나가 DOM 엘리먼트로 존재한다. 줌이 일어나면 D3 zoom 핸들러가 실행되고, 그 안에서 모든 `<circle>`의 속성(cx, cy, r, filter 등)을 하나씩 업데이트한다. 마커 300개면 DOM을 300번 건드리는 것이다. 브라우저는 이걸 반영하기 위해 레이아웃을 다시 계산하고 화면에 다시 그린다. 줌 제스처는 1초에 수십 번 발생하니 이 비용이 누적되면 프레임 드랍이 된다.

여기에 SVG 필터(`feGaussianBlur` 기반 글로우, 펄스 링 `<animate>`)까지 붙으면 더 무거워진다.

---

## 해결: SVG는 지형만, 마커는 Canvas로

지형(GeoJSON path)은 변경이 거의 없으니 SVG에 그대로 두고, 마커 레이어만 Canvas로 분리했다.

```
[container div — position: relative]
  ├── <svg>     ← 지형(province path). 줌 이벤트도 여기서 받음
  └── <canvas>  ← 마커 전용. pointer-events: none
```

Canvas는 DOM 엘리먼트가 없다. 대신 `requestAnimationFrame`(RAF) 루프가 매 프레임 전체를 지우고 다시 그린다.

RAF는 브라우저가 화면을 다시 그리기 직전에 콜백을 한 번 실행해주는 API다. 보통 1초에 60번(60fps) 호출된다. 콜백을 등록하면 브라우저가 딱 한 번만 실행하고 끝이라서, 계속 반복하려면 콜백 안에서 자기 자신을 다시 등록해야 한다.

```tsx
// requestAnimationFrame이 콜백을 호출할 때 time을 넘겨준다.
// time은 페이지가 로드된 이후 경과한 밀리초 (예: 3274.5)
const loop = (time: number) => {
  drawMarkers(time); // time을 써서 마커 애니메이션 계산
  rafId = requestAnimationFrame(loop); // 다음 프레임에 또 실행되도록 재등록
};

rafId = requestAnimationFrame(loop); // 루프 시작
```

`time`은 브라우저가 자동으로 넣어주는 값으로, 페이지 로드 이후 흐른 밀리초다. 매 프레임마다 조금씩 커지기 때문에 이걸로 애니메이션 진행률을 계산할 수 있다.

줌이 일어나도 DOM을 건드리지 않는다. 줌 핸들러는 transform을 ref에 저장하기만 하고, 다음 프레임 루프가 그 값을 읽어 마커를 새 위치에 그린다.

```tsx
const zoom = d3.zoom<SVGSVGElement, unknown>()
  .on("zoom", (event) => {
    zoomTransformRef.current = event.transform; // ref만 바꿈
    mapGroup.attr("transform", event.transform); // SVG 지형 이동
    // canvas는 RAF 루프가 다음 프레임에 자동 반영
  });
```

```tsx
const drawMarkers = (time: number) => {
  ctx.clearRect(0, 0, width, height);
  const tr = zoomTransformRef.current;

  ctx.save();
  ctx.translate(tr.x, tr.y);
  ctx.scale(tr.k, tr.k); // 줌 배율에 맞게 마커도 스케일

  for (const d of sorted) {
    if (!filters.has(d.status)) continue;
    const proj = projection([d.longitude, d.latitude]);
    if (!proj) continue;
    const [x, y] = proj;

    // 화면 밖은 스킵 (불필요한 드로잉 제거)
    const sx = tr.applyX(x), sy = tr.applyY(y);
    if (sx < -20 || sx > width + 20 || sy < -20 || sy > height + 20) continue;

    // 마커 드로우 ...
  }
  ctx.restore();
};
```

마커에 애니메이션(펄스 링, 글로우)이 있어서 어차피 매 프레임 다시 그려야 했다. 그러면 줌·선택·필터 상태 변화도 자연스럽게 같이 반영된다 — 상태가 바뀌면 ref만 업데이트하면 끝이고, 다음 프레임 루프가 읽어서 처리한다.

---

## 애니메이션: SVG `<animate>` → `Math.sin(time)`

SVG에서는 펄스 링을 각 마커에 `<animate>` 태그를 직접 붙여서 브라우저가 돌려줬다.

```tsx
// 수정 전 — 마커마다 <animate> DOM 엘리먼트 2개씩 생성
pulsePoints.forEach((d) => {
  const ring = pulseGroup.append("circle").attr("r", 7).attr("opacity", 0.7);
  const dur = d.status === "fault" ? "1.8s" : "2.5s";

  ring.append("animate")
    .attr("attributeName", "r")
    .attr("values", "7;20;7")      // r이 7→20→7 반복
    .attr("dur", dur)
    .attr("repeatCount", "indefinite");

  ring.append("animate")
    .attr("attributeName", "opacity")
    .attr("values", "0.7;0;0.7")  // opacity가 0.7→0→0.7 반복
    .attr("dur", dur)
    .attr("repeatCount", "indefinite");
});
```

마커 하나의 실제 DOM 구조는 이렇게 됐다.

```xml
<circle class="marker-glow">        ← 글로우 원
  <animate attributeName="opacity"/> ← 타이머 1
</circle>

<circle class="marker"/>            ← 메인 원 (animate 없음)

<circle class="pulse-ring">         ← 펄스 링
  <animate attributeName="r"/>      ← 타이머 2
  <animate attributeName="opacity"/> ← 타이머 3
</circle>
```

마커 하나에 타이머 3개. fault/active 마커가 50개면 타이머 150개가 동시에 돌고, 브라우저가 이걸 각자 관리한다.

Canvas에는 DOM도, 타이머도 없다. 대신 RAF가 매 프레임 넘겨주는 `time`(경과 밀리초) 하나로, "지금 얼마나 반복됐는지"를 매번 새로 계산한다. 반복에는 두 가지 모양이 있다.

- **톱니파** — 0→1까지 갔다가 뚝 끊기고 다시 0으로. 펄스 링처럼 "쫙 퍼졌다 순간 리셋"되는 움직임에 맞다.
- **파도** — -1→1을 부드럽게 오르내림. 글로우처럼 "숨쉬듯" 은은하게 변하는 움직임에 맞다.

**펄스 링 (톱니파, `%` 나머지 연산)**

```tsx
const period = 2000; // 2초마다 한 번 반복
const tc = (time % period) / period; // 0 → 1 → 0 → 1 무한 반복

const ringR = r + 12 * tc;     // tc=0: 원래 크기 / tc=1: 12px 더 커짐
const ringOp = 0.7 * (1 - tc); // tc=0: 진하게(0.7) / tc=1: 투명(0)
```

`time % period`(나머지 연산)는 `time`이 아무리 커져도 0~`period` 사이 값만 돌려준다. 그걸 다시 `period`로 나누면 0~1 사이 비율 `tc`가 된다. `time`이 흐르면서 `tc`는 0→1로 갔다가, `period`를 넘는 순간 다시 0으로 뚝 떨어진다 — 이게 "쫙 퍼지고 순간 리셋"되는 펄스 링의 정체다.

**글로우 (파도, `Math.sin`)**

```tsx
glowOp = 0.25 + 0.2 * Math.sin(time / 1000 * Math.PI);
//        중간값   진폭
```

`Math.sin`은 넣는 값이 커질수록 -1~1 사이를 부드럽게 왔다 갔다 하는 파도 함수다. `time`은 밀리초라서 `sin`이 원하는 각도 단위가 아니지만, 그 변환 과정은 몰라도 된다 — 중요한 건 결과뿐이다. `-1 * 0.2 = -0.2` ~ `1 * 0.2 = 0.2`이니, `glowOp`는 결국 `0.25 - 0.2 = 0.05`(어두울 때)와 `0.25 + 0.2 = 0.45`(밝을 때) 사이를 부드럽게 오간다.

두 코드 다 원리는 같다. **RAF가 주는 `time` 하나를 식에 넣고, 매 프레임 다시 계산할 뿐** — SVG처럼 마커마다 타이머를 따로 돌릴 필요가 없다.

---

## 히트 테스트: Canvas는 클릭이 없다

SVG는 각 `<circle>`이 DOM 엘리먼트라 자연스럽게 `.on("click")`이 된다. Canvas는 픽셀 덩어리라 어느 마커를 클릭했는지 직접 계산해야 한다.

마우스 좌표와 각 마커의 화면 좌표 사이 거리를 구해서, 마커 반경 안에 들어오면 hit으로 판단한다.

여기서 탐색 순서가 중요하다. `drawMarkers`는 `sorted` 배열을 앞에서부터 순서대로 그린다(`for (const d of sorted)`). Canvas는 페인트 통에 덧칠하는 것과 같아서, **나중에 그린 게 먼저 그린 것 위를 덮는다.** 즉 `sorted[0]`이 제일 먼저 그려져 맨 아래 깔리고, `sorted[sorted.length - 1]`이 제일 마지막에 그려져 맨 위에 보인다.

```
그리는 순서:  sorted[0] → sorted[1] → sorted[2]
화면상 위치:   맨 아래   →   중간    →  맨 위 (마지막에 그려짐)
```

두 마커가 겹쳐 있으면 사용자 눈에는 배열 뒤쪽(`sorted[2]`)만 보인다. 그런데 `hitTest`를 앞에서부터(`sorted[0]`부터) 훑으면, 화면엔 안 보이는 `sorted[0]`이 먼저 걸려서 엉뚱한 마커가 선택된다. 그래서 배열을 거꾸로(`sorted.length - 1`부터 `0`까지) 훑어서, 화면에 실제로 보이는 맨 위 마커부터 먼저 검사하는 것이다.

```tsx
const hitTest = (screenX: number, screenY: number): PointItem | null => {
  const tr = zoomTransformRef.current;
  for (let i = sorted.length - 1; i >= 0; i--) { // 역순 = 위에 그려진 것 먼저
    const d = sorted[i];
    if (!activeFiltersRef.current.has(d.status)) continue;
    const proj = projection([d.longitude, d.latitude]);
    if (!proj) continue;
    const sx = tr.applyX(proj[0]); // SVG 좌표 → 화면 좌표
    const sy = tr.applyY(proj[1]);
    const hitR = d.equipmentId === selectedIdRef.current ? 8 : 6;
    if ((screenX - sx) ** 2 + (screenY - sy) ** 2 <= hitR * hitR) return d;
  }
  return null;
};

// canvas는 pointer-events: none. 이벤트는 SVG에서 받아 hitTest로 판단
svg.on("click", (event: MouseEvent) => {
  const [mx, my] = d3.pointer(event);
  const hit = hitTest(mx, my);
  onSelectRef.current(hit?.equipmentId ?? null);
});
```

---

## DPR 대응: Retina에서 흐릿하게 보이는 문제

Retina 디스플레이는 `devicePixelRatio`가 2이다. CSS로 `300px`이지만 실제 물리 픽셀은 `600px`인데, canvas 버퍼를 `300×300`으로 만들면 2배로 늘려 표시하면서 흐려진다.

```tsx
const dpr = window.devicePixelRatio || 1;
canvas.width = width * dpr;    // 버퍼는 물리 픽셀 크기로
canvas.height = height * dpr;
canvas.style.width = `${width}px`;   // CSS는 논리 픽셀 크기 유지
canvas.style.height = `${height}px`;
ctx.scale(dpr, dpr); // 이후 모든 드로잉이 DPR배로 확대됨
```

이 대응이 필요한 건 **마커(Canvas)뿐**이다. 지형(SVG)은 벡터 그래픽이라 애초에 해상도 개념이 없어서, 어떤 화면에서든 항상 선명하게 다시 그려진다. 반면 Canvas는 "몇 개의 점으로 그릴지"를 코드에서 픽셀 단위로 직접 정해야 하는 비트맵이라, 이 처리가 없으면 레티나 화면에서 마커(원, 펄스 링, 글로우)만 흐릿하게 보인다.

`ctx.scale(dpr, dpr)`을 한 번 해두면, 그 뒤로는 `drawMarkers` 안에서 마커를 그릴 때 DPR을 신경 쓸 필요가 없다. 좌표·반지름을 원래 쓰던 논리 픽셀(CSS 픽셀) 단위 그대로 넘기면, `ctx.scale`이 이미 걸려 있어서 자동으로 물리 픽셀에 맞게 그려진다.

```tsx
// drawMarkers 안 — dpr을 몰라도 됨, 원래 좌표 그대로 사용
ctx.beginPath();
ctx.arc(x, y, r, 0, Math.PI * 2); // x, y, r: 논리 픽셀 단위
ctx.fillStyle = cfg.color;
ctx.fill();
```

---

## 정리

| | SVG 마커 | Canvas + RAF |
|---|---|---|
| 줌·팬 시 부담 | DOM n번 업데이트 | ref만 바꿈, DOM 접근 없음 |
| 애니메이션 | `<animate>` 태그 | `Math.sin(time)` |
| 클릭 이벤트 | 엘리먼트별 자동 | 직접 히트 테스트 |
| 선명도 | 자동 | DPR 수동 대응 필요 |

마커 수가 적거나 애니메이션이 없으면 SVG가 더 단순하다. 마커가 많고, 애니메이션이 있고, 줌·팬이 빠르게 일어나는 상황이라면 Canvas가 맞다.

---

## 참고: Canvas 말고 CSS Transform이나 WebWorker가 맞는 상황도 있다

이번 글은 마커를 "Canvas로 직접 그리는" 방법을 다뤘지만, 항상 정답은 아니다. 상황에 따라 다른 두 도구가 더 나을 수 있다.

**CSS Transform** — 엘리먼트를 픽셀 단위로 다시 그리지 않고, GPU가 이미 그려둔 레이어를 이동·확대·회전만 시킨다. 브라우저 렌더링 파이프라인(Layout → Paint → Composite) 중 마지막 Composite 단계만 타기 때문에 Layout·Paint 재계산을 건너뛴다. 그래서 마커 위치를 옮기는 정도라면, Canvas로 매 프레임 다시 그리는 것보다 `transform: translate(...)`로 옮기는 게 더 가벼울 수 있다. 다만 마커가 수백 개 이상으로 DOM 엘리먼트 자체가 많아지면, 이번 글에서 다룬 "DOM 업데이트 비용" 문제가 그대로 돌아온다 — Transform은 옮기는 비용만 줄여줄 뿐, DOM 개수가 많다는 문제 자체는 해결하지 못한다.

**WebWorker** — 메인 스레드가 50ms 넘게 묶이면 스크롤·클릭 같은 사용자 입력이 씹힌다. 좌표 변환, 클러스터링, JSON 파싱처럼 "화면을 직접 안 건드리는 무거운 계산"을 워커 스레드로 넘기면 메인 스레드는 그 시간 동안 그리기와 입력 처리에 집중할 수 있다. 이번 글의 `drawMarkers`처럼 매 프레임 실행돼야 하는 코드엔 안 맞고(워커와 메인 스레드 간 메시지 왕복 비용이 붙는다), 데이터가 들어올 때 한 번 무겁게 전처리하는 구간에 맞는 도구다.

세 가지를 정리하면, **"뭘 다시 그려야 하는가"**로 고르면 된다 — 픽셀을 직접 조작해야 하면 Canvas, 이미 그려진 걸 옮기기만 하면 CSS Transform, 화면과 무관한 무거운 계산이면 WebWorker.

> [브라우저 렌더링 최적화: Canvas vs CSS Transform, 그리고 WebWorker](https://ramirami.tistory.com/228) 참고.
