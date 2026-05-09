import express, { Request, Response } from "express";
import { loadConfig } from "./config.js";
import {
  transformOpenAIRequest,
  transformAnthropicRequest,
} from "./transformers/request.js";
import { transformToResponsesAPI } from "./transformers/response.js";
import { OpenAIChatRequest, AnthropicMessageRequest } from "./types.js";

const config = loadConfig();
const app = express();

app.use(express.json({ limit: "10mb" }));

// ==================== OpenAI Chat Completions → DeepSeek → Responses API ====================

app.post("/v1/chat/completions", async (req: Request, res: Response) => {
  try {
    const chatRequest = req.body as OpenAIChatRequest;
    const deepseekRequest = transformOpenAIRequest(chatRequest);

    const upstreamResponse = await fetch(config.deepseekUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.deepseekApiKey}`,
      },
      body: JSON.stringify(deepseekRequest),
    });

    if (!upstreamResponse.ok) {
      const errorText = await upstreamResponse.text();
      console.error(`[openai] DeepSeek error ${upstreamResponse.status}:`, errorText);
      res.status(upstreamResponse.status).json({
        error: { message: errorText, type: "upstream_error" },
      });
      return;
    }

    const data = await upstreamResponse.json();
    const responsesResponse = transformToResponsesAPI(data);
    res.json(responsesResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(400).json({ error: { message, type: "transformation_error" } });
  }
});

// ==================== Anthropic Messages → DeepSeek → Responses API ====================

app.post("/v1/messages", async (req: Request, res: Response) => {
  try {
    const anthropicRequest = req.body as AnthropicMessageRequest;
    const targetModel = req.body.target_model || "deepseek-chat";
    const deepseekRequest = transformAnthropicRequest(anthropicRequest, targetModel);

    const upstreamResponse = await fetch(config.deepseekUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.deepseekApiKey}`,
      },
      body: JSON.stringify(deepseekRequest),
    });

    if (!upstreamResponse.ok) {
      const errorText = await upstreamResponse.text();
      console.error(`[anthropic] DeepSeek error ${upstreamResponse.status}:`, errorText);
      res.status(upstreamResponse.status).json({
        error: { message: errorText, type: "upstream_error" },
      });
      return;
    }

    const data = await upstreamResponse.json();
    const responsesResponse = transformToResponsesAPI(data);
    res.json(responsesResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(400).json({ error: { message, type: "transformation_error" } });
  }
});

// ==================== 启动 ====================

app.listen(config.port, () => {
  console.log(`Protocol translator listening on http://localhost:${config.port}`);
});

export default app;
