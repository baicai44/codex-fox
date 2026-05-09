import express, { Request, Response } from "express";
import { loadConfig } from "./config.js";
import {
  transformOpenAIRequest,
  transformAnthropicRequest,
} from "./transformers/request.js";
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
      res.set({
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      });

      const upstreamResponse = await fetch(config.upstreamUrl, {
        method: "POST",
        headers: { ...headers, Accept: "text/event-stream" },
        body: JSON.stringify({ ...responsesRequest, stream: true }),
      });

      if (!upstreamResponse.ok) {
        const errorText = await upstreamResponse.text();
        console.error(`[openai/stream] Upstream error ${upstreamResponse.status}:`, errorText);
        res.status(upstreamResponse.status).end();
        return;
      }

      const reader = upstreamResponse.body!.getReader();
      const decoder = new TextDecoder();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(decoder.decode(value, { stream: true }));
        }
      } finally {
        reader.releaseLock();
        res.end();
      }
    } else {
      const upstreamResponse = await fetch(config.upstreamUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(responsesRequest),
      });

      if (!upstreamResponse.ok) {
        const errorText = await upstreamResponse.text();
        console.error(`[openai] Upstream error ${upstreamResponse.status}:`, errorText);
        res.status(upstreamResponse.status).json({
          error: { message: errorText, type: "upstream_error" },
        });
        return;
      }

      const data = await upstreamResponse.json();
      res.json(data);
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
    const targetModel = "gpt-4o";

    const responsesRequest = transformAnthropicRequest(anthropicRequest, targetModel);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.openaiApiKey}`,
    };

    if (anthropicRequest.stream) {
      res.set({
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      });

      const upstreamResponse = await fetch(config.upstreamUrl, {
        method: "POST",
        headers: { ...headers, Accept: "text/event-stream" },
        body: JSON.stringify({ ...responsesRequest, stream: true }),
      });

      if (!upstreamResponse.ok) {
        const errorText = await upstreamResponse.text();
        console.error(`[anthropic/stream] Upstream error ${upstreamResponse.status}:`, errorText);
        res.status(upstreamResponse.status).end();
        return;
      }

      const reader = upstreamResponse.body!.getReader();
      const decoder = new TextDecoder();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(decoder.decode(value, { stream: true }));
        }
      } finally {
        reader.releaseLock();
        res.end();
      }
    } else {
      const upstreamResponse = await fetch(config.upstreamUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(responsesRequest),
      });

      if (!upstreamResponse.ok) {
        const errorText = await upstreamResponse.text();
        console.error(`[anthropic] Upstream error ${upstreamResponse.status}:`, errorText);
        res.status(upstreamResponse.status).json({
          error: { message: errorText, type: "upstream_error" },
        });
        return;
      }

      const data = await upstreamResponse.json();
      res.json(data);
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
