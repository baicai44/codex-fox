import {
  ChatCompletionsResponse,
  ResponsesAPIResponse,
} from "../types.js";
import { Response } from "express";

export function transformToResponsesAPI(
  response: ChatCompletionsResponse,
  displayModel?: string
): ResponsesAPIResponse {
  const choice = response.choices[0];
  const message = choice?.message;
  const finishReason = choice?.finish_reason || "stop";

  const output: ResponsesAPIResponse["output"] = [];

  const hasToolCalls = message?.tool_calls && message.tool_calls.length > 0;

  // Handle tool calls (function calls)
  if (hasToolCalls) {
    for (const tc of message.tool_calls!) {
      output.push({
        type: "function_call",
        id: tc.id,
        call_id: tc.id,
        name: tc.function.name,
        arguments: tc.function.arguments,
      } as ResponsesAPIResponse["output"][number]);
    }
  }

  // Handle regular text — 有 tool call 时不发 text（避免顺序错乱导致循环）
  if (!hasToolCalls && (message?.content != null || message?.reasoning_content)) {
    const contentParts: Array<{ type: "output_text" | "reasoning_text"; text: string }> = [];
    if (message?.reasoning_content) {
      contentParts.push({ type: "reasoning_text", text: message.reasoning_content });
    }
    if (message?.content) {
      contentParts.push({ type: "output_text", text: message.content });
    }
    output.push({
      type: "message",
      id: response.id + "_msg",
      role: message?.role || "assistant",
      content: contentParts.length > 0 ? contentParts : [{ type: "output_text", text: "" }],
    } as ResponsesAPIResponse["output"][number]);
  }

  return {
    id: response.id,
    object: "response",
    created_at: response.created,
    model: displayModel || response.model,
    status:
      finishReason === "stop" ? "completed"
        : finishReason === "length" ? "incomplete"
        : "completed",
    output,
    usage: response.usage
      ? {
          input_tokens: response.usage.prompt_tokens,
          output_tokens: response.usage.completion_tokens,
          total_tokens: response.usage.total_tokens,
        }
      : undefined,
  };
}

/**
 * 将非流式 Responses API 响应包装为 SSE 流，兼容 Codex 的 stream 模式
 */
export function sendAsSSE(res: Response, data: ResponsesAPIResponse) {
  res.status(200);
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");

  const w = (event: string, payload: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
  };

  w("response.created", { type: "response.created", response: { ...data, output: [], status: "in_progress" } });
  w("response.in_progress", { type: "response.in_progress", response: { ...data, output: [], status: "in_progress" } });

  const items = data.output || [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const itemId = item.id || `${data.id}_item_${i}`;

    if (item.type === "function_call") {
      w("response.output_item.added", { type: "response.output_item.added", output_index: i, item: { id: itemId, type: "function_call", call_id: (item as any).call_id, name: (item as any).name, arguments: "", status: "in_progress" } });
      w("response.function_call_arguments.delta", { type: "response.function_call_arguments.delta", item_id: itemId, output_index: i, delta: (item as any).arguments });
      w("response.function_call_arguments.done", { type: "response.function_call_arguments.done", item_id: itemId, output_index: i, arguments: (item as any).arguments });
      w("response.output_item.done", { type: "response.output_item.done", output_index: i, item: { id: itemId, type: "function_call", call_id: (item as any).call_id, name: (item as any).name, arguments: (item as any).arguments, status: "completed" } });
    } else if (item.type === "message") {
      w("response.output_item.added", { type: "response.output_item.added", output_index: i, item: { id: itemId, type: "message", role: item.role, status: "in_progress", content: [] } });

      for (let ci = 0; ci < ((item as any).content?.length || 0); ci++) {
        const part = (item as any).content[ci];
        const text = part.text || "";
        w("response.content_part.added", { type: "response.content_part.added", item_id: itemId, output_index: i, content_index: ci, part: { type: part.type, text: "" } });

        if (part.type === "output_text") {
          w("response.output_text.delta", { type: "response.output_text.delta", item_id: itemId, output_index: i, content_index: ci, delta: text });
          w("response.output_text.done", { type: "response.output_text.done", item_id: itemId, output_index: i, content_index: ci, text });
        } else if (part.type === "reasoning_text") {
          w("response.reasoning_text.delta", { type: "response.reasoning_text.delta", item_id: itemId, output_index: i, content_index: ci, delta: text });
          w("response.reasoning_text.done", { type: "response.reasoning_text.done", item_id: itemId, output_index: i, content_index: ci, text });
        }

        w("response.content_part.done", { type: "response.content_part.done", item_id: itemId, output_index: i, content_index: ci, part: { type: part.type, text } });
      }

      w("response.output_item.done", { type: "response.output_item.done", output_index: i, item: { id: itemId, type: "message", role: item.role, status: "completed", content: (item as any).content } });
    }
  }

  w("response.completed", { type: "response.completed", response: data });
  res.end();
}
