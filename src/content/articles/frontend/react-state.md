---
title: "React 상태 관리, 언제 무엇을 쓸까"
description: "useState, useReducer, Context, Zustand, Jotai까지. 상황별로 어떤 상태 관리 방법을 선택하면 좋은지 기준을 정리한다."
date: "2026-04-20"
category: "Frontend"
tags: ["React", "State Management", "Zustand", "Jotai"]
featured: true
---

# React 상태 관리, 언제 무엇을 쓸까

React 프로젝트에서 상태 관리 라이브러리 선택은 항상 고민이다. 프로젝트 규모, 팀 경험, 상태 복잡도에 따라 다른 선택이 필요하다.

## 상태의 종류부터 구분하기

상태 관리 도구를 선택하기 전에, 상태의 성격을 먼저 파악하는 것이 중요하다.

- **로컬 상태**: 특정 컴포넌트 안에서만 사용되는 상태 (열림/닫힘, 입력값 등)
- **공유 상태**: 여러 컴포넌트가 함께 사용하는 상태 (사용자 정보, 필터 값 등)
- **서버 상태**: 서버에서 가져온 데이터 (API 응답, 캐시 등)

## 선택 기준

### 로컬 상태 → useState / useReducer

단순한 값은 `useState`, 여러 상태가 연관되어 있으면 `useReducer`.

```typescript
// 단순
const [isOpen, setIsOpen] = useState(false)

// 복잡한 폼
const [form, dispatch] = useReducer(formReducer, initialState)
```

### 공유 상태 → Context 또는 Zustand

컴포넌트 트리가 깊지 않다면 Context로 충분하다. 재렌더링이 문제가 되거나 상태 로직이 복잡해지면 Zustand를 고려한다.

```typescript
// Zustand
import { create } from 'zustand'

type FilterStore = {
  category: string
  setCategory: (cat: string) => void
}

const useFilterStore = create<FilterStore>((set) => ({
  category: 'all',
  setCategory: (category) => set({ category }),
}))
```

{% callout type="info" title="서버 상태는 별도로" %}
API 데이터는 TanStack Query(React Query)로 관리하는 것이 훨씬 효율적이다.
캐싱, 재시도, 로딩/에러 상태를 자동으로 처리해준다.
{% /callout %}

## 내 기준 요약

1. 컴포넌트 내부 → `useState`
2. 관련 상태 여러 개 → `useReducer`
3. 트리 전체 공유, 간단 → `Context`
4. 전역 상태, 성능 중요 → `Zustand`
5. API 데이터 → `TanStack Query`
6. 원자 단위 상태, 파생 상태 많음 → `Jotai`
