---
title: "요즘 알게 된 CSS 트릭 모음"
description: "실제로 코드 짜다가 '어, 이런 뜻이었네' 싶었던 CSS를 그때그때 추가하는 노트. 신기한 최신 CSS 기능도 여기에."
date: "2026-07-07"
tags: ["CSS"]
---

## 1. `absolute` + `inset-0`으로 카드 전체를 덮는 오버레이 (Stretched Link)

카드 전체를 클릭 가능하게 만들고 싶은데, 카드 안에 또 다른 링크(예: "Live" 외부 링크)가 있으면 `<a>` 안에 `<a>`를 중첩하게 된다. 이건 유효하지 않은 HTML이라 클릭 시 브라우저가 둘 중 하나만 우선 처리해버린다.

```tsx
// 문제가 되는 구조 — <a> 안에 <a>가 중첩됨
<Link href="/projects/foo" className="block rounded-xl border p-5">
  <h2>{title}</h2>
  <a href={liveUrl} target="_blank">Live ↗</a>
</Link>
```

해결: 카드를 감싸던 `<Link>`를 걷어내고, 제목만 감싼 작은 `<Link>`에 `after:absolute after:inset-0`을 붙인다.

```tsx
<li className="relative rounded-xl border p-5">
  <h2>
    <Link href="/projects/foo" className="after:absolute after:inset-0">
      {title}
    </Link>
  </h2>
  <div className="relative z-10">
    <a href={liveUrl} target="_blank">Live ↗</a>
  </div>
</li>
```

**왜 카드 전체가 덮이는가:** `absolute`로 위치가 잡힌 요소는 자기가 속한 요소의 크기가 아니라, **가장 가까운 `position`이 걸린 조상(containing block)의 크기**를 기준으로 배치된다. `inset-0`은 그 기준 박스의 `top:0; right:0; bottom:0; left:0`이라는 뜻이라, 결과적으로 기준 박스 전체를 꽉 채운다.

여기서 `::after`는 제목 텍스트만큼만 있는 작은 `<a>` 안에 생성되지만, `absolute`라서 가장 가까운 `relative`인 `<li>`(카드 전체) 크기로 늘어난다. 투명한 셀로판지를 작은 스티커에 붙여놨는데 그 셀로판지만 카드 크기로 쭉 늘린 셈 — 셀로판지를 눌러도 스티커(링크)를 누른 걸로 인식된다.

`relative z-10`이 붙은 "Live" 링크는 이 오버레이보다 위 stacking에 위치해서, 오버레이가 클릭을 가로채지 않고 그 위에서 정상적으로 클릭된다.

→ 실제 적용: [`src/app/projects/page.tsx`](/projects) 프로젝트 리스트 카드
