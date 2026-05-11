# 🦊 Codex-Fox

> 让 Codex Desktop 接入 DeepSeek 模型的协议中转代理

**一个 EXE 搞定，无需安装运行环境，无需手动编辑配置文件。**

---

## 快速开始

### 1. 下载

从 [Releases](../../releases) 下载 `Codex-Fox.exe`

### 2. 配置 & 启动

双击打开 `Codex-Fox.exe`，在 **⚙️ 模型配置** 面板填写：

| 配置项 | 说明 | 示例 |
|--------|------|------|
| 上游地址 | DeepSeek 兼容服务的 Chat Completions 地址 | `http://10.248.37.105:3000/v1/chat/completions` |
| API Key | 上游服务的 API Key | `sk-xxxxxxxx` |
| 监听端口 | 本地代理端口 | `3000` |

点击 **💾 保存配置**（自动生成配置文件，下次打开仍在），再点 **▶ 启动**。

### 3. 配置 Codex Desktop

编辑 `C:\Users\<你的用户名>\.codex\config.toml`：

```toml
model = "gpt-5.2"
model_provider = "openai"
preferred_auth_method = "apikey"

[model_providers.openai]
name = "CodexFox"
base_url = "http://127.0.0.1:3000/v1"
api_key = "not-needed"
```

### 4. 使用

1. 确保 Codex-Fox 显示 **运行中**
2. 启动 Codex Desktop，正常使用

---

## 模型映射

Codex-Fox 自动将 Codex 的模型名映射到 DeepSeek 模型：

| Codex 里选的模型 | 实际调用 | 支持图片 |
|:---|:---|:---:|
| `gpt-5.2` | DeepSeek V4 Pro | ❌ |
| `gpt-5.3-codex` | DeepSeek V4 Pro | ❌ |
| `gpt-5.4` | DeepSeek V4 Pro | ❌ |
| `gpt-5.5` | DeepSeek V3 | ✅ |
| `deepseek-chat` | DeepSeek V3 | ✅ |
| `deepseek-v4-pro` | DeepSeek V4 Pro | ❌ |

---

## 架构

```
Codex Desktop ──(Responses API)──▶  Codex-Fox (:3000)  ──(Chat Completions)──▶  DeepSeek 服务
```

- **协议转换**：OpenAI Responses API ↔ Chat Completions API
- **推理完整传递**：DeepSeek V4 Pro reasoning_content 保留不回退模式
- **工具调用防循环**：超过 6 轮自动注入停手指令，超过 10 轮截断上下文
- **配置持久化**：保存在 `%APPDATA%\Codex-Fox\`，重启不丢失

---

## 常见问题

**Q: Codex 提示 "model is not supported"**

Codex-Fox 没启动或端口被占用。检查 `netstat -ano | findstr 3000`

**Q: 启动报错 "UPSTREAM_URL is required"**

先填好配置点 **保存**，再点 **启动**。

**Q: 端口被占用**

在界面里改一个端口（比如 3001），保存后重启。同时把 `config.toml` 里的 `base_url` 也改成新端口。

**Q: 能不开黑窗口就启动吗**

Codex-Fox 就是不带黑窗口的 GUI 程序。

---

## 给开发者

```bash
npm install
npm run build          # 编译 TypeScript
npm run electron:dev   # 开发模式运行
npm run electron:build # 打包为 EXE
```

项目结构：

```
src/           # 代理核心 (TypeScript)
  index.ts     # Express 服务入口
  config.ts    # 配置加载
  types.ts     # 类型定义
  transformers/ # 协议转换
electron/      # GUI 壳 (Electron)
  main.cjs     # 主进程
  preload.cjs  # IPC 桥接
  index.html   # 界面
dist/          # 编译输出 (git ignored)
dist-app/      # 打包输出 (git ignored)
```

---

Powered by Express + Electron | 仅供学习研究
