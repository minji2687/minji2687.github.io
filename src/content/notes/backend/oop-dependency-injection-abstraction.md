---
title: "OOP로 리팩터링하기: 캡슐화·상속·추상화·의존성 주입"
description: "절차적으로 짜인 메모 CRUD API를 OOP 원칙을 적용해 레이어 구조로 바꾼 과정을 정리한다."
date: "2026-06-10"
tags: ["OOP", "JavaScript", "Refactoring"]
---

## 들어가며

> 실습 레포: [minji2687/LLM-chat-service](https://github.com/minji2687/LLM-chat-service)

메모 CRUD API를 Express로 만들었을 때, 처음엔 `index.js` 하나에 전부 때려 넣었다.

```js
const memos = new Map();

app.post('/memos', (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: 'title and content are required' });
  }
  const memo = {
    id: crypto.randomUUID(),
    title,
    content,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  memos.set(memo.id, memo);
  res.status(201).json(memo);
});
```

문제는 세 가지였다.

- **유효성 검사**가 라우터마다 흩어져 있어서 중복이 생긴다.
- **상태(`memos`)와 로직**이 같은 파일에 섞여 있다.
- 저장소를 DB로 바꾸려면 라우터 코드를 직접 건드려야 한다.

이걸 OOP 원칙 네 가지를 순서대로 적용해 레이어 구조로 바꿨다.

---

## 1. 캡슐화 (Encapsulation)

> 내부 상태를 숨기고, 허용된 메서드로만 접근하게 한다.

`Memo`를 plain object에서 클래스로 바꾸면서 `#id`, `#title`, `#content`를 private field로 선언했다.

```js
// src/models/Entity.js
class Entity {
  #createdAt;
  #updatedAt;

  constructor() {
    const now = new Date().toISOString();
    this.#createdAt = now;
    this.#updatedAt = now;
  }

  touch() {
    this.#updatedAt = new Date().toISOString();
  }

  getTimestamps() {
    return { createdAt: this.#createdAt, updatedAt: this.#updatedAt };
  }
}
```

```js
// src/models/Memo.js
class Memo extends Entity {
  #id;
  #title;
  #content;

  constructor(title, content) {
    super();
    this.#validate(title, content);
    this.#id = crypto.randomUUID();
    this.#title = title;
    this.#content = content;
  }

  #validate(title, content) {
    if (!title || !content) throw new ValidationError('title and content are required');
  }

  update(title, content) {
    this.#validate(title, content);
    this.#title = title;
    this.#content = content;
    this.touch();
  }

  toJSON() {
    return { id: this.#id, title: this.#title, content: this.#content, ...this.getTimestamps() };
  }
}
```

**핵심 변화:**

- 라우터에 흩어져 있던 유효성 검사가 `#validate()`로 들어갔다. 생성(`constructor`)과 수정(`update`) 모두 이 메서드를 거치므로, 유효성 검사 로직이 한 곳에서만 관리된다.
- `updatedAt`을 직접 수정하는 대신 `touch()`를 호출한다. 외부에서 타임스탬프에 직접 접근할 수 없다.

---

## 2. 상속 (Inheritance)

> 공통 로직을 부모 클래스에 두고, 자식이 물려받는다.

`Memo`는 `Entity`를 상속해 타임스탬프 관리를 가져간다. 나중에 `Comment`, `Post` 같은 엔티티를 추가해도 `Entity`만 상속하면 된다.

에러도 같은 방식으로 계층을 만들었다.

```js
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') { super(message, 404); }
}

class ValidationError extends AppError {
  constructor(message) { super(message, 400); }
}
```

라우터에서는 `AppError` 하나만 보면 된다.

```js
function handleError(err, res) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }
  throw err;
}
```

`NotFoundError`든 `ValidationError`든 `AppError`의 자식이므로 `instanceof AppError`로 한 번에 잡힌다.

---

## 3. 추상화 (Abstraction)

> 구체적인 구현을 숨기고, 인터페이스만 드러낸다.

`BaseRepository`는 저장소가 갖춰야 할 메서드 목록을 정의한다. 구현은 없고, 자식이 반드시 오버라이드해야 한다.

```js
// src/repositories/BaseRepository.js
class BaseRepository {
  findAll()    { this.#notImplemented('findAll'); }
  findById(id) { this.#notImplemented('findById'); }
  save(entity) { this.#notImplemented('save'); }
  delete(id)   { this.#notImplemented('delete'); }

  #notImplemented(method) {
    throw new Error(`${this.constructor.name} must implement ${method}()`);
  }
}
```

```js
// src/repositories/InMemoryMemoRepository.js
class InMemoryMemoRepository extends BaseRepository {
  #memos = new Map();

  findAll()    { return Array.from(this.#memos.values()); }
  findById(id) { return this.#memos.get(id) ?? null; }
  save(memo)   { this.#memos.set(memo.toJSON().id, memo); return memo; }
  delete(id)   { return this.#memos.delete(id); }
}
```

`Service`는 `InMemoryMemoRepository`가 Map을 쓰는지, DB를 쓰는지 알 필요가 없다. `findById`, `save` 같은 메서드가 있다는 사실만 안다.

---

## 4. 의존성 주입 (Dependency Injection)

> 객체가 직접 의존성을 만들지 않고, 외부에서 받는다.

`BaseService`는 생성자에서 `repository`를 주입받는다.

```js
// src/services/BaseService.js
class BaseService {
  constructor(repository) {
    this.repository = repository;
  }

  findOrThrow(id, message = 'Resource not found') {
    const entity = this.repository.findById(id);
    if (!entity) throw new NotFoundError(message);
    return entity;
  }
}
```

```js
// src/services/MemoService.js
class MemoService extends BaseService {
  create(title, content) {
    const memo = new Memo(title, content);
    return this.repository.save(memo).toJSON();
  }

  update(id, title, content) {
    const memo = this.findOrThrow(id, 'Memo not found');
    memo.update(title, content);
    return memo.toJSON();
  }
  // ...
}
```

`MemoService`는 `InMemoryMemoRepository`를 직접 import하지 않는다. `index.js`에서 조립한다.

```js
// index.js (리팩터링 후)
const memoRepository = new InMemoryMemoRepository();
const memoService = new MemoService(memoRepository);

app.use('/memos', createMemoRouter(memoService));
```

저장소를 `PostgresMemoRepository`로 바꾸고 싶으면 `index.js`의 한 줄만 바꾸면 된다. `MemoService` 코드는 손댈 필요가 없다.

**왜 이렇게 하는가?**

DI를 쓰지 않으면 `MemoService`가 저장소를 직접 결정하게 된다.

```js
class MemoService {
  constructor() {
    this.repository = new InMemoryMemoRepository(); // 직접 생성
  }
}
```

이렇게 되면 테스트할 때 가짜 저장소를 끼워 넣을 수 없고, DB로 바꾸려면 `MemoService` 코드를 손봐야 한다.

DI로 바꾸면 **선택권이 바깥으로 나온다.**

```js
// 테스트할 때
const service = new MemoService(new InMemoryMemoRepository());

// 프로덕션
const service = new MemoService(new PostgresMemoRepository());
```

`MemoService`는 저장소가 `findById`, `save` 같은 메서드를 가진다는 것만 안다. 그 저장소가 Map인지 DB인지는 `index.js`가 결정하고 주입한다. **"무엇을 쓸지"는 Service가 결정하지 않고, "어떻게 쓸지"만 Service가 안다.**

---

## 데이터 흐름

`PUT /memos/:id` 요청 하나가 레이어를 어떻게 통과하는지 추적하면 구조가 보인다.

```
HTTP Request  PUT /memos/abc  { title: "새제목", content: "내용" }
      ↓
Router        memoRoutes.js
              router.put('/:id', ...)
      ↓
Service       MemoService.update(id, title, content)
              this.findOrThrow(id)  ← BaseService에서 상속받은 메서드
      ↓
Repository    InMemoryMemoRepository.findById(id)
              Map에서 Memo 인스턴스를 꺼내서 반환
              (없으면 NotFoundError)
      ↓
Model         memo.update(title, content)
              #validate() → #title, #content 갱신 → touch()로 updatedAt 갱신
              memo.toJSON() → plain object 반환
      ↓
HTTP Response { id, title, content, createdAt, updatedAt }
```

각 레이어는 자기 역할만 한다.

| 레이어 | 역할 |
|---|---|
| Router | HTTP 요청/응답 처리 |
| Service | 비즈니스 로직 (찾아서 수정) |
| Repository | 저장소 접근 |
| Model | 데이터 유효성 검사 + 상태 관리 |

Model이 진입점처럼 보일 수 있지만, 실제로는 제일 아래 레이어다. Repository가 꺼내온 인스턴스를 Service에서 조작하는 구조다.

---

## 결과

리팩터링 전후로 `index.js`가 얼마나 달라졌는지 보면 변화가 바로 보인다.

| | 리팩터링 전 | 리팩터링 후 |
|---|---|---|
| `index.js` 라인 수 | 84줄 | 19줄 |
| 유효성 검사 위치 | 각 라우터마다 중복 | `Memo#validate()` 한 곳 |
| 에러 처리 | 라우터마다 개별 응답 | `handleError()` 한 곳 |
| 저장소 교체 | 라우터 전체 수정 | `index.js` 한 줄 교체 |
