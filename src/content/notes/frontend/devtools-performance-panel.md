---
title: "Chrome DevTools Performance 탭 읽는 법"
description: "Lighthouse가 점수와 진단을 주는 도구라면, Performance 탭은 실제 실행 과정을 그대로 녹화해서 보여주는 도구다. 녹화 방법부터 Insights 패널, 타임라인 트랙, 메인 스레드 플레임 차트, 하단 Summary/Bottom-Up/Call Tree/Event Log까지 각 영역이 뭘 보여주는지 정리한다."
date: "2026-07-26"
tags: ["Chrome DevTools", "Performance", "Web Performance", "Core Web Vitals"]
draft: true
---


![Performance 탭 녹화 결과 UI — 좌측 Insights 패널(LCP breakdown, Layout shift culprits 등), 상단 CPU/스크린샷 오버뷰(LCP 1.87s, CLS 0.04), Network/Frames/Timings/Layout shifts 트랙과 Main 스레드 플레임 차트, 하단 Summary 탭](/images/_drafts/devtools-performance/performance-tab-overview.png)

브라우저를 새로고침 녹화한 결과고, 아래 설명은 전부 이 화면의 각 영역을 가리킨다.

[Lighthouse 노트](/notes/frontend/lighthouse-performance-metrics)가 "점수가 몇 점이고 뭘 고치면 좋을지"를 알려주는 도구라면, DevTools의 **Performance 탭**은 "실제로 브라우저가 그 시간 동안 뭘 하고 있었는지"를 함수 호출 단위로 그대로 녹화해서 보여주는 도구다. Lighthouse로 "LCP가 느리다"는 걸 알았다면, Performance 탭으로 "왜 느린지, 어떤 함수가 메인 스레드를 얼마나 붙잡고 있었는지"를 찾는 식으로 이어서 쓰게 된다.

---

## 녹화하기

새로고침 아이콘(⟳)을 누르면 페이지를 리로드하면서 자동으로 녹화 → 로딩 완료 시점에 자동으로 멈춰준다. 로딩 성능(LCP, CLS 등)을 볼 때 쓰는 방법이라 지금은 이것만 쓰고 있다.

> 좌측 원형 버튼으로 하는 수동 녹화(특정 인터랙션 구간만 잡을 때 씀), `Screenshots` 체크박스는 아직 직접 확인 안 함 — 써보고 추가할 것.

---

## 상단 오버뷰 스트립

![상단 오버뷰 스트립 — 위에서부터 병목 구간을 표시하는 눈금자, CPU 사용률 그래프, NET(네트워크 요청 밀도), 스크린샷 필름스트립 순서로 압축 표시된다](/images/_drafts/devtools-performance/overview-strip.png)

녹화 결과 상단에는 압축된 형태로 네 가지 정보가 위에서 아래로 쌓여 표시된다.

- **눈금자 + 빨간/분홍 막대** — 특정 작업이 메인 스레드를 오랫동안 붙잡고 있었다는 병목 신호. 이 막대만 먼저 훑어도 로딩 구간 전체에서 어디가 막혀 있었는지 대략 짚을 수 있다.
- **CPU 사용률 그래프** — 그냥 사용률만 보여주는 게 아니라 **그 시간에 CPU가 어떤 종류의 작업에 쓰이고 있었는지를 색으로 구분**해서 보여준다 — 아래 Main 트랙에서 쓰는 색 코드와 동일하게, 노란색은 자바스크립트 실행, 보라색은 렌더링/레이아웃, 초록색은 페인팅, 회색은 기타 시스템 작업이다. 그래서 이 그래프만 훑어봐도 로딩 초반에 스크립트 실행이 병목이었는지, 후반에 레이아웃/페인트가 병목이었는지 대략 감이 온다. 그래프가 계속 채워져 있는 구간은 메인 스레드가 쉬지 않고 뭔가 실행 중이었다는 뜻이고, 그 구간을 드래그로 선택하면 아래 타임라인이 그 구간으로 확대된다.
- **NET(네트워크 요청 밀도)** — 아래 Network 트랙을 압축한 형태. 요청이 몰린 구간과 뜸한 구간을 한눈에 구분할 수 있다.
- **스크린샷 필름스트립** — 로딩 과정을 일정 간격으로 캡처해 나열한 것. 화면이 실제로 어떤 순서로 채워졌는지 빠르게 훑어볼 때 쓴다.

상단에는 **LCP / INP / CLS** 세 값이 요약으로 뜬다 — 이 녹화 세션 하나에서 측정된 필드가 아니라 랩(재현) 값이라는 점은 Lighthouse와 같다.

---

## 좌측 Insights 패널

![Insights 패널 영어/한국어 비교 — LCP breakdown, LCP request discovery, Layout shift culprits, Render-blocking requests, Network dependency tree, 3rd parties, Forced reflow, Use efficient cache lifetimes, Legacy JavaScript 항목이 카드 형태로 나열되고 하단에 Passed insights가 접혀 있다](/images/_drafts/devtools-performance/insights-panel-en-ko.png)

최신 DevTools는 녹화 결과 왼쪽에 **Insights** 사이드바를 붙여준다. "여기 문제가 있을 수 있다"고 자동으로 짚어주는 항목들인데, 화면에 뜨는 걸 보면:

- **LCP breakdown** — LCP가 발생하기까지 시간이 어디에 쓰였는지 구간별(TTFB, 리소스 로드 지연, 로드 시간, 렌더 지연)로 쪼개서 보여줌
- **Layout shift culprits** — CLS를 유발한 요소가 정확히 뭔지 짚어줌
- **Network dependency tree** — 요청들이 서로 어떤 순서로 의존하는지(이 리소스가 끝나야 저 리소스가 시작하는지) 트리로 보여줌. 체인이 길수록 로딩이 늦어짐
- **Optimize DOM size** — DOM 노드 수가 너무 많으면 경고
- **3rd parties** — 서드파티 스크립트가 메인 스레드를 얼마나 차지했는지
- **Forced reflow** — JS가 스타일 읽기/쓰기를 번갈아 하면서 브라우저가 레이아웃을 강제로 동기 재계산하게 만든 지점(레이아웃 스래싱)
- **Use efficient cache lifetimes** — 캐시 헤더가 짧게 잡혀 있어서 아낄 수 있는 용량을 추정

이 중 문제가 감지되지 않은 항목은 **Passed insights**로 접혀 들어간다. 각 항목을 클릭하면 아래 타임라인에서 해당 구간이 하이라이트된다 — "이게 문제다"만 알려주는 게 아니라 "타임라인 어디를 봐야 하는지"까지 바로 연결해주는 것.

---

## 타임라인 트랙

### Network

![Network 트랙 확대 — 요청 막대 하나가 왼쪽 회색 선, 옅은 색 영역, 짙은 색 영역, 오른쪽 회색 선으로 구성된 모습](/images/_drafts/devtools-performance/network-track-zoom.png)

요청 하나하나가 막대로 표시되는데, 막대는 크게 두 구간으로 나뉜다.

- **얇은 선 구간** — 요청이 아직 실제 데이터를 받지 못하고 대기 중이던 시간. 커넥션 연결, DNS 조회, 서버 응답 대기(TTFB)가 여기 포함된다
- **두꺼운 색 블록 구간** — 실제로 서버로부터 응답 데이터를 다운로드하고 있던 시간. 블록 색상은 리소스 종류를 구분하는데, 파란색은 스크립트(JS), 회색은 문서/기타 리소스를 나타낸다

스크린샷의 두 요청을 비교해보면 이 구분이 바로 눈에 들어온다. 첫 번째(파란색) 요청은 약 80ms에 시작해 100ms 이전에 끝나는 짧은 요청이고, 두 번째(회색) 요청은 약 270ms에 시작해서 얇은 선(대기) 구간이 꽤 길게 이어지다가 330~350ms 사이에 실제 다운로드(두꺼운 블록)가 일어나고 끝난다. 이렇게 **대기 구간(얇은 선)이 유독 긴 요청**은 서버 응답이 늦었거나 커넥션 병목이 있었을 가능성을 의심해볼 수 있는 신호다.

### Frames

![Frames 트랙 확대 — 각 프레임 블록 위에 지속 시간(400.0ms, 600.4ms, 332.5ms)이 표시되고, 블록 안에는 그 시점의 화면 스냅샷 썸네일이 들어 있다](/images/_drafts/devtools-performance/frames-track-zoom.png)

화면에 변화가 생길 때마다 그 시점의 스크린샷을 찍어서 프레임 단위로 보여주는 트랙이다. 각 프레임 블록에는 두 가지 정보가 같이 담긴다.

- **블록 위 숫자** — 그 프레임이 화면에 유지된 시간, 즉 다음 프레임이 그려지기까지 걸린 시간
- **블록 안 썸네일** — 그 시점에 실제로 화면이 어떻게 보였는지의 스냅샷

일반적으로 부드러운 애니메이션 기준(60fps ≈ 16.7ms)보다 훨씬 긴 프레임(수백 ms 단위)이 있다면, 그 구간에서 렌더링이 느리거나 화면이 멈춘 것처럼 보였다는 신호다. 위 스크린샷을 예로 들면, 첫 프레임은 400ms 동안 유지됐는데 썸네일이 빈 화면(검은색)이다 — 그만큼 초기 콘텐츠가 그려지기까지 지연이 있었다는 뜻이다. 두 번째 프레임은 600.4ms나 유지되면서 그제서야 콘텐츠가 채워진 화면이 나타났고, 세 번째는 332.5ms 유지된 프레임이다. 상단 오버뷰의 필름스트립보다 훨씬 촘촘한 간격으로 찍히기 때문에, 로딩 과정에서 화면이 정확히 어떤 순서로 채워졌는지(레이아웃이 비어있다가 채워지는지, 이미지가 갑자기 튀어나오는지) 프레임 단위로 되짚어볼 수 있다.

### Timings

![Timings 트랙 확대 — React Tree Reconciliation 아래 App [mount] → Header [mount] → styled.div [mount] 순으로 컴포넌트별 렌더링 시간이 트리 구조로 중첩되어 표시된 모습](/images/_drafts/devtools-performance/timings-track-tree.png)

어떤 React 컴포넌트가 렌더링될 때 얼마나 시간이 걸렸는지를 트리 구조로 보여주는 트랙이다.

- 위에서 아래로 갈수록 부모-자식 관계다 — 위 스크린샷처럼 App 안에 Header, Header 안에 styled.div가 들어있는 식이다
- 막대의 가로 길이가 길수록 그 컴포넌트가 렌더링에 오래 걸렸다는 뜻이다 — 예를 들어 `App [mount]`에 걸린 시간 중 대부분을 `Header [mount]`가 차지하고 있다는 게 한눈에 보인다
- 막대에 마우스를 올리면 이름과 걸린 시간이 툴팁으로 뜨고, 클릭하면 아래쪽에 더 자세한 시간 정보가 나온다

넓은 막대가 있으면 거기가 느린 부분이라는 신호다.

### Layout shifts
CLS를 유발한 시프트가 발생한 시점에 보라색 다이아몬드로 표시된다. 스크린샷에서 LCP 직후(약 1.9초 지점)에 시프트가 하나 찍혀 있었는데, 이렇게 **LCP와 레이아웃 시프트가 같은 시점 근처에서 겹치면** — LCP 요소가 자리를 잡으면서 그 여파로 주변 레이아웃이 같이 흔들렸을 가능성을 의심해볼 수 있다.

### Main — 메인 스레드 플레임 차트

![Main 트랙 확대 — Task 줄에 빨간 사선 줄무늬(Long Task), 그 아래 Parse HTML → Evaluate script → (anonymous) → webpackJsonpCallback → __webpack_require__ 순으로 호출 스택이 쌓이고, node_modules 구간은 On ignore list로 접힌 모습](/images/_drafts/devtools-performance/main-track-flame-chart.png)

특정 시점에 메인 스레드가 정확히 무슨 함수를 실행하고 있었는지 보여주는 **플레임 차트**다.

- **가로축**은 시간, **세로로 쌓인 막대**는 함수 호출 스택이다. 위에 있는 막대가 바깥쪽 호출이고 아래로 갈수록 그 안에서 호출된 더 안쪽 함수다 — 예를 들어 위 스크린샷에서는 `Evaluate script` 안에서 `(anonymous)` → `webpackJsonpCallback` → `__webpack_require__` 순으로 계속 파고 들어간다
- **막대 색**은 작업 종류를 뜻한다 — 파란색(로딩/파싱, 예: Parse HTML), 노란색(스크립팅/JS 실행), 보라색(렌더링/레이아웃, 예: Layout), 민트색(React DevTools 같은 특정 라이브러리 코드)
- 맨 위 `Task` 줄의 **빨간 사선 줄무늬**가 가장 중요하다. 메인 스레드가 50ms 이상 끊기지 않고 계속 일하고 있었다는 Long Task 경고로, 이 구간에서는 화면 갱신이나 클릭·스크롤 같은 사용자 입력에 반응할 수 없다 — 실제로 사용자가 "멈췄다"고 느끼는 구간이다
- 아래쪽 개별 막대(예: `Layout`) 오른쪽 위 모서리의 **작은 빨간 삼각형**은 성격이 다르다. Task 줄의 빗금이 "태스크 전체 구간 중 임계치를 넘긴 시간대"를 나타내는 요약 표시라면, 이 삼각형은 그 이벤트 하나에 달린 구체적인 경고다 — 예를 들어 Layout 이벤트라면 강제 리플로우(Forced reflow)처럼 그 이벤트 자체의 성능 문제를 가리킨다. 마우스를 올리거나 클릭하면 경고 내용을 툴팁이나 하단 Summary 탭에서 확인할 수 있다
- `node_modules`처럼 내가 작성하지 않은 코드는 `On ignore list`로 접혀서 노이즈가 줄어든다(Settings에서 특정 경로를 ignore list에 등록 가능)

**보는 법**: 막대를 클릭하면 하단에 함수 이름·소요 시간·파일 위치가 자세히 나오고, 마우스만 올려도 툴팁으로 간단히 볼 수 있다. 너무 좁아서 안 보이면 트랙 위쪽 미니맵을 드래그해서 그 구간만 확대할 수 있다. 핵심은 빨간 줄무늬가 있는 Task를 먼저 찾고, 그 아래로 내려가며 가장 넓은 막대(=가장 오래 걸린 함수)를 따라가는 것이다.

### 마커 (Nav / DCL / FCP / LCP)

![Main 트랙 위 마커 확대 — Nav, DCL, FCP, LCP가 타임라인에 세로선/라벨로 찍힌 모습](/images/_drafts/devtools-performance/main-track-markers.png)

타임라인에 세로선으로 찍힌다.
- **Nav** — Navigation Start. 브라우저가 해당 페이지로 이동을 시작한 시점, 사실상 로딩이 시작된 기준점이다
- **DCL** — DOMContentLoaded. HTML 문서를 다 파싱하고 DOM 트리 구성이 끝난 시점을 뜻하며, 아직 이미지나 스타일시트 같은 외부 리소스 로딩까지 다 끝난 건 아니다
- **FCP** — First Contentful Paint. 텍스트나 이미지 등 무언가 처음으로 화면에 그려진 시점 — 사용자 입장에서 "뭔가 뜨기 시작했다"고 체감하는 순간이다
- **LCP** — Largest Contentful Paint. 뷰포트 안에서 가장 큰 콘텐츠 요소(주로 큰 이미지나 텍스트 블록)가 렌더링 완료된 시점. Core Web Vitals 지표 중 하나로, 로딩 성능을 체감하는 대표 지표로 쓰인다

이 마커들 사이 간격을 보면 어디서 시간이 새는지 감이 온다. 예를 들어 DCL과 FCP 사이가 넓게 벌어져 있으면 "HTML은 다 파싱됐는데 화면에 뭔가 그려지기까지 오래 걸렸다"는 뜻이고, FCP와 LCP 사이가 넓으면 "뭔가 먼저 그려지긴 했는데 가장 큰 요소는 한참 뒤에야 준비됐다"는 뜻이라 LCP 요소 자체의 로딩 지연을 의심하게 된다.

---

## 하단 탭 — Summary / Bottom-Up / Call Tree / Event Log

플레임 차트에서 특정 구간을 선택했을 때, 그 구간을 네 가지 다른 방식으로 요약해준다.

- **Summary** — 선택 구간 전체를 Scripting/Rendering/Painting/System/Loading 카테고리별 합산 시간으로 보여준다. "이 구간은 대체로 뭐 하느라 바빴나"를 가장 빠르게 파악하는 뷰
- **Bottom-Up** — 실제로 시간을 가장 많이 잡아먹은 함수부터 정렬해서 보여준다(Self Time 기준). 호출 경로가 여러 개여도 상관없이 "어떤 함수가 진짜 무거운지"를 찾을 때 쓴다
- **Call Tree** — 반대로 호출 계층 구조를 그대로 펼쳐서 보여준다. "누가 누구를 호출해서 이 함수까지 도달했는지" 흐름을 따라갈 때 쓴다
- **Event Log** — 선택 구간에서 발생한 이벤트를 시간순으로 그냥 나열한다. 특정 이벤트가 정확히 몇 번, 어떤 순서로 발생했는지 확인할 때 쓴다

**Bottom-Up으로 "뭐가 느린지" 찾고 → Call Tree로 "왜 그게 호출됐는지" 역추적**하는 흐름이 기본적인 사용 패턴이다.

---

## Lighthouse와의 관계

- **Lighthouse**: "점수가 몇 점이고, 일반적으로 뭘 고치면 좋아지는지" — 진단과 권장 사항 중심. 랩 환경 시뮬레이션 한 번의 요약
- **Performance 탭**: "그 시간 동안 정확히 어떤 함수가, 어떤 순서로, 얼마나 실행됐는지" — 실행 자체를 녹화한 원본 데이터

그래서 순서는 보통 Lighthouse로 "LCP가 나쁘다"는 걸 확인 → Performance 탭으로 같은 페이지를 녹화 → LCP 마커 직전 구간을 Bottom-Up으로 열어서 실제로 시간을 잡아먹은 함수를 특정 → 코드 레벨에서 원인 수정, 순서로 이어진다. 메인 스레드 블로킹 문제라면 이 블로그의 [이벤트 루프 노트](/notes/frontend/event-loop-call-stack)에서 다룬 콜 스택/큐 개념이 그대로 여기 적용된다.

