import express, { Request, Response } from "express";
import {
  transformOpenAIRequest,
  transformAnthropicRequest,
} from "./transformers/request.js";
import { OpenAIChatRequest, AnthropicMessageRequest } from "./types.js";

const app = express();

app.use(express.json({ limit: "10mb" }));

// ==================== OpenAI Chat Completions → Responses API ====================

app.post("/v1/chat/completions", async (req: Request, res: Response) => {
  try {
    const chatRequest = req.body as OpenAIChatRequest;
    const responsesRequest = transformOpenAIRequest(chatRequest);
    res.json(responsesRequest);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(400).json({ error: { message, type: "transformation_error" } });
  }
});

// ==================== Anthropic Messages → Responses API ====================

app.post("/v1/messages", async (req: Request, res: Response) => {
  try {
    const anthropicRequest = req.body as AnthropicMessageRequest;
    const targetModel = req.body.target_model || "gpt-4o";
    const responsesRequest = transformAnthropicRequest(anthropicRequest, targetModel);
    res.json(responsesRequest);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(400).json({ error: { message, type: "transformation_error" } });
  }
});

// ==================== 启动 ====================

const port = parseInt(process.env.PORT || "3000", 10);

app.listen(port, () => {
  console.log(`Protocol translator listening on http://localhost:${port}`);
});

export default app;
