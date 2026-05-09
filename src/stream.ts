import { Response } from "express";

export interface ParsedSSELine {
  event?: string;
  data?: unknown;
}

export function parseSSELine(line: string): ParsedSSELine {
  if (line.startsWith("event:")) {
    return { event: line.slice(6).trim() };
  }
  if (line.startsWith("data:")) {
    try {
      return { data: JSON.parse(line.slice(5).trim()) };
    } catch {
      return { data: line.slice(5).trim() };
    }
  }
  return {};
}

export function formatOpenAISSEEvent(
  eventType: string,
  payload: unknown
): string {
  if (eventType === "response.completed") {
    return `event: done\r\ndata: ${JSON.stringify({ choices: [{ finish_reason: "stop" }] })}\r\n\r\n`;
  }

  if (eventType === "response.output_text.delta" && payload) {
    const data = payload as { delta?: string };
    return `event: delta\r\ndata: ${JSON.stringify({ choices: [{ index: 0, delta: { content: data.delta } }] })}\r\n\r\n`;
  }

  return "";
}

export function formatAnthropicSSEEvent(
  eventType: string,
  payload: unknown
): string {
  if (eventType === "response.completed") {
    return `event: message_stop\r\ndata: ${JSON.stringify({ type: "message_stop" })}\r\n\r\n`;
  }

  if (eventType === "response.output_text.delta" && payload) {
    const data = payload as { delta?: string };
    return `event: content_block_delta\r\ndata: ${JSON.stringify({ type: "content_block_delta", index: 0, delta: { type: "text_delta", text: data.delta } })}\r\n\r\n`;
  }

  return "";
}

export interface UpstreamResponse {
  body: ReadableStream | null;
}

export async function streamSSE(
  res: Response,
  upstreamResponse: UpstreamResponse,
  formatEvent: (eventType: string, payload: unknown) => string
): Promise<void> {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  if (!upstreamResponse.body) {
    res.end();
    return;
  }

  const reader = upstreamResponse.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.trim() === "" || line.startsWith(":")) continue;
        const parsed = parseSSELine(line);
        if (parsed.event && parsed.data !== undefined) {
          const formatted = formatEvent(parsed.event, parsed.data);
          if (formatted) res.write(formatted);
        }
      }
    }
  } finally {
    res.end();
  }
}
