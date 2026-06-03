---
title: "macOS에서 Java 버전 바꾸기"
description: "java_home으로 설치 목록 확인하고, 17·21 전환하는 방법"
date: "2026-05-26"
tags: ["Java", "macOS", "Zulu"]
---

설치된 JDK 목록 확인:

```bash
/usr/libexec/java_home -V
```

특정 버전으로 전환 (현재 터미널 세션만):

```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 21)
java -version
```

매번 바꾸기 귀찮으면 `~/.zshrc`에 함수로 등록:

```bash
jdk() { export JAVA_HOME=$(/usr/libexec/java_home -v $1); java -version; }
```

이후 `jdk 17`, `jdk 21`처럼 호출.
