---
title: "Record vs 일반 클래스 — 언제 뭘 쓸까"
description: "불변 데이터 묶음은 Record, 동작·상속이 필요하면 클래스"
date: "2026-05-20"
tags: ["Java", "Study"]
draft: false
---

## 한 줄 요약

**값만 담는 불변 DTO** → `record`  
**검증·메서드·상속**이 필요 → `class`

## Record 장점

- 생성자, getter, `equals` / `hashCode` / `toString` 자동 생성
- 필드는 `private final`로 불변

```java
public record Point(int x, int y) {}
```

## 클래스가 나은 때

- 필드 검증 로직 (예: 음수 불가)
- 비즈니스 메서드가 많을 때
- 상속·인터페이스 구현이 필요할 때

## 정리

공부용 메모: Spring DTO·API 응답 모델은 Record로 시작해보고, 로직이 붙으면 클래스로 분리.
