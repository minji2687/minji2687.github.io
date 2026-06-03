---
title: "Eclipse가 macOS에서 안 열릴 때"
description: "패키지 설치 후 실행 안 되는 경우 — 보안 설정과 quarantine 해제"
date: "2026-05-24"
tags: ["Eclipse", "macOS"]
---

## 증상

`.dmg`로 Eclipse 설치 후 Applications에 넣었는데 더블클릭해도 반응 없거나 바로 종료.

## 1. 보안 차단 (가장 흔함)

**시스템 설정 → 개인정보 보호 및 보안** 맨 아래에  
`"Eclipse" was blocked...` 가 있으면 **Open Anyway** 클릭.

## 2. quarantine 속성 제거

터미널:

```bash
sudo xattr -rd com.apple.quarantine /Applications/Eclipse.app
```

## 3. Java 버전

Eclipse 2024 이상은 **Java 17+** 필요. `java -version`으로 확인.

## 4. 아키텍처

Intel Mac → x86_64, Apple Silicon → AArch64 패키지 받아야 함.
