# 协议转换代理设计文档

**日期:** 2026-05-09  
**状态:** 已批准

## 目标

构建一个 Node.js HTTP 代理，将 OpenAI Chat Completions API 和 Anthropic Messages API 格式的请求转换为 OpenAI Responses API 格式，实现协议统一。

## 架构

```
客户端 → Express 代理 → OpenAI Responses API
  ├─ /v1/chat/completions → 转换 → /v1/responses
  └─ /v1/messages (Anthropic) → 转换 → /v1/responses
```

## 核心组件

### 1. 请求转换器 (`src/transformers/request.ts`)

#### OpenAI Chat Completions → Responses API

| 入站字段 | Responses API 映射 |
|---------|-------------------|
| `model` | `model` |
| `messages` | `input` (保持数组结构) |
| `tools` | `tools` |
| `temperature` | `temperature` |
| `max_tokens` | `max_output_tokens` |
| `stream` | `stream` |
| `top_p` | `top_p` |
| `frequency_penalty` | `frequency_penalty` |
| `presence_penalty` | `presence_penalty` |
| `stop` | `stop` |

#### Anthropic Messages → Responses API

| 入站字段 | Responses API 映射 |
|---------|-------------------|
| `model` | `model` (需转换为 OpenAI 模型名) |
| `messages` | `input` (追加到消息数组) |
| `system` | `input` 首部插入 `{ role: "system", content: system }` |
| `max_tokens` | `max_output_tokens` |
| `temperature` | `temperature` |
| `tools` | `tools` (需转换工具格式) |
| `stream` | `stream` |

Anthropic 工具格式转换：
```
{ name, description, input_schema } → { type: "function", function: { name, description, parameters: input_schema } }
```

### 2. 响应转换器 (`src/transformers/response.ts`)

#### Responses API → OpenAI Chat Completions 格式

```json
{
  "id": "resp_xxx",
  "object": "chat.completion",
  "created": <timestamp>,
  "model": "gpt-4o",
  "choices": [{
    "index": 0,
    "message": { "role": "assistant", "content": "..." },
    "finish_reason": "stop"
  }],
  "usage": { "prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0 }
}
```

#### Responses API → Anthropic 格式

```json
{
  "id": "msg_xxx",
  "type": "message",
  "role": "assistant",
  "content": [{ "type": "text", "text": "..." }],
  "model": "claude-3-5-sonnet-20241022",
  "stop_reason": "end_turn",
  "usage": { "input_tokens": 0, "output_tokens": 0 }
}
```

### 3. 流式转发器 (`src/stream.ts`)

- 解析 Responses API 的 SSE 事件 (`event: response.output_text.delta`)
- 转换为 OpenAI SSE 格式 (`event: delta`, `data: { choices: [{ delta: { content: "..." } }] }`)
- 转换为 Anthropic SSE 格式 (`event: content_block_delta`, `data: { delta: { type: "text_delta", text: "..." } }`)

### 4. 类型定义 (`src/types.ts`)

- `ResponsesAPIRequest` — Responses API 请求结构
- `OpenAIChatRequest` — OpenAI Chat Completions 请求结构
- `AnthropicMessageRequest` — Anthropic Messages 请求结构
- 对应的响应类型定义

## 错误处理

| 场景 | HTTP 状态码 | 行为 |
|------|-----------|------|
| 认证失败 | 401 | 透传 OpenAI 错误 |
| 限流 | 429 | 透传 + `retry-after` 头 |
| 转换失败 | 400 | `{"error": {"message": "转换失败: <详情>"}}` |
| 上游错误 | 502 | `{"error": {"message": "上游服务错误: <摘要>"}}` |
| 网络超时 | 504 | `{"error": {"message": "上游服务超时"}}` |

## 配置

环境变量：

```
OPENAI_API_KEY=sk-...
PORT=3000
UPSTREAM_URL=https://api.openai.com/v1/responses
```

## 项目结构

```
d:\codex-fox\
├── src/
│   ├── index.ts              # Express 入口 + 路由
│   ├── transformers/
│   │   ├── request.ts        # 请求转换逻辑
│   │   └── response.ts       # 响应转换逻辑
│   ├── stream.ts             # SSE 流处理
│   └── types.ts              # 类型定义
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## 数据流

```
请求进入 → 识别协议来源 → 验证请求 → 转换为 Responses 格式
  → 转发到 OpenAI → 接收响应 → 转换响应格式 → 返回客户端
```

流式请求走独立路径，通过 SSE 逐条转发事件。
