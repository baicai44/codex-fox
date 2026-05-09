# 协议转换代理实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 构建一个 Node.js HTTP 代理，将 OpenAI Chat Completions 和 Anthropic Messages API 请求转换为 OpenAI Responses API 格式。

**架构：** Express 服务器监听两个端点（`/v1/chat/completions` 和 `/v1/messages`），将请求体转换为 Responses API 格式后转发到 `https://api.openai.com/v1/responses`，再将响应转换回入站协议期望的格式。支持流式 SSE 转发。

**技术栈：** Node.js + TypeScript + Express + fetch API + dotenv

---

## 文件结构

```
d:\codex-fox\
├── src/
│   ├── index.ts                    # Express 入口、路由、中间件
│   ├── types.ts                    # 所有请求/响应类型定义
│   ├── transformers/
│   │   ├── request.ts              # 入站请求 → Responses API 转换
│   │   └── response.ts             # Responses API → 出站响应转换
│   ├── stream.ts                   # SSE 流式转发
│   └── config.ts                   # 环境变量配置
├── tests/
│   ├── request-transformer.test.ts
│   ├── response-transformer.test.ts
│   └── stream.test.ts
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

---

### 任务 1：项目初始化

**文件：**
- 创建：`d:\codex-fox\package.json`
- 创建：`d:\codex-fox\tsconfig.json`
- 创建：`d:\codex-fox\.env.example`

- [ ] **步骤 1：初始化 npm 项目**

```bash
cd d:\codex-fox && npm init -y
npm install express dotenv
npm install -D typescript @types/node @types/express ts-node nodemon vitest
npx tsc --init
```

- [ ] **步骤 2：配置 package.json**

修改 `package.json` 添加 scripts：

```json
{
  "name": "protocol-proxy",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "nodemon --exec ts-node src/index.ts",
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "express": "^4.21.0",
    "dotenv": "^16.4.5"
  },
  "devDependencies": {
    "@types/express": "^5.0.0",
    "@types/node": "^22.0.0",
    "nodemon": "^3.1.0",
    "ts-node": "^10.9.2",
    "typescript": "^5.6.0",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **步骤 3：配置 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **步骤 4：创建 .env.example**

```env
OPENAI_API_KEY=sk-your-key-here
PORT=3000
UPSTREAM_URL=https://api.openai.com/v1/responses
```

- [ ] **步骤 5：Commit**

```bash
git add package.json tsconfig.json .env.example
git commit -m "chore: initialize Node.js project with TypeScript"
```

---

### 任务 2：类型定义

**文件：**
- 创建：`d:\codex-fox\src\types.ts`

- [ ] **步骤 1：定义类型**

```typescript
// ==================== OpenAI Chat Completions 入站 ====================

export interface OpenAIChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | Array<ContentPart>;
  tool_call_id?: string;
  name?: string;
}

export interface ContentPart {
  type: "text" | "image_url";
  text?: string;
  image_url?: { url: string; detail?: string };
}

export interface OpenAIChatTool {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters: Record<string, unknown>;
  };
}

export interface OpenAIChatRequest {
  model: string;
  messages: OpenAIChatMessage[];
  tools?: OpenAIChatTool[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string | string[];
  stream?: boolean;
}

// ==================== Anthropic Messages 入站 ====================

export interface AnthropicMessage {
  role: "user" | "assistant";
  content: string | Array<AnthropicContentPart>;
}

export interface AnthropicContentPart {
  type: "text" | "image" | "tool_use" | "tool_result";
  text?: string;
  source?: { type: "base64"; media_type: string; data: string };
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  output?: Array<AnthropicContentPart>;
}

export interface AnthropicTool {
  name: string;
  description?: string;
  input_schema: Record<string, unknown>;
}

export interface AnthropicMessageRequest {
  model: string;
  messages: AnthropicMessage[];
  system?: string | Array<{ type: "text"; text: string }>;
  tools?: AnthropicTool[];
  max_tokens: number;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  stop_sequences?: string[];
  stream?: boolean;
}

// ==================== OpenAI Responses API ====================

export interface ResponsesInputItem {
  role: "system" | "user" | "assistant";
  content: string | Array<ResponsesContentPart>;
}

export interface ResponsesContentPart {
  type: "input_text" | "input_image";
  text?: string;
  image_url?: string;
  image_detail?: "auto" | "low" | "high";
}

export interface ResponsesTool {
  type: "function";
  name: string;
  description?: string;
  parameters: Record<string, unknown>;
}

export interface ResponsesAPIRequest {
  model: string;
  input: string | ResponsesInputItem[];
  tools?: ResponsesTool[];
  temperature?: number;
  max_output_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string | string[];
  stream?: boolean;
}

// ==================== Responses API 响应 ====================

export interface ResponsesAPIResponse {
  id: string;
  object: string;
  created_at: number;
  status: string;
  output: Array<{
    type: string;
    role?: string;
    content: Array<{
      type: string;
      text: string;
    }>;
  }>;
  usage?: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
}

export interface ResponsesAPIStreamEvent {
  type: string;
  output_index?: number;
  delta?: string;
  item?: {
    role?: string;
    content?: Array<{ type: string; text: string }>;
  };
}

// ==================== 出站响应格式 ====================

export interface OpenAIChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: { role: string; content: string };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface AnthropicMessageResponse {
  id: string;
  type: string;
  role: string;
  content: Array<{ type: string; text: string }>;
  model: string;
  stop_reason: string;
  stop_sequence?: string | null;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

// ==================== 错误响应 ====================

export interface ErrorResponse {
  error: {
    message: string;
    type: string;
    code?: string;
  };
}
```

- [ ] **步骤 2：Commit**

```bash
git add src/types.ts
git commit -m "feat: define all request/response types"
```

---

### 任务 3：配置模块

**文件：**
- 创建：`d:\codex-fox\src\config.ts`

- [ ] **步骤 1：编写配置模块**

```typescript
import dotenv from "dotenv";

dotenv.config();

export interface Config {
  openaiApiKey: string;
  port: number;
  upstreamUrl: string;
}

export function loadConfig(): Config {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    throw new Error("OPENAI_API_KEY environment variable is required");
  }

  return {
    openaiApiKey,
    port: parseInt(process.env.PORT || "3000", 10),
    upstreamUrl:
      process.env.UPSTREAM_URL || "https://api.openai.com/v1/responses",
  };
}
```

- [ ] **步骤 2：Commit**

```bash
git add src/config.ts
git commit -m "feat: add configuration module with env validation"
```

---

### 任务 4：请求转换器 + 测试

**文件：**
- 创建：`d:\codex-fox\src\transformers\request.ts`
- 创建：`d:\codex-fox\tests\request-transformer.test.ts`

- [ ] **步骤 1：编写失败的测试**

```typescript
// tests/request-transformer.test.ts
import { describe, it, expect } from "vitest";
import {
  transformOpenAIRequest,
  transformAnthropicRequest,
} from "../src/transformers/request.js";

describe("transformOpenAIRequest", () => {
  it("converts basic chat request to Responses API format", () => {
    const input = {
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are helpful" },
        { role: "user", content: "Hello" },
      ],
      temperature: 0.7,
      max_tokens: 100,
    };

    const result = transformOpenAIRequest(input);

    expect(result.model).toBe("gpt-4o");
    expect(result.input).toEqual([
      { role: "system", content: "You are helpful" },
      { role: "user", content: "Hello" },
    ]);
    expect(result.temperature).toBe(0.7);
    expect(result.max_output_tokens).toBe(100);
  });

  it("converts max_tokens to max_output_tokens", () => {
    const input = {
      model: "gpt-4o",
      messages: [{ role: "user", content: "Hi" }],
      max_tokens: 50,
    };

    const result = transformOpenAIRequest(input);

    expect(result.max_output_tokens).toBe(50);
    expect(result).not.toHaveProperty("max_tokens");
  });

  it("passes tools through unchanged", () => {
    const tools = [
      {
        type: "function",
        function: {
          name: "get_weather",
          description: "Get weather",
          parameters: { type: "object", properties: {} },
        },
      },
    ];

    const input = {
      model: "gpt-4o",
      messages: [{ role: "user", content: "Weather?" }],
      tools,
    };

    const result = transformOpenAIRequest(input);

    expect(result.tools).toEqual([
      {
        type: "function",
        name: "get_weather",
        description: "Get weather",
        parameters: { type: "object", properties: {} },
      },
    ]);
  });
});

describe("transformAnthropicRequest", () => {
  it("converts basic anthropic request to Responses API format", () => {
    const input = {
      model: "claude-3-5-sonnet-20241022",
      messages: [{ role: "user", content: "Hello" }],
      max_tokens: 100,
    };

    const result = transformAnthropicRequest(input, "gpt-4o");

    expect(result.model).toBe("gpt-4o");
    expect(result.input).toEqual([{ role: "user", content: "Hello" }]);
    expect(result.max_output_tokens).toBe(100);
  });

  it("moves system string to first input item", () => {
    const input = {
      model: "claude-3-5-sonnet-20241022",
      messages: [{ role: "user", content: "Hi" }],
      system: "You are a coder",
      max_tokens: 100,
    };

    const result = transformAnthropicRequest(input, "gpt-4o");

    expect((result.input as any[])[0]).toEqual({
      role: "system",
      content: "You are a coder",
    });
    expect((result.input as any[])[1]).toEqual({
      role: "user",
      content: "Hi",
    });
  });

  it("converts anthropic tools to responses API tools", () => {
    const tools = [
      {
        name: "get_weather",
        description: "Get weather",
        input_schema: { type: "object", properties: {} },
      },
    ];

    const input = {
      model: "claude-3-5-sonnet-20241022",
      messages: [{ role: "user", content: "Weather?" }],
      tools,
      max_tokens: 100,
    };

    const result = transformAnthropicRequest(input, "gpt-4o");

    expect(result.tools).toEqual([
      {
        type: "function",
        name: "get_weather",
        description: "Get weather",
        parameters: { type: "object", properties: {} },
      },
    ]);
  });

  it("maps stop_sequences to stop", () => {
    const input = {
      model: "claude-3-5-sonnet-20241022",
      messages: [{ role: "user", content: "Hi" }],
      max_tokens: 100,
      stop_sequences: ["\n\n", "STOP"],
    };

    const result = transformAnthropicRequest(input, "gpt-4o");

    expect(result.stop).toEqual(["\n\n", "STOP"]);
  });
});
```

- [ ] **步骤 2：运行测试验证失败**

```bash
npm test
```
预期：FAIL，报错函数未定义

- [ ] **步骤 3：编写请求转换器实现**

```typescript
// src/transformers/request.ts
import {
  OpenAIChatRequest,
  AnthropicMessageRequest,
  ResponsesAPIRequest,
  ResponsesInputItem,
  AnthropicTool,
  ResponsesTool,
} from "../types.js";

export function transformOpenAIRequest(
  request: OpenAIChatRequest
): ResponsesAPIRequest {
  return {
    model: request.model,
    input: request.messages.map((msg) => ({
      role: msg.role as "system" | "user" | "assistant",
      content:
        typeof msg.content === "string"
          ? msg.content
          : msg.content.map((part) => {
              if (part.type === "text") return { type: "input_text" as const, text: part.text };
              if (part.type === "image_url")
                return {
                  type: "input_image" as const,
                  image_url: part.image_url!.url,
                  image_detail: part.image_url!.detail || "auto",
                };
              return part;
            }),
    })),
    tools: request.tools?.map((t) => ({
      type: "function" as const,
      name: t.function.name,
      description: t.function.description,
      parameters: t.function.parameters,
    })),
    temperature: request.temperature,
    max_output_tokens: request.max_tokens,
    top_p: request.top_p,
    frequency_penalty: request.frequency_penalty,
    presence_penalty: request.presence_penalty,
    stop: request.stop,
    stream: request.stream,
  };
}

export function transformAnthropicRequest(
  request: AnthropicMessageRequest,
  targetModel: string
): ResponsesAPIRequest {
  const inputItems: ResponsesInputItem[] = [];

  // Handle system prompt
  if (request.system) {
    const systemContent =
      typeof request.system === "string"
        ? request.system
        : request.system
            .filter((s) => s.type === "text")
            .map((s) => s.text)
            .join("\n");
    inputItems.push({ role: "system", content: systemContent });
  }

  // Handle messages
  for (const msg of request.messages) {
    const content =
      typeof msg.content === "string"
        ? msg.content
        : msg.content.map((part) => {
            if (part.type === "text")
              return { type: "input_text" as const, text: part.text };
            if (part.type === "image" && part.source)
              return {
                type: "input_image" as const,
                image_url: `data:${part.source.media_type};base64,${part.source.data}`,
              };
            return { type: "input_text" as const, text: JSON.stringify(part) };
          });
    inputItems.push({
      role: msg.role as "user" | "assistant",
      content,
    });
  }

  // Convert tools
  const tools: ResponsesTool[] | undefined = request.tools?.map(
    (t: AnthropicTool) => ({
      type: "function" as const,
      name: t.name,
      description: t.description,
      parameters: t.input_schema,
    })
  );

  return {
    model: targetModel,
    input: inputItems,
    tools,
    temperature: request.temperature,
    max_output_tokens: request.max_tokens,
    top_p: request.top_p,
    stop: request.stop_sequences,
    stream: request.stream,
  };
}
```

- [ ] **步骤 4：运行测试验证通过**

```bash
npm test
```
预期：全部 PASS

- [ ] **步骤 5：Commit**

```bash
git add src/transformers/request.ts tests/request-transformer.test.ts
git commit -m "feat: implement request transformers with tests"
```

---

### 任务 5：响应转换器 + 测试

**文件：**
- 创建：`d:\codex-fox\src\transformers\response.ts`
- 创建：`d:\codex-fox\tests\response-transformer.test.ts`

- [ ] **步骤 1：编写失败的测试**

```typescript
// tests/response-transformer.test.ts
import { describe, it, expect } from "vitest";
import {
  transformToOpenAIResponse,
  transformToAnthropicResponse,
} from "../src/transformers/response.js";

describe("transformToOpenAIResponse", () => {
  it("converts responses API response to OpenAI chat completion format", () => {
    const input = {
      id: "resp_abc123",
      object: "response",
      created_at: 1715000000,
      status: "completed",
      output: [
        {
          type: "message",
          role: "assistant",
          content: [{ type: "output_text", text: "Hello there!" }],
        },
      ],
      usage: {
        input_tokens: 10,
        output_tokens: 5,
        total_tokens: 15,
      },
    };

    const result = transformToOpenAIResponse(input, "gpt-4o");

    expect(result.id).toBe("resp_abc123");
    expect(result.object).toBe("chat.completion");
    expect(result.model).toBe("gpt-4o");
    expect(result.choices[0].message).toEqual({
      role: "assistant",
      content: "Hello there!",
    });
    expect(result.choices[0].finish_reason).toBe("stop");
    expect(result.usage).toEqual({
      prompt_tokens: 10,
      completion_tokens: 5,
      total_tokens: 15,
    });
  });
});

describe("transformToAnthropicResponse", () => {
  it("converts responses API response to Anthropic message format", () => {
    const input = {
      id: "resp_xyz789",
      object: "response",
      created_at: 1715000000,
      status: "completed",
      output: [
        {
          type: "message",
          role: "assistant",
          content: [{ type: "output_text", text: "Hi!" }],
        },
      ],
      usage: {
        input_tokens: 8,
        output_tokens: 3,
        total_tokens: 11,
      },
    };

    const result = transformToAnthropicResponse(input, "claude-3-5-sonnet-20241022");

    expect(result.id).toBe("resp_xyz789");
    expect(result.type).toBe("message");
    expect(result.role).toBe("assistant");
    expect(result.content).toEqual([{ type: "text", text: "Hi!" }]);
    expect(result.model).toBe("claude-3-5-sonnet-20241022");
    expect(result.stop_reason).toBe("end_turn");
    expect(result.usage).toEqual({
      input_tokens: 8,
      output_tokens: 3,
    });
  });
});
```

- [ ] **步骤 2：运行测试验证失败**

```bash
npm test
```
预期：FAIL，函数未定义

- [ ] **步骤 3：编写响应转换器实现**

```typescript
// src/transformers/response.ts
import {
  ResponsesAPIResponse,
  OpenAIChatCompletionResponse,
  AnthropicMessageResponse,
} from "../types.js";

export function transformToOpenAIResponse(
  response: ResponsesAPIResponse,
  model: string
): OpenAIChatCompletionResponse {
  const textContent =
    response.output[0]?.content
      ?.filter((c) => c.type === "output_text")
      .map((c) => c.text)
      .join("\n") || "";

  return {
    id: response.id,
    object: "chat.completion",
    created: response.created_at,
    model,
    choices: [
      {
        index: 0,
        message: {
          role: response.output[0]?.role || "assistant",
          content: textContent,
        },
        finish_reason: "stop",
      },
    ],
    usage: response.usage
      ? {
          prompt_tokens: response.usage.input_tokens,
          completion_tokens: response.usage.output_tokens,
          total_tokens: response.usage.total_tokens,
        }
      : undefined,
  };
}

export function transformToAnthropicResponse(
  response: ResponsesAPIResponse,
  model: string
): AnthropicMessageResponse {
  const textContent =
    response.output[0]?.content
      ?.filter((c) => c.type === "output_text")
      .map((c) => c.text) || [];

  return {
    id: response.id,
    type: "message",
    role: response.output[0]?.role || "assistant",
    content: textContent.map((t) => ({ type: "text", text: t.text || t })),
    model,
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: response.usage
      ? {
          input_tokens: response.usage.input_tokens,
          output_tokens: response.usage.output_tokens,
        }
      : undefined,
  };
}
```

- [ ] **步骤 4：运行测试验证通过**

```bash
npm test
```
预期：全部 PASS

- [ ] **步骤 5：Commit**

```bash
git add src/transformers/response.ts tests/response-transformer.test.ts
git commit -m "feat: implement response transformers with tests"
```

---

### 任务 6：SSE 流处理 + 测试

**文件：**
- 创建：`d:\codex-fox\src\stream.ts`
- 创建：`d:\codex-fox\tests\stream.test.ts`

- [ ] **步骤 1：编写失败的测试**

```typescript
// tests/stream.test.ts
import { describe, it, expect } from "vitest";
import {
  parseSSELine,
  formatOpenAISSEEvent,
  formatAnthropicSSEEvent,
} from "../src/stream.js";

describe("parseSSELine", () => {
  it("parses event lines", () => {
    const result = parseSSELine("event: response.output_text.delta");
    expect(result).toEqual({ event: "response.output_text.delta" });
  });

  it("parses data lines", () => {
    const result = parseSSELine('data: {"text": "hello"}');
    expect(result).toEqual({ data: { text: "hello" } });
  });

  it("returns empty for non-event/data lines", () => {
    const result = parseSSELine(":comment");
    expect(result).toEqual({});
  });
});

describe("formatOpenAISSEEvent", () => {
  it("formats delta events for OpenAI", () => {
    const result = formatOpenAISSEEvent("response.output_text.delta", {
      delta: "Hello",
    });
    expect(result).toContain("event: delta");
    expect(result).toContain("data:");
    expect(result).toContain("Hello");
  });

  it("formats done events for OpenAI", () => {
    const result = formatOpenAISSEEvent("response.completed", null);
    expect(result).toContain("event: done");
  });
});

describe("formatAnthropicSSEEvent", () => {
  it("formats content_block_delta events for Anthropic", () => {
    const result = formatAnthropicSSEEvent("response.output_text.delta", {
      delta: "Hi",
    });
    expect(result).toContain("event: content_block_delta");
    expect(result).toContain("text_delta");
    expect(result).toContain("Hi");
  });
});
```

- [ ] **步骤 2：运行测试验证失败**

```bash
npm test
```
预期：FAIL

- [ ] **步骤 3：编写流处理实现**

```typescript
// src/stream.ts
import { Response } from "express";

export interface ParsedSSELine {
  event?: string;
  data?: unknown;
}

export function parseSSELine(line: string): ParsedSSELine {
  if (line.startsWith("event:")) {
    return { event: line.slice(6).trim() };
  }
  if (line.startsWith("data:")) {
    try {
      return { data: JSON.parse(line.slice(5).trim()) };
    } catch {
      return { data: line.slice(5).trim() };
    }
  }
  return {};
}

export function formatOpenAISSEEvent(
  eventType: string,
  payload: unknown
): string {
  if (eventType === "response.completed") {
    return `event: done\r\ndata: ${JSON.stringify({ choices: [{ finish_reason: "stop" }] })}\r\n\r\n`;
  }

  if (eventType === "response.output_text.delta" && payload) {
    const data = payload as { delta?: string };
    return `event: delta\r\ndata: ${JSON.stringify({ choices: [{ index: 0, delta: { content: data.delta } }] })}\r\n\r\n`;
  }

  return "";
}

export function formatAnthropicSSEEvent(
  eventType: string,
  payload: unknown
): string {
  if (eventType === "response.completed") {
    return `event: message_stop\r\ndata: ${JSON.stringify({ type: "message_stop" })}\r\n\r\n`;
  }

  if (eventType === "response.output_text.delta" && payload) {
    const data = payload as { delta?: string };
    return `event: content_block_delta\r\ndata: ${JSON.stringify({ type: "content_block_delta", index: 0, delta: { type: "text_delta", text: data.delta } })}\r\n\r\n`;
  }

  return "";
}

export async function streamSSE(
  response: Response,
  upstreamResponse: Response,
  formatEvent: (eventType: string, payload: unknown) => string
): Promise<void> {
  response.setHeader("Content-Type", "text/event-stream");
  response.setHeader("Cache-Control", "no-cache");
  response.setHeader("Connection", "keep-alive");

  const reader = (upstreamResponse.body as ReadableStream).getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.trim() === "" || line.startsWith(":")) continue;
        const parsed = parseSSELine(line);
        if (parsed.event && parsed.data !== undefined) {
          const formatted = formatEvent(parsed.event, parsed.data);
          if (formatted) response.write(formatted);
        }
      }
    }
  } finally {
    response.end();
  }
}
```

- [ ] **步骤 4：运行测试验证通过**

```bash
npm test
```
预期：全部 PASS

- [ ] **步骤 5：Commit**

```bash
git add src/stream.ts tests/stream.test.ts
git commit -m "feat: implement SSE stream handler with tests"
```

---

### 任务 7：Express 入口 + 路由

**文件：**
- 创建：`d:\codex-fox\src\index.ts`

- [ ] **步骤 1：编写 Express 服务器**

```typescript
// src/index.ts
import express, { Request, Response } from "express";
import { loadConfig } from "./config.js";
import {
  transformOpenAIRequest,
  transformAnthropicRequest,
} from "./transformers/request.js";
import {
  transformToOpenAIResponse,
  transformToAnthropicResponse,
} from "./transformers/response.js";
import { streamSSE, formatOpenAISSEEvent, formatAnthropicSSEEvent } from "./stream.js";
import { OpenAIChatRequest, AnthropicMessageRequest } from "./types.js";

const config = loadConfig();
const app = express();

app.use(express.json());

// ==================== OpenAI Chat Completions 端点 ====================

app.post("/v1/chat/completions", async (req: Request, res: Response) => {
  try {
    const chatRequest = req.body as OpenAIChatRequest;
    const responsesRequest = transformOpenAIRequest(chatRequest);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.openaiApiKey}`,
    };

    if (chatRequest.stream) {
      const upstreamResponse = await fetch(config.upstreamUrl, {
        method: "POST",
        headers: { ...headers, Accept: "text/event-stream" },
        body: JSON.stringify({ ...responsesRequest, stream: true }),
      });

      if (!upstreamResponse.ok) {
        res.status(upstreamResponse.status).json({
          error: { message: await upstreamResponse.text(), type: "upstream_error" },
        });
        return;
      }

      await streamSSE(res, upstreamResponse as any, formatOpenAISSEEvent);
    } else {
      const upstreamResponse = await fetch(config.upstreamUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(responsesRequest),
      });

      if (!upstreamResponse.ok) {
        res.status(upstreamResponse.status).json({
          error: { message: await upstreamResponse.text(), type: "upstream_error" },
        });
        return;
      }

      const data = await upstreamResponse.json();
      const transformed = transformToOpenAIResponse(data, chatRequest.model);
      res.json(transformed);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(400).json({ error: { message, type: "transformation_error" } });
  }
});

// ==================== Anthropic Messages 端点 ====================

app.post("/v1/messages", async (req: Request, res: Response) => {
  try {
    const anthropicRequest = req.body as AnthropicMessageRequest;
    const targetModel = anthropicRequest.model.startsWith("claude")
      ? "gpt-4o"
      : anthropicRequest.model;

    const responsesRequest = transformAnthropicRequest(anthropicRequest, targetModel);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.openaiApiKey}`,
    };

    if (anthropicRequest.stream) {
      const upstreamResponse = await fetch(config.upstreamUrl, {
        method: "POST",
        headers: { ...headers, Accept: "text/event-stream" },
        body: JSON.stringify({ ...responsesRequest, stream: true }),
      });

      if (!upstreamResponse.ok) {
        res.status(upstreamResponse.status).json({
          error: { message: await upstreamResponse.text(), type: "upstream_error" },
        });
        return;
      }

      await streamSSE(res, upstreamResponse as any, formatAnthropicSSEEvent);
    } else {
      const upstreamResponse = await fetch(config.upstreamUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(responsesRequest),
      });

      if (!upstreamResponse.ok) {
        res.status(upstreamResponse.status).json({
          error: { message: await upstreamResponse.text(), type: "upstream_error" },
        });
        return;
      }

      const data = await upstreamResponse.json();
      const transformed = transformToAnthropicResponse(data, anthropicRequest.model);
      res.json(transformed);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(400).json({ error: { message, type: "transformation_error" } });
  }
});

// ==================== 启动服务器 ====================

app.listen(config.port, () => {
  console.log(`Protocol proxy listening on http://localhost:${config.port}`);
});

export default app;
```

- [ ] **步骤 2：Commit**

```bash
git add src/index.ts
git commit -m "feat: add Express server with OpenAI and Anthropic endpoints"
```

---

### 任务 8：README 和最终构建

**文件：**
- 创建：`d:\codex-fox\README.md`
- 创建：`d:\codex-fox\.gitignore`

- [ ] **步骤 1：创建 README**

```markdown
# Protocol Proxy

将 OpenAI Chat Completions API 和 Anthropic Messages API 请求转换为 OpenAI Responses API 格式的代理服务器。

## 快速开始

```bash
# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 填入 OPENAI_API_KEY

# 开发模式
npm run dev

# 构建
npm run build

# 测试
npm test
```

## 端点

### OpenAI Chat Completions 兼容

```bash
POST http://localhost:3000/v1/chat/completions
Content-Type: application/json

{
  "model": "gpt-4o",
  "messages": [{"role": "user", "content": "Hello"}],
  "temperature": 0.7
}
```

### Anthropic Messages 兼容

```bash
POST http://localhost:3000/v1/messages
Content-Type: application/json
anthropic-version: 2023-06-01

{
  "model": "claude-3-5-sonnet-20241022",
  "messages": [{"role": "user", "content": "Hello"}],
  "max_tokens": 100
}
```

## 配置

| 环境变量 | 默认值 | 说明 |
|---------|--------|------|
| `OPENAI_API_KEY` | (必需) | OpenAI API 密钥 |
| `PORT` | `3000` | 代理监听端口 |
| `UPSTREAM_URL` | `https://api.openai.com/v1/responses` | Responses API 地址 |
```

- [ ] **步骤 2：创建 .gitignore**

```
node_modules/
dist/
.env
*.log
```

- [ ] **步骤 3：构建验证**

```bash
npm run build
```
预期：编译成功，无类型错误

- [ ] **步骤 4：运行全部测试**

```bash
npm test
```
预期：全部 PASS

- [ ] **步骤 5：最终 Commit**

```bash
git add README.md .gitignore
git commit -m "docs: add README and finalize project"
```

---

## 计划自检

### 规格覆盖度

| 规格需求 | 对应任务 |
|---------|---------|
| OpenAI Chat Completions 转换 | 任务 4 |
| Anthropic Messages 转换 | 任务 4 |
| Responses API 转发 | 任务 7 |
| 响应格式转换 | 任务 5 |
| SSE 流式转发 | 任务 6 |
| 错误处理 | 任务 7 |
| 环境变量配置 | 任务 3 |
| 类型定义 | 任务 2 |

### 占位符扫描

✅ 无待定项、TODO 或未完成章节

### 类型一致性

- `ResponsesAPIRequest.input` 在类型中定义为 `string | ResponsesInputItem[]`，转换器中正确使用
- `OpenAIChatCompletionResponse.choices[0].finish_reason` 在转换器和测试中一致为 `"stop"`
- `AnthropicMessageResponse.stop_reason` 一致为 `"end_turn"`

---

计划已完成。保存到 `d:\codex-fox\docs\superpowers\plans\2026-05-09-protocol-proxy-plan.md`。

两种执行方式：

**1. 子代理驱动（推荐）** — 每个任务调度新的子代理，任务间进行审查，快速迭代

**2. 内联执行** — 在当前会话中使用 executing-plans 执行任务，批量执行并设有检查点供审查

选哪种方式？
