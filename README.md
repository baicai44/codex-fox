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
