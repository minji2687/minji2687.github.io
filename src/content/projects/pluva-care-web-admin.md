---
title: Pluva Care Web 어드민
description: 농기계 원격 관제 웹 어드민. React Query staleTime 미설정으로 API가 과다 호출되던 문제를 진단하고 수정했다.
date: "2023-07"
tags:
  - React
  - React Query
  - Redux Toolkit
  - Ant Design
  - AWS AppSync
  - Cognito
status: archived
org: 회사
featured: false
draft: true
---

## staleTime 미설정으로 인한 API 과다 호출 (2023-12-27)

API가 필요 이상으로 자주 호출되는 문제가 있었다. 원인은 `staleTime` 미설정 — React Query v3는 `staleTime` 기본값이 `0`이라, 데이터를 받자마자 바로 stale 처리되고 컴포넌트가 리마운트되거나 창에 포커스가 돌아올 때마다 자동으로 refetch가 걸린다. 쿼리 훅 대부분이 이 옵션을 지정하지 않은 상태였다.

커밋 `api 호출이 빈번하게 일어나는 이슈 수정`(2023-12-27)에서 8개 쿼리 파일, `useQuery` 훅 15개(+ `CommonProvider.tsx`의 인라인 쿼리 1개)에 `staleTime`을 일괄 추가해 해결했다. 데이터 성격에 따라 값을 두 단계로 나눴다.

**`staleTime: 3600000` (1시간) — 자주 안 바뀌는 데이터**

- `CommonProvider.tsx` — org tree
- `common.query.ts` — `useLoadOrgTree`
- `dashboard.query.ts` — `useDashboardSalesChartData`, `useDashboardMostDrive`
- `enduser.query.ts` — `useAllEndUserList`
- `equipment.query.ts` — `useEquipmentById`, `useEquipmentsByOwner`, `useSimpleEquipments`, `useWeekSalesEquipments`, `useEquipmentsSubscriptionKey`
- `model.query.ts` — `useModels`, `useEquipByModelId`
- `product.query.ts` — `useProducts`
- `role.query.ts` — `useRoleTree`

**`staleTime: 1000 * 60 * 5` (5분) — 실시간성이 필요한 데이터**

- `dashboard.query.ts` — `useDashboardDailyTrouble`(고장 신고), `useDashboardDailyEmergency`(긴급 상황)

조직트리·모델·상품처럼 잘 안 바뀌는 정적 데이터는 1시간으로 길게, 고장/긴급 같은 대시보드 지표는 5분으로 짧게 잡아 실시간성과 요청 절감 사이 균형을 맞췄다.

`cacheTime`은 이 커밋에서도 건드리지 않았다 — v3 기본값(5분, unmount 후 GC)을 그대로 쓰는 상태이고, 이후 히스토리 전체를 봐도 `cacheTime`을 직접 설정한 커밋은 없다.
