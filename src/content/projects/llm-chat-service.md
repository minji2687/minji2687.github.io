---
title: LLM 채팅 서비스
description: OpenAI API + Redis 8 네이티브 벡터 검색 기반 RAG 파이프라인을 직접 구현한 채팅 서비스. NestJS 백엔드와 Next.js 프론트엔드를 직접 구성하며 LLM 서비스 구조를 학습.
date: "2026-06"
tags:
  - Next.js
  - NestJS
  - TypeScript
  - OpenAI API
  - Redis
  - RAG
  - Zustand
  - React Query
status: active
org: 개인
featured: false
draft: true
---

## 배경

솔데스크에서 파이썬 빅데이터 분석 수업을 들으며 LLM 서비스 구조를 직접 만들어봤다. 강의를 따라가는 것에서 멈추지 않고, 단순 API 호출부터 RAG 파이프라인까지 백엔드와 프론트엔드 양쪽을 직접 구성했다.

---

## 1. RAG 파이프라인 직접 구현

LangChain 같은 추상화 라이브러리 없이 RAG 흐름을 직접 연결했다.

1. 사용자 질문을 `text-embedding-3-small`로 임베딩
2. Redis 벡터 인덱스에서 코사인 유사도 기반 유사 문서 검색
3. 검색된 문서를 시스템 프롬프트에 컨텍스트로 주입
4. GPT-3.5-turbo로 최종 답변 생성

라이브러리가 내부에서 처리해주는 것들을 직접 연결하면서 RAG의 각 단계가 왜 필요한지 구체적으로 이해할 수 있었다.

→ [RAG와 할루시네이션](/notes/rag-study-and-hallucination)  
→ [Redis로 벡터 DB 구현하기](/notes/redis-vector-db-rag)

---

## 2. Redis 8 네이티브 벡터 검색

별도 벡터 DB(Pinecone, Weaviate 등) 없이 Redis 8의 네이티브 벡터 명령어로 처리했다.

`VADD`로 임베딩 벡터와 메타데이터를 함께 저장하고, `VSIM`으로 쿼리 벡터와의 코사인 유사도 순으로 가장 가까운 문서를 가져온다. Redis 8부터 외부 모듈 없이 기본 명령어로 벡터 연산이 된다는 걸 이 과정에서 처음 알았다.

```ts
// 저장
await redis.sendCommand([
  'VADD', indexName,
  'VALUES', String(embedding.length), ...embedding.map(String),
  id,
  'SETATTR', JSON.stringify({ text }),
]);

// 검색
await redis.sendCommand([
  'VSIM', indexName,
  'VALUES', String(embedding.length), ...embedding.map(String),
  'WITHSCORES', 'WITHATTRIBS',
  'COUNT', String(topK),
]);
```

---

## 3. 세션 컨텍스트 관리

대화가 이어지려면 이전 메시지를 기억해야 한다. Redis에 세션 ID 키로 대화 이력을 저장하고, TTL을 24시간으로 설정했다. 컨텍스트가 무한정 쌓이면 토큰 비용이 늘어나기 때문에 최근 10개 메시지만 유지하는 슬라이딩 윈도우로 처리했다.

→ [Redis로 LLM 세션 컨텍스트 관리하기](/notes/redis-session-context)

---

## 앞으로 확장할 것

**스트리밍 응답**: 현재는 응답 전체를 받고 한번에 표시한다. OpenAI 스트리밍 API + SSE로 글자가 흘러나오는 방식으로 바꿀 예정.

**RAG 소스 확장**: `documents.ts`에 샘플 데이터만 있는 상태다. 블로그 글이나 이력서를 소스로 넣어 "나를 소개하는 챗봇"으로 만들 계획. 포트폴리오에 직접 연결되는 데모가 될 수 있다.

**배포**: Vercel(프론트) + Railway(NestJS) + Redis Cloud 조합으로 실제 동작하는 URL을 만들 예정.
