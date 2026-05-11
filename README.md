# 🦊 Codex-Fox

> DeepSeek API 协议中转代理 — 让 Codex Desktop 接入自建/第三方 DeepSeek 模型

## 是什么

Codex Desktop 使用 OpenAI Responses API 格式，而大部分 DeepSeek 兼容服务只提供 Chat Completions API。Codex-Fox 在中间做协议转换，让你可以在 Codex Desktop 中使用任何 DeepSeek 兼容模型。

```
Codex Desktop  ──(Responses API)──▶  Codex-Fox  ──(Chat Completions)──▶  DeepSeek 服务
         localhost:3000                    http://127.0.0.1:3000
```

## 快速开始

### 1. 下载

从 [Releases](../../releases) 下载 `Codex-Fox.exe`

### 2. 配置

打开 Codex-Fox.exe，在 **⚙️ 模型配置** 面板填写：

| 配置项 | 说明 | 示例 |
|--------|------|------|
| 上游地址 | DeepSeek 服务地址 | `http://10.248.37.105:3000/v1/chat/completions` |
| API Key | 上游 API 密钥 | `sk-xxxxxxxx` |
| 监听端口 | 本地代理端口 | `3000`（默认） |

点击 **💾 保存配置**，然后点击 **▶ 启动**。

### 3. 配置 Codex Desktop

编辑 Codex 配置文件 `C:\Users\<用户名>\.codex\config.toml`：

```toml
model = "gpt-5.2"
model_provider = "openai"
preferred_auth_method = "apikey"

[model_providers.openai]
name = "CodexFox"
base_url = "http://127.0.0.1:3000/v1"
api_key = "not-needed"
```

> **模型映射**：Codex-Fox 自动将 Codex 的模型名映射到 DeepSeek 模型：
> - `gpt-5.2` / `gpt-5.3-codex` / `gpt-5.4` → **DeepSeek V4 Pro**
> - `deepseek-chat` / `gpt-5.5` → **DeepSeek V3**（支持图片）

### 4. 启动

1. 先启动 **Codex-Fox.exe**，点击 ▶ 启动
2. 看到日志 `codex-fox listening on http://localhost:3000` 即成功
3. 再启动 Codex Desktop，正常使用即可

## 模型支持

| Codex 模型名 | 实际映射 | 支持图片 |
|-------------|---------|---------|
| `gpt-5.2` | DeepSeek V4 Pro | ❌ |
| `gpt-5.3-codex` | DeepSeek V4 Pro | ❌ |
| `gpt-5.4` | DeepSeek V4 Pro | ❌ |
| `gpt-5.5` | DeepSeek V3 | ✅ |
| `deepseek-chat` | DeepSeek V3 | ✅ |
| `deepseek-v4-pro` | DeepSeek V4 Pro | ❌ |

## 常见问题

### Q: Codex 提示 "model is not supported"
检查 Codex-Fox 是否正在运行，端口是否被占用（`netstat -ano | findstr 3000`）

### Q: 请求返回错误
查看 Codex-Fox 日志窗口，确认上游地址和 API Key 正确

### Q: 端口被占用
修改配置中的监听端口，同时更新 `config.toml` 中的 `base_url`

## 技术架构

- **协议转换**: OpenAI Responses API ↔ Chat Completions API
- **角色映射**: developer → system, function_call_output → tool
- **推理内容**: DeepSeek V4 Pro reasoning_content 完整传递
- **工具调用优化**: 自动注入停手指令防止 V4 Pro 无限循环
- **上下文截断**: 超过 10 轮工具调用自动保留最近 4 轮

---

Powered by Express + Electron | 仅供学习研究
