---
title: "NestJS에서 Redis로 대화 컨텍스트 관리하기"
description: "LLM 채팅 서버에서 세션별 대화 히스토리를 Redis로 저장하고 불러오는 방법"
date: "2026-06-06"
tags: ["Redis", "NestJS", "LLM", "Session"]
---

## Redis란

Redis는 데이터를 **디스크가 아닌 메모리(RAM)에 저장**하는 데이터베이스다.

![Disk vs Memory](/images/redis/redis-memory-vs-disk.png)

일반 DB(PostgreSQL, MySQL 등)는 HDD나 SSD 같은 디스크에 데이터를 저장한다. 특히 HDD는 데이터를 읽으려면 물리적으로 헤드가 회전하는 플래터 위 특정 위치로 이동해야 해서 시간이 걸린다. SSD는 그보다 빠르지만, RAM에 비하면 여전히 느리다.

![디스크 I/O가 비싼 이유](/images/redis/redis-disk-io.png)

반면 Redis는 RAM에 저장하기 때문에 읽기/쓰기 속도가 훨씬 빠르다. 대신 서버를 끄면 데이터가 사라지는 게 단점이라서, **오래 보관할 필요 없는 임시 데이터**에 쓰는 게 핵심이다.

주로 이런 용도로 쓴다:

- **캐시** — DB 조회 결과를 잠깐 저장해두고 재사용
- **세션 저장** — 로그인 상태, 사용자별 임시 데이터
- **대기열(Queue)** — 작업을 순서대로 처리할 때
- **실시간 데이터** — 랭킹, 좋아요 수 등 자주 바뀌는 값

---

## 캐시로서의 Redis

![Redis Cache Flow](/images/redis/redis-cache-flow.png)

Redis를 캐시로 쓸 때 흐름은 이렇다.

1. 앱이 데이터 요청
2. **Cache hit** — Redis에 있으면 바로 반환 (빠름)
3. **Cache miss** — Redis에 없으면 DB에서 가져온 후, Redis에 저장해둠 (다음 요청부터는 빠름)

자주 조회되는 데이터를 Redis에 올려두면 매번 DB를 거치지 않아도 되니 응답이 빠르고 DB 부하도 줄어든다.

---

## TTL이란

**TTL(Time To Live)** — 데이터의 유효 기간이다.

Redis에 저장할 때 TTL을 설정하면, 그 시간이 지나면 **자동으로 해당 키를 삭제**해준다.

```ts
await redis.set('context:abc123', '...', { EX: 3600 }); // 1시간 후 자동 삭제
```

TTL 없이 저장하면 직접 삭제하기 전까지 영구 보관된다. 세션이나 캐시처럼 일정 시간이 지나면 의미 없어지는 데이터에 TTL을 설정하면 별도 정리 로직 없이 메모리가 자연스럽게 관리된다.

---

## Redis 기본 명령어

`redis-cli`를 실행하면 터미널에서 직접 Redis 명령어를 입력할 수 있다.

```bash
redis-cli
```

### 데이터 저장 / 조회 / 삭제

```bash
# 값 저장
SET name "minji"

# 값 조회
GET name           # "minji"

# 키 삭제
DEL name

# 키 존재 여부 확인 (1이면 있음, 0이면 없음)
EXISTS name
```

### TTL (만료 시간)

```bash
# 저장할 때 TTL 함께 설정 (초 단위)
SET token "abc123" EX 3600    # 1시간 후 자동 삭제

# 이미 저장된 키에 TTL 설정
EXPIRE name 60                 # 60초 후 삭제

# 남은 만료 시간 확인
TTL name                       # 남은 초 반환, -1이면 TTL 없음, -2면 키 없음
```

### 여러 키 한번에

```bash
# 여러 키 동시 저장
MSET key1 "val1" key2 "val2"

# 여러 키 동시 조회
MGET key1 key2

# 패턴으로 키 검색 (* = 와일드카드)
KEYS context:*                 # context:로 시작하는 키 전부
```

### 숫자 증감

```bash
SET count 0
INCR count      # 1 (1씩 증가)
INCRBY count 5  # 6 (n씩 증가)
DECR count      # 5 (1씩 감소)
```

### 전체 삭제

```bash
FLUSHDB         # 현재 DB 전체 삭제
```

> 실제 운영 서버에서 `KEYS *`나 `FLUSHDB`는 위험하다. `KEYS`는 전체 키를 스캔해서 서버를 블로킹할 수 있고, `FLUSHDB`는 복구가 안 된다.

---

## 이 프로젝트에서 왜 Redis를 썼나

LLM API(OpenAI)는 대화 히스토리를 직접 관리해야 한다. 요청할 때마다 이전 메시지를 `messages` 배열에 같이 담아서 보내야 GPT가 맥락을 이해하기 때문이다.

| 방법 | 문제 |
|------|------|
| 서버 메모리 | 서버 재시작 시 날아감, 여러 서버면 공유 불가 |
| RDB (PostgreSQL 등) | 읽기/쓰기 상대적으로 느림, 임시 데이터에 과함 |
| **Redis** | 빠르고, TTL로 자동 정리, 세션 저장에 딱 맞음 |

---

## 구조

```
src/
  infra/
    redis/
      redis.config.ts   # 연결 설정
      redis.module.ts   # NestJS 모듈 등록
      redis.service.ts  # 실제 로직
```

---

## 연결 설정

```ts
// redis.config.ts
export const redisConfig = {
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  database: parseInt(process.env.REDIS_DB || '0'),
};
```

---

## 모듈 등록

`@Global()`을 붙여서 다른 모듈에서 별도 import 없이 주입받을 수 있게 했다.

```ts
@Global()
@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: async () => {
        const client = createClient({
          url: redisConfig.url,
          socket: {
            // 실패 횟수에 비례해서 대기 시간을 늘리되 최대 10초로 제한
            reconnectStrategy: (retries) => Math.min(retries * 1000, 10000),
          },
        });
        await client.connect();
        return client;
      },
    },
    RedisService,
  ],
  exports: [RedisService],
})
export class RedisModule {}
```

---

## 서비스 구현

키 형식은 `context:{sessionId}` — 세션마다 하나의 키로 전체 메시지 배열을 JSON으로 저장한다. Redis는 String 외에도 List, Hash, Set 등 다양한 타입을 지원하지만, 여기서는 가장 단순한 `SET/GET` 명령을 쓰기 때문에 객체를 JSON 문자열로 직렬화해서 저장한다.

```ts
async saveContext(sessionId: string, messages: any[], ttl = 3600): Promise<void> {
  await this.set(`context:${sessionId}`, JSON.stringify(messages), ttl);
}

async getContext(sessionId: string): Promise<any[]> {
  const data = await this.get(`context:${sessionId}`);
  return data ? JSON.parse(data) : [];
}
```

---

## 실제 사용 — OpenAI 서비스

```ts
const MAX_MESSAGES = 10;       // 최대 메시지 수
const CONTEXT_TTL = 60 * 60 * 24; // 24시간

async chat({ prompt, sessionId }) {
  // 1. 이전 대화 꺼내기
  const context = await this.redisService.getContext(sessionId);

  // 2. 현재 메시지 붙여서 API 호출
  const messages = [...context, { role: 'user', content: prompt }];
  const response = await openai.post('/chat/completions', { messages });

  // 3. 응답 포함해서 최근 10개만 저장
  const updated = [
    ...context,
    { role: 'user', content: prompt },
    { role: 'assistant', content: reply },
  ].slice(-MAX_MESSAGES);

  await this.redisService.saveContext(sessionId, updated, CONTEXT_TTL);
}
```

---

## 핵심 결정 정리

| 항목 | 값 | 이유 |
|------|-----|------|
| TTL | 24시간 | 하루 지난 대화는 맥락 의미 없음, 자동 정리 |
| 최대 메시지 수 | 10개 | 토큰 수 제한 + 오래된 메시지 제거 |
| 저장 형식 | JSON 문자열 | Redis는 string 저장, 객체는 직렬화 필요 |
| 키 네임스페이스 | `context:` 접두사 | 다른 데이터 키와 충돌 방지 |

---

## 확인 방법

```bash
# Redis 실행 중인지 확인
redis-cli ping          # PONG이면 OK

# 저장된 컨텍스트 직접 보기
redis-cli get "context:{sessionId}"

# 모든 context 키 목록
redis-cli keys "context:*"

# Homebrew 서비스로 자동 시작 여부 확인
brew services list | grep redis
```
