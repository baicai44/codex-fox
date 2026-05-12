import express, { Request, Response } from "express";
import { loadConfig } from "./config.js";
import {
  transformOpenAIRequest,
  transformAnthropicRequest,
  transformResponsesToChatCompletions,
} from "./transformers/request.js";
import { transformToResponsesAPI, sendAsSSE } from "./transformers/response.js";
import { OpenAIChatRequest, AnthropicMessageRequest, ResponsesAPIRequest } from "./types.js";

const config = loadConfig();
const app = express();

app.use(express.json({ limit: "10mb" }));

// ==================== 请求日志 ====================

app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ==================== Models 端点 ====================

const codexModels = [
  {
    slug: "deepseek-chat",
    display_name: "DeepSeek V3 (supports images)",
    description: "DeepSeek V3 via proxy, supports images",
    default_reasoning_level: "medium",
    supported_reasoning_levels: [{ effort: "medium", description: "Balanced" }],
    shell_type: "shell_command",
    visibility: "list",
    supported_in_api: true,
    priority: 20,
    additional_speed_tiers: [],
    service_tiers: [],
    availability_nux: null,
    upgrade: null,
    base_instructions: "You are Codex powered by DeepSeek V3.",
    model_messages: {
      instructions_template: "You are Codex powered by DeepSeek V3.",
      instructions_variables: { personality_default: "", personality_friendly: "", personality_pragmatic: "" },
    },
    supports_reasoning_summaries: true,
    default_reasoning_summary: "none",
    support_verbosity: true,
    default_verbosity: "low",
    apply_patch_tool_type: "freeform",
    web_search_tool_type: "text_and_image",
    truncation_policy: { mode: "tokens", limit: 10000 },
    supports_parallel_tool_calls: true,
    supports_image_detail_original: true,
    context_window: 131072,
    max_context_window: 131072,
    effective_context_window_percent: 95,
    experimental_supported_tools: [],
    input_modalities: ["text", "image"],
    supports_search_tool: true,
  },
  {
    slug: "deepseek-v4-pro",
    display_name: "DeepSeek V4 Pro",
    description: "DeepSeek V4 Pro via proxy",
    default_reasoning_level: "medium",
    supported_reasoning_levels: [
      { effort: "medium", description: "Balanced" },
      { effort: "high", description: "Greater reasoning depth" },
    ],
    shell_type: "shell_command",
    visibility: "list",
    supported_in_api: true,
    priority: 22,
    additional_speed_tiers: [],
    service_tiers: [],
    availability_nux: null,
    upgrade: null,
    base_instructions: "You are Codex powered by DeepSeek V4 Pro.",
    model_messages: {
      instructions_template: "You are Codex powered by DeepSeek V4 Pro.",
      instructions_variables: { personality_default: "", personality_friendly: "", personality_pragmatic: "" },
    },
    supports_reasoning_summaries: true,
    default_reasoning_summary: "none",
    support_verbosity: true,
    default_verbosity: "low",
    apply_patch_tool_type: "freeform",
    web_search_tool_type: "text",
    truncation_policy: { mode: "tokens", limit: 10000 },
    supports_parallel_tool_calls: true,
    supports_image_detail_original: false,
    context_window: 131072,
    max_context_window: 131072,
    effective_context_window_percent: 95,
    experimental_supported_tools: [],
    input_modalities: ["text"],
    supports_search_tool: true,
  },
  {
    slug: "gpt-5.5",
    display_name: "DeepSeek V3 (legacy slug)",
    description: "DeepSeek V3 via proxy, supports images",
    default_reasoning_level: "medium",
    supported_reasoning_levels: [{ effort: "medium", description: "Balanced" }],
    shell_type: "shell_command",
    visibility: "list",
    supported_in_api: true,
    priority: 20,
    additional_speed_tiers: [],
    service_tiers: [],
    availability_nux: null,
    upgrade: null,
    base_instructions: "You are Codex powered by DeepSeek V3.",
    model_messages: {
      instructions_template: "You are Codex powered by DeepSeek V3.",
      instructions_variables: { personality_default: "", personality_friendly: "", personality_pragmatic: "" },
    },
    supports_reasoning_summaries: true,
    default_reasoning_summary: "none",
    support_verbosity: true,
    default_verbosity: "low",
    apply_patch_tool_type: "freeform",
    web_search_tool_type: "text_and_image",
    truncation_policy: { mode: "tokens", limit: 10000 },
    supports_parallel_tool_calls: true,
    supports_image_detail_original: true,
    context_window: 131072,
    max_context_window: 131072,
    effective_context_window_percent: 95,
    experimental_supported_tools: [],
    input_modalities: ["text", "image"],
    supports_search_tool: true,
  },
  {
    slug: "gpt-5.3-codex",
    display_name: "DeepSeek V4 Pro",
    description: "DeepSeek V4 Pro via proxy",
    default_reasoning_level: "medium",
    supported_reasoning_levels: [
      { effort: "medium", description: "Balanced" },
      { effort: "high", description: "Greater reasoning depth" },
    ],
    shell_type: "shell_command",
    visibility: "list",
    supported_in_api: true,
    priority: 22,
    additional_speed_tiers: [],
    service_tiers: [],
    availability_nux: null,
    upgrade: null,
    base_instructions: "You are Codex powered by DeepSeek V4 Pro.",
    model_messages: {
      instructions_template: "You are Codex powered by DeepSeek V4 Pro.",
      instructions_variables: { personality_default: "", personality_friendly: "", personality_pragmatic: "" },
    },
    supports_reasoning_summaries: true,
    default_reasoning_summary: "none",
    support_verbosity: true,
    default_verbosity: "low",
    apply_patch_tool_type: "freeform",
    web_search_tool_type: "text",
    truncation_policy: { mode: "tokens", limit: 10000 },
    supports_parallel_tool_calls: true,
    supports_image_detail_original: false,
    context_window: 131072,
    max_context_window: 131072,
    effective_context_window_percent: 95,
    experimental_supported_tools: [],
    input_modalities: ["text"],
    supports_search_tool: true,
  },
  {
    slug: "gpt-5.2",
    display_name: "DeepSeek V4 Pro",
    description: "DeepSeek V4 Pro via proxy",
    default_reasoning_level: "medium",
    supported_reasoning_levels: [
      { effort: "medium", description: "Balanced" },
      { effort: "high", description: "Greater reasoning depth" },
    ],
    shell_type: "shell_command",
    visibility: "list",
    supported_in_api: true,
    priority: 22,
    additional_speed_tiers: [],
    service_tiers: [],
    availability_nux: null,
    upgrade: null,
    base_instructions: "You are Codex powered by DeepSeek V4 Pro.",
    model_messages: {
      instructions_template: "You are Codex powered by DeepSeek V4 Pro.",
      instructions_variables: { personality_default: "", personality_friendly: "", personality_pragmatic: "" },
    },
    supports_reasoning_summaries: true,
    default_reasoning_summary: "none",
    support_verbosity: true,
    default_verbosity: "low",
    apply_patch_tool_type: "freeform",
    web_search_tool_type: "text",
    truncation_policy: { mode: "tokens", limit: 10000 },
    supports_parallel_tool_calls: true,
    supports_image_detail_original: false,
    context_window: 131072,
    max_context_window: 131072,
    effective_context_window_percent: 95,
    experimental_supported_tools: [],
    input_modalities: ["text"],
    supports_search_tool: true,
  },
];

const modelMap: Record<string, string> = {
  "deepseek-chat": "deepseek-chat",
  "deepseek-v4-pro": "deepseek-v4-pro",
  "gpt-5.5": "deepseek-v4-pro",
  "gpt-5.4": "deepseek-v4-pro",
  "gpt-5.4-mini": "deepseek-v4-pro",
  "gpt-5.3-codex": "deepseek-v4-pro",
  "gpt-5.2": "deepseek-v4-pro",
  "gpt-5.1": "deepseek-v4-pro",
  "gpt-5": "deepseek-v4-pro",
};

app.get("/v1/models", (_req: Request, res: Response) => {
  res.json({ object: "list", data: codexModels });
});

app.get("/models", (_req: Request, res: Response) => {
  res.json({ object: "list", data: codexModels });
});

// ==================== 模型详情端点（Codex 单个模型验证拦截） ====================

app.get("/v1/models/:model", (req: Request, res: Response) => {
  const { model } = req.params;
  console.log(`[models] detail requested for: ${model}`);

  // 只要 Codex 来查某个模型，一律返回合法模型信息（阻止 "not supported" 报错）
  const found = codexModels.find((m) => m.slug === model);
  if (found) return res.json(found);

  // 未知模型也返回合法结构，不让 Codex 拒绝
  res.json({
    slug: model,
    display_name: model,
    description: `Custom model: ${model}`,
    default_reasoning_level: "medium",
    supported_reasoning_levels: [{ effort: "medium", description: "Balanced" }],
    shell_type: "shell_command",
    visibility: "list",
    supported_in_api: true,
    priority: 20,
    additional_speed_tiers: [],
    service_tiers: [],
    availability_nux: null,
    upgrade: null,
    base_instructions: `You are Codex powered by ${model}.`,
    model_messages: {
      instructions_template: `You are Codex powered by ${model}.`,
      instructions_variables: {
        personality_default: "",
        personality_friendly: "",
        personality_pragmatic: "",
      },
    },
    supports_reasoning_summaries: true,
    default_reasoning_summary: "none",
    support_verbosity: true,
    default_verbosity: "low",
    apply_patch_tool_type: "freeform",
    web_search_tool_type: "text",
    truncation_policy: { mode: "tokens", limit: 10000 },
    supports_parallel_tool_calls: true,
    supports_image_detail_original: false,
    context_window: 131072,
    max_context_window: 131072,
    effective_context_window_percent: 95,
    experimental_supported_tools: [],
    input_modalities: ["text"],
    supports_search_tool: true,
  });
});

// ==================== 通用转发函数 ====================

async function forwardToUpstream(body: any) {
  console.log(`[upstream] forwarding model=${body.model}`);
  const resp = await fetch(config.upstreamUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(config.upstreamApiKey ? { Authorization: `Bearer ${config.upstreamApiKey}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const errorText = await resp.text();
    console.error(`[upstream] ERROR ${resp.status}: ${errorText.slice(0, 200)}`);
    return { error: true, status: resp.status, text: errorText };
  }
  const data = await resp.json();
  console.log(`[upstream] OK, ${JSON.stringify(data.usage || data.choices?.[0]?.finish_reason)}`);
  return { error: false, data };
}

// ==================== OpenAI Chat Completions → Upstream → Responses API ====================

app.post("/v1/chat/completions", async (req: Request, res: Response) => {
  try {
    const chatRequest = req.body as OpenAIChatRequest;
    const originalModel = chatRequest.model;
    chatRequest.model = modelMap[chatRequest.model] || "deepseek-v4-pro";
    const upstreamRequest = transformOpenAIRequest(chatRequest);
    const result = await forwardToUpstream(upstreamRequest);
    if (result.error) {
      res.status(result.status!).json({ error: { message: result.text, type: "upstream_error" } });
      return;
    }
    const responsesResponse = transformToResponsesAPI(result.data!, originalModel);
    if (chatRequest.stream) {
      sendAsSSE(res, responsesResponse);
    } else {
      res.json(responsesResponse);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(400).json({ error: { message, type: "transformation_error" } });
  }
});

// ==================== Responses API → Chat Completions → Upstream → Responses API ====================

app.post("/v1/responses", async (req: Request, res: Response) => {
  try {
    const responsesRequest = req.body as ResponsesAPIRequest;
    const originalModel = responsesRequest.model;
    const targetModel = modelMap[responsesRequest.model] || "deepseek-v4-pro";
    const chatRequest = transformResponsesToChatCompletions(responsesRequest, targetModel);
    const result = await forwardToUpstream(chatRequest);
    if (result.error) {
      res.status(result.status!).json({ error: { message: result.text, type: "upstream_error" } });
      return;
    }
    const responsesResponse = transformToResponsesAPI(result.data!, originalModel);
    if (responsesRequest.stream) {
      sendAsSSE(res, responsesResponse);
    } else {
      res.json(responsesResponse);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(400).json({ error: { message, type: "transformation_error" } });
  }
});

// ==================== Anthropic Messages → Upstream → Responses API ====================

app.post("/v1/messages", async (req: Request, res: Response) => {
  try {
    const anthropicRequest = req.body as AnthropicMessageRequest;
    const targetModel = modelMap[req.body.target_model] || req.body.target_model || "deepseek-chat";
    const upstreamRequest = transformAnthropicRequest(anthropicRequest, targetModel);
    const result = await forwardToUpstream(upstreamRequest);
    if (result.error) {
      res.status(result.status!).json({ error: { message: result.text, type: "upstream_error" } });
      return;
    }
    const responsesResponse = transformToResponsesAPI(result.data!);
    if (anthropicRequest.stream) {
      sendAsSSE(res, responsesResponse);
    } else {
      res.json(responsesResponse);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(400).json({ error: { message, type: "transformation_error" } });
  }
});

// ==================== 兜底 404 ====================

app.all("/{*path}", (req: Request, res: Response) => {
  console.log(`[404] ${req.method} ${req.path}`);
  res.status(404).json({
    error: { message: `Unknown endpoint: ${req.method} ${req.path}`, type: "proxy_unknown" },
  });
});

// ==================== 启动 ====================

import type { Server } from "http";

export function startServer(port?: number): Promise<Server> {
  const p = port ?? config.port;
  return new Promise((resolve) => {
    const server = app.listen(p, () => {
      console.log(`codex-fox listening on http://localhost:${p}`);
      console.log(`Upstream: ${config.upstreamUrl}`);
      console.log(`Models: gpt-5.5→deepseek-chat(V3), gpt-5.2→deepseek-v4-pro`);
      resolve(server);
    });
  });
}

export default app;
