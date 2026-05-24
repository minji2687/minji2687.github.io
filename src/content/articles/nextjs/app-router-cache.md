---
title: "Next.js App Router 캐싱 전략 정리"
description: "Next.js 13+ App Router에서 달라진 캐싱 모델을 정리한다. fetch 캐싱, Route Segment Config, revalidate 옵션을 중심으로 실무에서 헷갈렸던 부분을 기록한다."
date: "2026-05-10"
category: "Next.js"
tags: ["Next.js", "App Router", "Caching", "ISR"]
featured: true
---

# Next.js App Router 캐싱 전략 정리

Next.js 13에서 App Router가 도입되면서 캐싱 모델이 크게 바뀌었다. Pages Router와 동작 방식이 달라 처음에는 많이 헷갈렸다.

## 네 가지 캐싱 레이어

App Router에는 다음 네 가지 캐싱 레이어가 있다.

| 레이어 | 위치 | 목적 |
|--------|------|------|
| Request Memoization | 서버 (요청별) | 동일 요청 중복 방지 |
| Data Cache | 서버 (지속) | fetch 결과 저장 |
| Full Route Cache | 서버 (지속) | 렌더링된 HTML 저장 |
| Router Cache | 클라이언트 | 방문한 페이지 캐시 |

## fetch 캐싱

App Router에서 `fetch`는 기본적으로 캐시된다.

```typescript
// 기본: 캐시됨 (force-cache)
const data = await fetch('https://api.example.com/posts')

// 캐시 안 함
const data = await fetch('https://api.example.com/posts', {
  cache: 'no-store',
})

// 주기적 재검증 (ISR)
const data = await fetch('https://api.example.com/posts', {
  next: { revalidate: 3600 }, // 1시간
})
```

## Route Segment Config

페이지 단위로 캐싱 전략을 설정할 수 있다.

```typescript
// app/blog/page.tsx
export const revalidate = 3600 // 1시간마다 재검증
export const dynamic = 'force-static' // 항상 정적
```

{% callout type="info" title="정적 export 시 주의" %}
`output: 'export'` 설정에서는 `dynamic = 'force-static'` 이 아닌 경우 빌드가 실패할 수 있다.
이 블로그처럼 정적 export를 사용하는 경우 모든 페이지가 빌드 시점에 생성되어야 한다.
{% /callout %}

## 실무에서 헷갈렸던 점

`generateStaticParams`를 사용하는 동적 라우트에서 데이터를 `fetch`로 가져올 때, 빌드 시점과 런타임 모두에서 호출된다는 점을 놓쳤다. 빌드 시에는 캐시가 없으므로 실제 API를 호출한다.
