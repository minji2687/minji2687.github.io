---
title: "Redis를 Vector DB로 사용하고 RAG 구현하기"
description: "텍스트를 임베딩 벡터로 변환해 Redis에 저장하고, 유사도 검색으로 RAG 파이프라인을 구현하는 방법"
date: "2026-06-14"
tags: ["Redis", "NestJS", "LLM", "RAG", "Vector DB", "OpenAI"]
---

## 오늘 만든 것

NestJS + Redis + OpenAI로 RAG(Retrieval-Augmented Generation) 파이프라인을 구현했다.

내가 넣어둔 문서를 기반으로 GPT가 답변하는 구조다. 예를 들어 "조민지 어디 살아?"라고 물으면, GPT의 일반 지식이 아니라 내가 직접 저장해둔 "조민지는 서울에 살아"라는 문서를 참고해서 답한다.

---

## 벡터 임베딩이란

텍스트를 숫자 배열로 변환한 것이다.

```
"사과는 과일이다" → [-0.006, 0.023, 0.041, ...] (1536개 숫자)
"바나나도 과일이야" → [-0.008, 0.019, 0.038, ...] (비슷한 값들)
"자동차는 탈것이다" → [0.071, -0.045, 0.012, ...] (다른 값들)
```

의미가 비슷한 문장은 벡터 값이 서로 가깝고, 의미가 다른 문장은 멀다. 이 성질을 이용해서 "이 질문과 가장 비슷한 문서"를 찾을 수 있다.

`text-embedding-3-small` 모델 기준으로 1536개 숫자가 나온다.

---

## OpenAI Embedding API

```
POST https://api.openai.com/v1/embeddings

{
  "model": "text-embedding-3-small",
  "input": "텍스트",
  "encoding_format": "float"
}
```

응답:

```json
{
  "data": [
    {
      "embedding": [-0.006929, -0.005336, ...]
    }
  ]
}
```

핵심은 `data[0].embedding`이 1536개짜리 숫자 배열이라는 것이다.

---

## Redis 8 네이티브 벡터 명령어

Redis Stack의 `FT.*` 명령어 대신, Redis 8부터는 벡터를 기본으로 지원한다.

### 벡터 저장 — VADD

```bash
VADD {인덱스명} VALUES {차원수} {값1} {값2} ... {elementId} SETATTR '{"text":"원본 텍스트"}'
```

- `VALUES 1536 v1 v2 ... v1536` — 1536개 float를 문자열로 전달
- `SETATTR` — 원본 텍스트 같은 메타데이터를 JSON으로 함께 저장

### 유사 벡터 검색 — VSIM

```bash
VSIM {인덱스명} VALUES {차원수} {값1} {값2} ... WITHSCORES WITHATTRIBS COUNT {n}
```

응답 형태 (node-redis 기준):

```json
{
  "user-profile": [0.72, "{\"text\":\"안녕 나는 조민지라고해\"}"]
}
```

객체 형태로 반환된다. `{ elementId: [score, attribsJson] }`

> **삽질 포인트**: 처음에 FP32 바이너리 버퍼를 sendCommand로 넘겼는데 Redis가 제대로 인식 못했다. VALUES 방식(float를 문자열로 전달)으로 바꿔서 해결했다.

### 유용한 확인 명령어

```bash
VCARD {인덱스명}          # 저장된 벡터 개수
VDIM {인덱스명}           # 벡터 차원 수
VGETATTR {인덱스명} {id}  # 특정 element 메타데이터 조회
VSIM {인덱스명} ELE {id} WITHSCORES WITHATTRIBS  # 특정 element 기준 유사 검색
```

---

## NestJS 구현

### RedisService — 벡터 저장/검색

```ts
async saveVector(indexName: string, id: string, text: string, embedding: number[]): Promise<void> {
  await this.redis.sendCommand([
    'VADD', indexName,
    'VALUES', String(embedding.length), ...embedding.map(String),
    id,
    'SETATTR', JSON.stringify({ text }),
  ]);
}

async searchVector(indexName: string, embedding: number[], topK = 5) {
  const result = await this.redis.sendCommand([
    'VSIM', indexName,
    'VALUES', String(embedding.length), ...embedding.map(String),
    'WITHSCORES', 'WITHATTRIBS',
    'COUNT', String(topK),
  ]) as unknown as Record<string, [number, string]>;

  return Object.entries(result).map(([id, [score, attribsJson]]) => ({
    id,
    score,
    text: JSON.parse(attribsJson).text,
  }));
}
```

### OpenaiService — 전체 흐름

```ts
// 1. 문서 인덱싱 (텍스트 → 벡터 → Redis 저장)
async indexDocument({ id, text }) {
  const response = await openai.post('/embeddings', {
    model: 'text-embedding-3-small',
    input: text,
  });
  const embedding = response.data.data[0].embedding;
  await this.redisService.saveVector('doc-index', id, text, embedding);
}

// 2. RAG 답변 생성
async generateTextWithRAG({ prompt }) {
  // 질문을 벡터로 변환
  const embRes = await openai.post('/embeddings', { input: prompt, ... });
  const queryVec = embRes.data.data[0].embedding;

  // 유사 문서 검색
  const docs = await this.redisService.searchVector('doc-index', queryVec);
  const context = docs.map(d => d.text).join('\n');

  // GPT에 문서 + 질문 전달
  const response = await openai.post('/chat/completions', {
    messages: [
      { role: 'system', content: `아래 문서를 참고해서 답해줘:\n${context}` },
      { role: 'user', content: prompt },
    ],
  });
}
```

---

## API 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/openai/index` | 문서 1개 임베딩 후 Redis 저장 |
| POST | `/openai/index-all` | `documents.ts`의 모든 문서 일괄 인덱싱 |
| POST | `/openai/search` | 질문과 유사한 문서 검색 |
| POST | `/openai/rag` | 유사 문서 기반 GPT 답변 생성 |
| POST | `/openai/chat` | 일반 GPT 채팅 (Redis 세션 유지) |

---

## RAG 전체 흐름 정리

```
[준비]
내 문서 → POST /openai/index-all
  → OpenAI 임베딩 API 호출
  → 벡터(1536개 숫자) 변환
  → Redis VADD로 저장

[질문]
"조민지 어디 살아?" → POST /openai/rag
  → 질문을 임베딩 (벡터로 변환)
  → Redis VSIM으로 유사 문서 검색
  → "안녕 나는 조민지라고해 서울에 살아" 찾음
  → GPT에게 문서 + 질문 전달
  → "조민지는 서울에 살고 있습니다" 답변
```

---

## Redis의 두 가지 역할

이 프로젝트에서 Redis는 두 가지로 쓰인다.

| 역할 | 명령어 | 용도 |
|------|--------|------|
| 세션 저장 | SET / GET | 대화 히스토리 유지 |
| 벡터 DB | VADD / VSIM | 문서 유사도 검색 |

---

## Redis Stack vs Redis 8

로컬에 Redis 8.8.0이 이미 설치되어 있어서 Redis Stack을 따로 설치하지 않았다. Redis 8부터는 벡터 명령어(`VADD`, `VSIM`)가 기본 내장되어 있기 때문이다. Redis Stack은 Redis 7 이하에서 벡터 검색을 쓰려고 별도로 설치하는 버전이다.
