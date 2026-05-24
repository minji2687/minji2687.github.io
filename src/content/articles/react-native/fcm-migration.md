---
title: "React Native에서 FCM 마이그레이션하며 배운 점"
description: "AWS Pinpoint에서 Firebase Cloud Messaging으로 전환하면서 정리한 구조와 주의점. 토큰 발급, 권한 처리, 백엔드 연동 흐름을 중심으로 설명한다."
date: "2026-05-24"
category: "React Native"
tags: ["React Native", "FCM", "Push Notification", "AWS Pinpoint"]
featured: true
---

# React Native에서 FCM 마이그레이션하며 배운 점

프로젝트에서 기존 AWS Pinpoint 기반 푸시 구조를 Firebase Cloud Messaging으로 변경했다.

{% callout type="info" title="핵심 요약" %}
푸시 마이그레이션은 라이브러리 교체보다 토큰 발급, 권한 처리, 백엔드 연동 흐름을 다시 정리하는 작업에 가깝다.
{% /callout %}

## 왜 마이그레이션했나

AWS Pinpoint는 분석 + 푸시를 통합한 서비스지만, 우리 프로젝트에서는 푸시 기능만 필요했다. 관리 콘솔이 복잡하고 디버깅이 어려워 FCM으로 전환하기로 결정했다.

## 주요 변경 사항

### 1. 라이브러리 교체

```bash
# 제거
npm uninstall @aws-amplify/pushnotification

# 설치
npm install @react-native-firebase/app @react-native-firebase/messaging
```

### 2. 토큰 발급 흐름

기존 Pinpoint는 SDK 내부에서 토큰을 관리했지만, FCM에서는 직접 토큰을 발급하고 서버에 등록해야 한다.

```typescript
import messaging from '@react-native-firebase/messaging'

async function registerFCMToken() {
  const authStatus = await messaging().requestPermission()
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL

  if (enabled) {
    const token = await messaging().getToken()
    await api.registerPushToken(token)
  }
}
```

### 3. 권한 처리

iOS에서는 반드시 사용자 권한을 요청해야 한다. Android 13 이상에서도 `POST_NOTIFICATIONS` 권한이 필요하다.

{% callout type="warning" title="주의" %}
Android 13(API 33) 이상에서는 `PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS)` 를 명시적으로 호출해야 한다.
{% /callout %}

## 느낀 점

마이그레이션 자체는 어렵지 않았지만, 토큰 갱신 시점(앱 재설치, 토큰 만료)에 대한 처리가 생각보다 중요했다. `onTokenRefresh` 리스너를 반드시 등록해두어야 한다.
