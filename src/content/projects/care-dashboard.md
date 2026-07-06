---
title: Pluva Care Web — 운영 KPI 대시보드
description: 농기계 단말기 데이터를 실시간으로 수집·집계해 운영 가시성을 확보하는 웹 대시보드. GeoJSON 지도 위에 장비 위치·상태를 표시하고, SQL 기반 KPI를 D3·Canvas로 시각화했다. 기획부터 프론트엔드 구현까지 담당.
date: "2026-02"
tags:
  - Next.js
  - D3
  - Canvas
  - GeoJSON
  - SQL
  - TypeScript
status: archived
org: 회사
featured: false
draft: false
links:
  - label: Live
    href: https://care-dashboard.pluva.io/
---

## 배경

긴트의 Care 플랫폼은 농기계 단말기에서 수집한 실시간 데이터를 관리하는 서비스다. 기존에는 단말기 데이터 수신 여부와 장비 위치를 한 화면에서 확인할 방법이 없어, 운영팀이 현장 상황을 파악하는 데 어려움이 있었다.

이를 해결하기 위해 운영 KPI 대시보드를 기획·설계·구현했다. 대시보드 기획과 UX/UI 디자인, SQL 기반 KPI 집계 설계, D3·Canvas 기반 프론트엔드 구현을 담당했다.

---

## 1. 지도 마커를 SVG에서 Canvas로 전환

처음에는 D3로 장비 마커를 SVG `<circle>`로 그렸다. 장비가 수백 개가 되면서 줌·팬 때 버벅임이 생겼다.

SVG는 마커 하나하나가 DOM 엘리먼트로 존재한다. 줌할 때마다 D3가 모든 마커의 좌표 속성을 하나씩 업데이트하고, 브라우저가 레이아웃을 다시 계산해 화면에 그린다. 마커가 300개면 DOM을 300번 건드리는 것이고, 줌 제스처는 1초에 수십 번 발생하니 프레임 드랍이 된다.

해결은 레이어 분리였다. 지형(GeoJSON)은 변경이 거의 없으니 SVG에 두고, 마커만 Canvas로 옮겼다.

```
[container div]
  ├── <svg>     ← 지형. 줌 이벤트도 여기서 받음
  └── <canvas>  ← 마커 전용
```

Canvas는 DOM 엘리먼트가 없다. 대신 `requestAnimationFrame` 루프가 매 프레임 전체를 지우고 다시 그린다. 마커에 펄스 링·글로우 애니메이션이 있어서 어차피 매 프레임 다시 그려야 했고, 그러면 줌·선택·필터 상태 변화도 자연스럽게 같이 반영된다. 줌 핸들러는 transform 값을 ref에 저장하기만 하면, 다음 프레임 루프가 그 값을 읽어 마커를 새 위치에 그린다. DOM을 건드리지 않는다.

Canvas는 픽셀 덩어리라 클릭한 위치가 어떤 마커인지 브라우저가 알려주지 않는다. 마우스 좌표와 각 마커 화면 좌표 사이 거리를 직접 계산해서 hit 여부를 판단했다. Retina 디스플레이에서 흐릿하게 보이는 문제는 `devicePixelRatio`를 반영해 canvas 버퍼 크기를 키워서 해결했다.

자세한 구현은 [SVG 마커를 Canvas로 바꾸면 지도가 왜 빨라지는가](/articles/frontend/svg-to-canvas-map-marker)에 정리했다.

---

## 2. SQL KPI 집계

운영팀이 필요로 한 지표를 SQL로 직접 집계해 API로 제공했다.

- **실운행 현황** — 당일 실제로 가동된 장비 수
- **알림 추이** — 시간대별 알림 발생 건수
- **고장코드 Top N** — 빈도 순 고장 코드 순위
- **일별 활성 장비 추이** — 최근 30일 활성 장비 수 변화

일별 활성 장비 쿼리에서는 `AT TIME ZONE 'Asia/Seoul'` 대신 `+ INTERVAL '9 hours'`를 사용했다. `AT TIME ZONE`은 타임존 룰셋을 조회하는 비용이 있고, `DATE_TRUNC`를 `SELECT`·`GROUP BY`·`ORDER BY`에 중복으로 쓰고 있었다. 서브쿼리에서 한 번만 계산해 `day_kst`로 이름 붙인 뒤 재사용하는 방식으로 정리했다.

```sql
-- 수정 전
SELECT
  TO_CHAR(DATE_TRUNC('day', created_at AT TIME ZONE 'Asia/Seoul'), 'MM/DD') AS day,
  COUNT(DISTINCT equipment_id) AS active_count
FROM operation_history
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at AT TIME ZONE 'Asia/Seoul')
ORDER BY DATE_TRUNC('day', created_at AT TIME ZONE 'Asia/Seoul') ASC

-- 수정 후
SELECT TO_CHAR(day_kst, 'MM/DD') AS day, COUNT(DISTINCT equipment_id) AS active_count
FROM (
  SELECT equipment_id,
         DATE_TRUNC('day', created_at + INTERVAL '9 hours') AS day_kst
  FROM operation_history
  WHERE created_at >= NOW() - INTERVAL '30 days'
) t
GROUP BY day_kst
ORDER BY day_kst ASC
```

DB 커넥션 풀도 함께 조정했다. 대시보드 페이지가 로드될 때 KPI API 여러 개가 동시에 호출되는데, `max: 3` 설정으로는 요청이 풀 순번을 기다리며 밀렸다. `max: 10`으로 늘리고, 자동갱신 주기(30초) 안에 연결이 끊기지 않도록 `idleTimeoutMillis`를 10초에서 60초로 늘렸다.

---

## 3. 중계 모드

현장에서 고객사 담당자에게 시스템을 설명하거나, 특정 장비만 모아서 모니터링하고 싶다는 요구가 있었다. 고정된 레이아웃으로는 대응하기 어려워, 카드 배치를 자유롭게 바꿀 수 있는 중계 모드를 기획·구현했다.

- `@dnd-kit/core`로 카드 드래그앤드롭 구현. 카드 상단 투명 핸들을 잡아 이동하고, 드롭 슬롯에 파란 테두리로 위치를 시각적으로 안내
- 드래그 중 원본 카드를 25% 투명하게 처리해 어디서 어디로 이동하는지 명확하게 표시
- 우측 패널은 드래그 핸들로 리사이즈 가능
- 카드 배치와 레이아웃 모드를 `localStorage`에 저장해 새로고침 후에도 유지

---

## 성과

- 단말기 데이터 수신 여부와 장비 위치를 한 화면에서 실시간 확인할 수 있게 되어 운영 가시성 확보
- 장비 운행 상태·위치·이상 여부를 한눈에 파악할 수 있게 개선하여 장애 대응 및 자산 관리 효율 향상
