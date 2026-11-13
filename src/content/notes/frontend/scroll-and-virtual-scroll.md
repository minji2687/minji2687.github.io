---
title: "스크롤 값 3가지와 가상 스크롤(Virtual Scroll)의 원리"
description: "scrollTop·clientHeight·scrollHeight의 의미, scroll 이벤트, 보이는 행만 그리는 가상 스크롤의 원리와 '행 높이 고정' 가정이 깨질 때 생기는 떨림·React #185 무한 렌더링까지 정리한다."
date: "2026-11-13"
tags: ["Scroll", "Virtual Scroll", "React", "DOM", "Performance"]
draft: true
---

> 초안. 대용량 테이블 스크롤이 떨리다가 작은 모니터에서는 화면이 하얗게 되는(React #185) 이슈를 분석하면서 정리한 노트.

## 1. 스크롤 값 3가지

**창문으로 긴 종이를 본다**고 생각하면 쉽다.

```txt
                ┬  ┌────────────────────┐  ┬
                │  │                    │  │ scrollTop
                │  │                    │  │ = 위로 지나간 길이
                │  ┢━━━━━━━━━━━━━━━━━━━━┪  ┴  ┬
  scrollHeight  │  ┃                    ┃     │ clientHeight
                │  ┃                    ┃     │ = 지금 보이는 영역(굵은 테두리)
                │  ┡━━━━━━━━━━━━━━━━━━━━┩     ┴
                │  │                    │
                │  │                    │  아래 아직 안 본 영역
                ┴  └────────────────────┘
```

| 이름 | 뜻 | 비유 | 언제 바뀌나 |
| --- | --- | --- | --- |
| `scrollHeight` | 내용 **전체** 높이 | 종이 전체 길이 | 내용이 늘거나 줄 때 |
| `clientHeight` | **보이는 영역** 높이 | 창문 높이 | 박스 크기가 바뀔 때만 |
| `scrollTop` | **얼마나 내렸는지** (위치) | 종이를 밀어 올린 길이 | 스크롤할 때마다 (0 = 맨 위) |

{% callout type="warning" title="clientHeight는 브라우저 창 높이가 아니다" %}
요소마다 따로 있는 값으로, "그 요소 안쪽에서 보이는 높이"다. 브라우저 창 높이는 `window.innerHeight`(스크롤바 포함) 또는 `document.documentElement.clientHeight`(스크롤바 제외).
{% /callout %}

```js
// 맨 아래까지 내렸나? (소수점 오차 때문에 몇 px 여유)
el.scrollTop + el.clientHeight >= el.scrollHeight - 2

// 맨 아래로 이동
el.scrollTop = el.scrollHeight - el.clientHeight

// 특정 항목이 보이도록 이동 — 직접 계산할 필요 없음
item.scrollIntoView({ block: 'nearest' })
```

직접 확인: 개발자도구 Elements에서 스크롤 박스를 선택하고 Console에 `$0.clientHeight, $0.scrollHeight, $0.scrollTop` 입력. 스크롤 후 다시 입력하면 `scrollTop`만 바뀐다.

## 2. scroll 이벤트

스크롤 위치가 바뀔 때마다 발생한다. 이벤트 안에서 위의 세 값을 읽어 "맨 아래인지", "몇 번 행부터 보이는지"를 판단한다.

```tsx
<div ref={bodyRef} onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)} />
```

- **자주 발생한다.** 휠 한 번에도 여러 번 들어온다. 무거운 계산은 `requestAnimationFrame`으로 프레임당 한 번만.
- **버블링되지 않는다.** 실제로 스크롤되는 박스에 붙여야 한다. 바깥 레이아웃이 대신 스크롤되면 안쪽 핸들러는 안 불린다.
- **코드로 `scrollTop`을 바꿔도 발생한다.** 핸들러에서 `scrollTop`을 고치면 자기 자신을 또 부를 수 있다.
- "보이는지"만 알면 되는 경우(무한 스크롤 바닥 감지 등)는 `IntersectionObserver`가 더 가볍다.

## 3. 가상 스크롤(Virtual Scroll)의 원리

행이 수천 개면 DOM도 수천 개라 느려진다. 가상 스크롤은 **보이는 행 + 위아래 여유분만 진짜로 그리고**, 나머지 자리는 **빈 div의 height로만 채워서** 스크롤바가 진짜처럼 보이게 한다.

예시: 1000행, 행 높이 40px, 스크롤 박스 400px(10줄), 여유분 5줄, `scrollTop = 2000`.

```txt
  ┌────────────────────┐ 0px
  │                    │  상단 빈 div: height = startIndex × 40 = 45 × 40 = 1,800px
  │                    │  (안 그린 0~44번 행 45개가 차지했을 자리)
  ├────────────────────┤ 1,800px
  │ row 45             │  ┐
  │ ...                │  │ 진짜로 그린 행 20개 (45~64번) = 800px
  │ row 64             │  ┘
  ├────────────────────┤ 2,600px
  │                    │  하단 빈 div: height = (total − endIndex) × 40 = 935 × 40 = 37,400px
  │                    │  (안 그린 65~999번 행 935개가 차지했을 자리)
  └────────────────────┘ 40,000px  ← 1000행을 다 그렸을 때와 같은 길이
```

```tsx
<div style={{ height: startIndex * ROW_HEIGHT }} />              {/* 상단 빈 div */}
{rows.slice(startIndex, endIndex).map((row) => <Row key={row.id} />)}
<div style={{ height: (total - endIndex) * ROW_HEIGHT }} />      {/* 하단 빈 div */}
```

그릴 구간은 이렇게 구한다.

```js
const visibleCount = Math.ceil(clientHeight / ROW_HEIGHT)                    // 400 / 40 = 10줄
const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER)  // 2000 / 40 = 50번 → 45번
const endIndex = Math.min(total, startIndex + visibleCount + BUFFER * 2)     // 45 + 10 + 10 = 65번
```

{% callout type="warning" title="startIndex / endIndex는 '진짜로 그리는 구간'의 번호" %}
전체 데이터의 처음·끝(0, 999)이 아니다.

- `startIndex = 45` → 45번부터 그린다
- `endIndex = 65` → **65번부터는 안 그린다** (마지막으로 그린 64번의 바로 다음 번호. `slice`처럼 끝은 포함하지 않음)
{% /callout %}

스크롤하면 `scrollTop`이 바뀌고 → 구간을 다시 계산하고 → 그리는 행과 빈 div 높이가 바뀐다. DOM에는 항상 20줄 정도만 있다.

### 핵심: 왜 행 높이 값이 중요한가

**안 그린 행은 높이를 잴 수가 없다.** 그래서 코드는 "모든 행이 `ROW_HEIGHT`(사례에서는 41px)"라고 믿고 계산할 수밖에 없다. 이 값이 가상 스크롤의 핵심 계산 두 군데에 다 들어간다.

1. **지금 몇 번 행을 봐야 하나** → `scrollTop ÷ ROW_HEIGHT`
2. **안 그린 자리를 얼마나 비워둘까** → 빈 div height = `행 개수 × ROW_HEIGHT`

실제 행이 이 값과 다르면 둘 다 틀린다. 예를 들어 41px로 계산하는데 실제 행이 평균 70px이면:

| | 코드가 믿는 값 (41px) | 실제 (70px) |
| --- | --- | --- |
| 45번 행의 위치 | 45 × 41 = 1,845px | 45 × 70 = 3,150px |
| `scrollTop = 3150`일 때 보이는 행 | 3150 ÷ 41 = **76번** | **45번** |

→ 엉뚱한 행을 그린다. 게다가 **어떤 20줄을 그리느냐에 따라 전체 높이(`scrollHeight`)가 매번 달라진다**(긴 행이 끼면 길어지고 빠지면 짧아짐). 스크롤 위치를 보정할수록 그리는 행이 바뀌고, 높이가 또 바뀌는 루프가 생긴다.

> 행 높이 값은 "보이지 않는 행들이 어디에 있는지"를 추정하는 유일한 근거다. 실제 높이와 같아야 모든 계산이 맞는다.

## 4. 사례: 고정 높이 가정이 깨져서 생긴 떨림과 React #185

- 공통 테이블이 **100건을 넘으면 가상 스크롤**을 켜고 **모든 행을 41px로 계산**
- 그런데 한 화면의 테이블은 셀 내용이 1~5줄이라 **실제 행 높이가 41~100px 이상**
- 큰 모니터: 맨 아래 근처에서 **스크롤 떨림** / 작은 모니터: **화면 전체가 하얘짐** (`Minified React error #185`)

{% callout type="error" title="React #185 = Maximum update depth exceeded" %}
상태 변경 → 리렌더 → effect에서 또 상태 변경이 50번을 넘게 반복되면 React가 앱을 멈춘다. 앱이 통째로 언마운트되어 화면이 하얗게 된다.
{% /callout %}

테이블에는 scrollTop을 안전한 범위로 보정하고, 맨 아래인지 다시 판정해서 리렌더하는 effect가 있었다. 그리고 그릴 구간을 맨 아래일 때는 "마지막 N줄", 아닐 때는 "`scrollTop ÷ 41`"로 **서로 다른 방식**으로 계산했다. 행이 전부 41px면 두 결과가 같지만, 아니면 달라진다.

{% flow title="수렴하지 않는 보정 루프" caption="몇 번 만에 맞아떨어지면 '떨림', 50번을 넘기면 React #185." %}
{% box title="맨 아래 근처까지 스크롤" desc="맨 아래 판정 true → 마지막 N줄 그림" /%}
{% box title="실제 행이 41px보다 큼" desc="scrollHeight가 계산과 달라짐" tone="amber" arrow="①" /%}
{% box title="보정 effect 실행" desc="맨 아래 판정 false → setState → 리렌더" tone="blue" arrow="②" /%}
{% box title="scrollTop ÷ 41로 다시 계산" desc="그리는 행이 바뀜 → 빈 div 높이 변경 → scrollHeight 또 변경" tone="blue" arrow="③" /%}
{% box title="scrollTop이 범위 밖" desc="맨 아래로 당김 → 판정 true → 다시 ①" tone="amber" arrow="④" /%}
{% /flow %}

**작은 모니터에서만 하얘진 이유**: 그리는 줄 수가 적을수록 긴 행 하나가 들어오고 빠지는 영향이 커서, 루프가 수렴하지 못하고 50번을 넘겼다.

**해결**: 가변 높이인 그 테이블만 가상 스크롤을 끄는 옵션(`autoRowHeight`)을 연결했다. 근본 해결(실제 높이 측정)은 후속 과제.

{% callout type="success" title="배운 점" %}
- 가상 스크롤의 모든 계산은 "행 높이를 안다"는 가정 위에 있다.
- effect에서 DOM 값을 읽고 → 상태를 바꾸고 → 그게 다시 DOM 값을 바꾸는 구조는 수렴이 보장 안 되면 무한 루프가 된다.
- 스크롤·레이아웃 버그는 작은 화면에서도 꼭 확인할 것.
{% /callout %}
