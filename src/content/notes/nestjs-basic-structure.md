---
title: "NestJS 기본 구조와 LLM 채팅 서버에 적용하기"
description: "Module, Controller, Service, DI 개념 정리와 실제 프로젝트 적용 방법"
date: "2026-06-06"
tags: ["NestJS", "TypeScript", "Backend"]
---

## NestJS란

NestJS는 TypeScript 기반의 Node.js 백엔드 프레임워크다. Express 위에서 동작하지만, Angular에서 영감을 받은 **모듈 구조와 데코레이터 패턴**을 사용해서 코드를 체계적으로 관리할 수 있다.

가장 큰 특징은 **의존성 주입(DI)** 과 **모듈 시스템**이다. 기능을 모듈 단위로 나누고, 클래스 간 의존 관계를 프레임워크가 알아서 관리해준다.

---

## 기본 구조

NestJS는 **Module → Controller → Service** 세 계층으로 구성된다.

```
src/
  main.ts              # 앱 진입점, 서버 실행
  app.module.ts        # 루트 모듈 (전체 모듈 조립)
  app.controller.ts    # 루트 컨트롤러
  app.service.ts       # 루트 서비스
  openai/
    openai.module.ts
    openai.controller.ts
    openai.service.ts
    dto/
      chat.dto.ts      # 요청/응답 타입 정의
  infra/
    redis/
      redis.module.ts
      redis.service.ts
      redis.config.ts
```

---

## main.ts — 서버 진입점

```ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3001',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

`NestFactory.create(AppModule)`로 앱을 만들고 포트를 열어 서버를 시작한다. CORS 설정, 전역 미들웨어 등 앱 전체에 적용할 설정은 여기서 한다.

---

## Module — 기능 단위 묶음

```ts
@Module({
  imports: [...],      // 이 모듈에서 사용할 다른 모듈
  controllers: [...],  // HTTP 요청을 받을 컨트롤러
  providers: [...],    // 비즈니스 로직을 담은 서비스
  exports: [...],      // 다른 모듈에 공개할 서비스
})
export class OpenaiModule {}
```

기능을 하나의 단위로 묶는 역할이다. `AppModule`이 루트 모듈이고, 여기서 하위 모듈들을 조립한다.

```ts
// app.module.ts
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    RedisModule,
    OpenaiModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

---

## Controller — 요청/응답 처리

```ts
@Controller('openai')              // 기본 경로: /openai
export class OpenaiController {
  constructor(private readonly openaiService: OpenaiService) {}

  @Post('chat')                    // POST /openai/chat
  async chat(@Body() dto: ChatRequestDto): Promise<ChatResponse> {
    return this.openaiService.chat(dto);
  }
}
```

HTTP 요청을 받아서 Service에 넘기고 응답을 반환한다. **비즈니스 로직은 여기 두지 않는다.** 요청을 받고 서비스를 호출하는 역할만 한다.

자주 쓰는 데코레이터:

| 데코레이터 | 역할 |
|-----------|------|
| `@Controller('경로')` | 컨트롤러 기본 경로 설정 |
| `@Get()` / `@Post()` | HTTP 메서드 + 세부 경로 |
| `@Body()` | 요청 body 파싱 |
| `@Param('id')` | URL 파라미터 추출 |
| `@Query('key')` | 쿼리스트링 추출 |

---

## Service — 비즈니스 로직

```ts
@Injectable()
export class OpenaiService {
  constructor(private redisService: RedisService) {}

  async chat(dto: ChatRequestDto): Promise<ChatResponse> {
    const context = await this.redisService.getContext(dto.sessionId);
    // OpenAI API 호출 및 응답 처리
    return { success: true, message: reply };
  }
}
```

실제 처리 로직이 들어가는 곳이다. `@Injectable()`을 붙여야 NestJS가 이 클래스를 주입 가능한 서비스로 인식한다.

---

## DTO — 요청/응답 타입 정의

```ts
// 요청 타입
export class ChatRequestDto {
  prompt: string;
  sessionId: string;
}

// 응답 타입
export interface ChatResponse {
  success: boolean;
  message?: string;
  error?: string;
}
```

DTO(Data Transfer Object)는 요청 body나 응답의 타입을 정의한다. Controller에서 `@Body() dto: ChatRequestDto`로 받으면 TypeScript가 타입을 보장해준다.

---

## 의존성 주입 (DI)

NestJS에서 가장 중요한 개념이다. 직접 `new Service()`로 인스턴스를 만들지 않고, 생성자에 타입을 선언만 하면 NestJS가 알아서 인스턴스를 만들어 넣어준다.

```ts
// 직접 생성 — NestJS에서는 이렇게 안 함
const redis = new RedisService();

// 생성자에 선언만 하면 NestJS가 주입해줌
constructor(private redisService: RedisService) {}
```

이렇게 하면 서비스 간 결합도가 낮아지고, 테스트할 때 Mock으로 교체하기도 쉬워진다.

DI가 동작하려면 두 가지 조건이 필요하다:
1. 주입받을 클래스에 `@Injectable()` 데코레이터
2. 해당 클래스가 같은 모듈의 `providers`에 등록되어 있거나, 다른 모듈에서 `exports`로 공개되어 있을 것

---

## ConfigModule — 환경변수 관리

```ts
ConfigModule.forRoot({
  isGlobal: true,      // 모든 모듈에서 별도 import 없이 사용 가능
  envFilePath: '.env', // 읽어올 .env 파일 경로
})
```

`.env` 파일을 읽어서 `process.env`로 접근할 수 있게 해주는 공식 모듈이다. `isGlobal: true`로 설정하면 다른 모듈에서 따로 import 없이도 쓸 수 있다.

```ts
// ConfigService로 타입 안전하게 접근
const apiKey = this.configService.get<string>('OPENAI_API_KEY');
```

---

## @Global() — 전역 모듈

```ts
@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
```

`@Global()`을 붙이면 이 모듈을 다른 모듈에서 `imports`에 명시하지 않아도 내부 서비스를 주입받을 수 있다. 앱 전체에서 공통으로 쓰는 인프라(Redis, DB 연결 등)에 쓴다.

---

## 요청 흐름 정리

```
클라이언트 요청
  → main.ts (CORS, 미들웨어)
  → AppModule (모듈 라우팅)
  → OpenaiController (경로 매칭, body 파싱)
  → OpenaiService (비즈니스 로직)
  → RedisService (컨텍스트 조회/저장)
  → 응답 반환
```
