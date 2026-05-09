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
import { OpenAIChatRequest, AnthropicMessageRequest, UpstreamResponse } from "./types.js";

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

      await streamSSE(res, upstreamResponse as unknown as UpstreamResponse, formatOpenAISSEEvent);
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

      await streamSSE(res, upstreamResponse as unknown as UpstreamResponse, formatAnthropicSSEEvent);
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
