---
title: "Lighthouse 성능 지표 정리 — FCP, SI, LCP, TBT, CLS"
description: "Lighthouse Performance 점수를 구성하는 5개 지표가 각각 뭘 재는지, 점수 가중치는 어떻게 매겨지는지, Core Web Vitals와는 어떻게 다른지, 그리고 각 지표를 실제로 개선하는 방법을 정리한다."
date: "2026-07-11"
tags: ["Lighthouse", "Performance", "Core Web Vitals", "Web Performance"]
draft: true
---

> 초안. 실제로 이 블로그에 Lighthouse 돌려보면서 스크린샷·수치·개선 전후 비교 추가할 것.

![Lighthouse 리포트 — Performance 70, Accessibility 91, Best Practices 100, SEO 100](/images/lighthouse/lighthouse-report-scores.png)

![Render-blocking requests — layout.css가 10.1 KiB, 80ms 동안 초기 렌더를 막고 있음, 예상 절감 40ms](/images/lighthouse/lighthouse-render-blocking-requests.png)

> 위 render-blocking 경고는 로컬(`localhost`) dev 서버 기준 측정치다. 실제 GitHub Pages 배포판에서는 같은 문제가 나타나지 않았는데, dev 서버는 압축·캐싱 없이 파일을 그대로 서빙하는 반면 GitHub Pages는 Fastly CDN을 통해 압축·캐싱된 상태로 서빙하기 때문이다. 자세한 내용은 [CDN 기초 노트](/notes/frontend/cdn-basics) 참고.

## Lighthouse Performance 점수는 어떻게 매겨지나

Lighthouse의 Performance 점수(0~100)는 지표 하나가 아니라, **5개 지표를 각각 다른 가중치로 합산한 값**이다. 지표마다 raw 값(ms 등)을 0~100 사이 점수로 변환한 뒤, 아래 가중치로 가중 평균을 낸다.

| 지표 | 가중치 |
|---|---|
| TBT (Total Blocking Time) | 30% |
| LCP (Largest Contentful Paint) | 25% |
| CLS (Cumulative Layout Shift) | 25% |
| FCP (First Contentful Paint) | 10% |
| SI (Speed Index) | 10% |

> 이 가중치는 Lighthouse 버전이 올라갈 때마다 조정돼 왔다(v8→v10 사이에도 바뀜). 글 쓰는 시점 기준 최신 가중치는 [web.dev의 공식 계산기](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring) 페이지에서 직접 확인하고 숫자를 맞출 것 — 아래 표는 대략적인 참고치로만 쓰기.

각 지표는 실제 측정값(ms, 단위 없는 점수 등)을 **로그 정규분포 곡선**에 대입해서 0~100점으로 바꾼다. 그래서 "0.1초 개선"이 항상 같은 점수 상승을 만들지 않는다 — 이미 빠른 사이트는 조금만 느려져도 점수가 크게 떨어지고, 느린 사이트는 어느 정도 개선해도 점수 변화가 완만하다.

---

## FCP (First Contentful Paint)

**"첫 번째 콘텐츠가 화면에 그려지는 시점."** 텍스트, 이미지(배경 이미지 제외), `<canvas>`, SVG 중 뭐든 하나라도 처음 그려지면 그 시점이 FCP다. 완전히 빈 흰 화면에서 뭔가 하나라도 나타나기까지 걸리는 시간이라고 보면 된다.

**느려지는 원인**: 렌더 차단 리소스(render-blocking CSS/JS), 느린 서버 응답(TTFB), 큰 폰트 파일 로딩 대기.

**개선 방법**:
- 중요하지 않은 CSS/JS에 `defer`/`async` 붙이기
- 폰트 로딩 시 `font-display: swap`으로 텍스트가 폰트 대기 없이 먼저 보이게
- 서버 응답 시간(TTFB) 자체를 줄이기 (캐싱, CDN, SSR 최적화)

---

## SI (Speed Index)

**"화면이 시각적으로 얼마나 빨리 채워지는지"** 를 나타내는 지표. FCP처럼 "처음 뭔가 그려진 시점" 하나만 보는 게 아니라, 로딩 과정 전체를 프레임 단위로 캡처해서 **"화면이 완성된 정도"** 가 시간에 따라 얼마나 빨리 100%에 도달하는지를 적분해서 계산한다.

그래서 FCP는 빠른데 SI가 나쁜 경우가 있다 — 뭔가 일찍 그려지긴 했는데, 그 뒤로 나머지 콘텐츠(이미지, 하단 텍스트 등)가 천천히 채워지면 SI가 나빠진다. 반대로 첫 콘텐츠는 좀 늦게 뜨더라도 뜬 이후 나머지가 한꺼번에 빠르게 채워지면 SI는 좋을 수 있다.

**개선 방법**:
- 위(above the fold) 콘텐츠 우선순위 높이기 — 중요한 콘텐츠부터 빨리 채워지도록
- 이미지 lazy loading으로 불필요한 초기 로딩 경쟁 줄이기
- 메인 스레드 작업을 잘게 쪼개서 렌더링이 중간에 막히지 않게

---

## LCP (Largest Contentful Paint) — Core Web Vital

**"화면에서 가장 큰 콘텐츠 요소가 그려지는 시점."** 보통 히어로 이미지, 큰 제목 텍스트 블록, 배경 이미지가 있는 섹션 등이 LCP 요소가 된다. 페이지 로딩 과정에서 이 "가장 큰 것"이 언제 나타나는지가 사용자가 체감하는 "페이지가 다 로딩됐다"는 감각과 가장 가깝다고 봐서 Core Web Vital로 채택됐다.

**기준**: 2.5초 이하 = Good, 4초 초과 = Poor.

**느려지는 원인**: LCP 요소 자체가 느리게 로딩됨(큰 이미지, 최적화 안 된 포맷), 렌더 차단 리소스, 클라이언트 사이드 렌더링에서 데이터 페칭 후에야 LCP 요소가 그려지는 구조.

**개선 방법**:
- LCP 이미지에 `fetchpriority="high"` 부여, `<link rel="preload">`로 우선 로딩
- 이미지 포맷 최적화(WebP/AVIF), 반응형 이미지(`srcset`)
- 서버에서 미리 렌더링(SSR/SSG)해서 클라이언트 데이터 페칭 대기 없애기

---

## TTI (Time to Interactive) — 지금은 점수에 안 들어가는 지표

**"페이지가 눈에 보이기만 하는 게 아니라, 사용자 입력에도 안정적으로 반응할 수 있게 된 시점."** FCP가 발생한 뒤, 아래 조건을 만족하는 첫 지점을 찾는다.

- 50ms 넘는 긴 태스크(Long Task)가 없는 **5초짜리 조용한 구간**이 존재하고
- 그 구간 동안 진행 중인 네트워크 요청이 2개 이하

즉 "화면은 떴는데 클릭해도 반응 없는" 상태를 지나서, 실제로 상호작용 가능해진 시점을 찾는 지표다.

**지금은 Lighthouse 점수 계산에서 빠졌다.** v10(2023) 전까지는 TTI도 점수에 들어가는 5개 지표 중 하나였는데, 이후 버전에서 점수 산정 지표에서 제외되고 지금은 참고용 진단 정보로만 리포트에 표시된다. 대신 그 자리를 **TBT**가 대체했다 — 둘 다 "긴 태스크가 메인 스레드를 얼마나 막고 있었는지"를 보는 건 비슷하지만, TTI는 "특정 시점 하나"를 찾아야 해서 계산이 복잡하고 변동성이 크고 해석하기 어려운 반면, TBT는 긴 태스크의 초과분을 그냥 다 더하기만 하면 돼서 더 단순하고 일관된 신호를 준다고 판단된 것이다.

---

## TBT (Total Blocking Time)

**"메인 스레드가 50ms 넘게 막혀있던 시간을 전부 더한 것."** FCP 이후부터 TTI(더는 공식 지표는 아니지만 개념상) 사이, 하나의 태스크가 50ms를 넘게 실행되면 그 초과분(50ms를 넘는 부분만)을 "블로킹 타임"으로 계산해서 전부 합산한다.

이 지표가 중요한 이유는 **"사용자 입력에 반응하는 속도"** 를 대변하기 때문이다. 메인 스레드가 무거운 JS 실행으로 막혀있으면, 그동안 클릭이나 스크롤 같은 사용자 입력이 처리되지 못하고 쌓인다 — 이 블로그의 [이벤트 루프 노트](/notes/frontend/event-loop-call-stack)에서 다룬 "콜 스택을 오래 붙잡으면 안 되는 이유"가 바로 이 지표로 측정되는 셈이다.

**TBT는 필드 지표가 아니라 랩(실험실) 전용 지표**다. 실제 사용자 상호작용을 측정하는 필드 지표는 **INP(Interaction to Next Paint)** 인데, INP는 실제 사용자가 클릭/탭 등으로 상호작용해야 측정 가능해서 랩 환경(Lighthouse 단독 실행)에서는 잴 수 없다. 그래서 Lighthouse는 "메인 스레드가 얼마나 막혀있었는지"로 유사한 걸 추정하는 TBT를 랩 지표로 대신 쓴다.

**개선 방법**:
- 코드 스플리팅으로 초기 번들 크기 줄이기
- 무거운 계산은 `requestIdleCallback`이나 Web Worker로 분리
- 서드파티 스크립트(분석 도구, 광고 등) 지연 로딩

---

## CLS (Cumulative Layout Shift) — Core Web Vital

**"페이지 로딩 중 레이아웃이 갑자기 얼마나 많이 움직였는지."** 이미지가 늦게 로딩되면서 아래 콘텐츠를 밀어내거나, 광고 배너가 나중에 삽입되면서 버튼 위치가 바뀌는 것 같은 "예상 못한 시각적 이동"을 점수화한다.

**기준**: 0.1 이하 = Good, 0.25 초과 = Poor.

**계산 방식**: 이동한 요소가 차지하는 화면 비율(impact fraction) × 이동한 거리 비율(distance fraction)을 각 시프트마다 계산해서 합산한다.

**느려지는 원인**: 크기 지정 안 된 이미지/비디오, 페이지 로딩 후 삽입되는 광고·배너, 웹폰트 교체 시 텍스트 크기 변화(FOIT/FOUT).

**개선 방법**:
- 이미지·비디오 태그에 `width`/`height` 속성(또는 `aspect-ratio`)을 명시해서 로딩 전에 공간을 미리 확보
- 동적으로 삽입되는 콘텐츠(광고 등)는 미리 자리(스켈레톤)를 잡아두기
- 폰트는 `font-display: optional` 또는 크기 차이가 적은 폴백 폰트 사용

---

## Lighthouse 랩 지표 vs Core Web Vitals 필드 지표

헷갈리기 쉬운 부분 — Lighthouse가 측정하는 건 전부 **랩(Lab) 데이터**다. 특정 환경(정해진 네트워크 속도, CPU 스로틀링)에서 한 번 시뮬레이션한 결과다. 반면 **Core Web Vitals**는 구글이 실제 사용자 트래픽(CrUX, Chrome User Experience Report)에서 수집하는 **필드(Field) 데이터**다.

- **랩 데이터**: 재현 가능, 디버깅하기 좋음, 근데 실제 사용자 환경과 다를 수 있음
- **필드 데이터**: 실제 사용자가 겪은 값이라 정확하지만, 트래픽이 있어야만 모을 수 있고 왜 느렸는지 원인 추적이 어려움

**INP (Interaction to Next Paint)** 는 페이지에서 일어나는 모든 사용자 상호작용(클릭, 탭, 키 입력)에 대해 "입력한 순간부터 그 결과가 화면에 그려지기까지" 걸린 시간을 재고, 세션 중 가장 느렸던 값을 최종 점수로 잡는 지표다. 2024년 3월 기존 Core Web Vital이었던 **FID(First Input Delay)** 를 대체하며 세 번째 Core Web Vital이 됐다. FID는 세션의 **첫 번째** 상호작용의 입력 지연만 쟀지만, INP는 세션 내내 일어나는 **모든** 상호작용을 보고 입력 지연·이벤트 처리·화면 반영까지 전 과정을 재서, "처음엔 빠른데 나중에 계속 버벅이는" 상황도 잡아낸다. 기준은 200ms 이하 = Good, 500ms 초과 = Poor.

그래서 Core Web Vital 3개(LCP, INP, CLS) 중 LCP·CLS는 Lighthouse도 랩 환경에서 근사치를 잴 수 있지만, INP는 실제 사용자가 상호작용해야만 측정되는 지표라 랩에서 잴 수가 없다 — Lighthouse는 그 대체재로 TBT를 쓴다. 즉 **"Lighthouse 점수가 100이어도 실제 Core Web Vitals(특히 INP)는 나쁠 수 있다"** — 랩과 필드가 항상 일치하진 않는다.

---

## 실제로 측정하는 법

- **Chrome DevTools → Lighthouse 탭**: 로컬에서 바로 실행, 랩 데이터
- **PageSpeed Insights**: 랩 데이터 + 실제 트래픽이 있는 사이트라면 필드 데이터(CrUX)도 같이 보여줌
- **Google Search Console → Core Web Vitals 리포트**: 구글이 무료로 제공하는, 내 사이트의 검색 노출·색인 상태를 관리하는 도구. 도메인 소유권을 인증해두면(DNS TXT 레코드나 HTML 파일 업로드 등으로), 실제로 그 사이트를 방문한 크롬 사용자들의 진짜 필드 데이터(CrUX)를 모아 URL 그룹별로 "좋음/개선 필요/나쁨"으로 분류해서 보여준다 — 개인 블로그도 무료로 등록해서 실사용자 기준 성능을 확인할 수 있다.

## TODO
- [ ] 이 블로그(minji-dev-blog) 실제로 Lighthouse 돌려서 현재 점수 스크린샷 + 병목 지점 확인
- [ ] 위 가중치 표를 최신 Lighthouse 공식 문서 숫자로 검증
- [ ] 실제 개선 작업 하나 골라서(이미지 최적화든 코드 스플리팅이든) 전후 점수 비교 추가
- [ ] 이 블로그를 Search Console에 실제로 등록하고 필드 데이터 확인
