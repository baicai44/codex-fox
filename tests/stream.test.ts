import { describe, it, expect } from "vitest";
import {
  parseSSELine,
  formatOpenAISSEEvent,
  formatAnthropicSSEEvent,
} from "../src/stream.js";

describe("parseSSELine", () => {
  it("parses event lines", () => {
    const result = parseSSELine("event: response.output_text.delta");
    expect(result).toEqual({ event: "response.output_text.delta" });
  });

  it("parses data lines", () => {
    const result = parseSSELine('data: {"text": "hello"}');
    expect(result).toEqual({ data: { text: "hello" } });
  });

  it("returns empty for non-event/data lines", () => {
    const result = parseSSELine(":comment");
    expect(result).toEqual({});
  });

  it("parses data lines with non-JSON content", () => {
    const result = parseSSELine("data: [DONE]");
    expect(result).toEqual({ data: "[DONE]" });
  });

  it("parses event lines with different event types", () => {
    const result = parseSSELine("event: response.completed");
    expect(result).toEqual({ event: "response.completed" });
  });

  it("handles empty lines", () => {
    const result = parseSSELine("");
    expect(result).toEqual({});
  });
});

describe("formatOpenAISSEEvent", () => {
  it("formats delta events for OpenAI", () => {
    const result = formatOpenAISSEEvent("response.output_text.delta", {
      delta: "Hello",
    });
    expect(result).toContain("event: delta");
    expect(result).toContain("data:");
    expect(result).toContain("Hello");
  });

  it("formats done events for OpenAI", () => {
    const result = formatOpenAISSEEvent("response.completed", null);
    expect(result).toContain("event: done");
  });
});

describe("formatAnthropicSSEEvent", () => {
  it("formats content_block_delta events for Anthropic", () => {
    const result = formatAnthropicSSEEvent("response.output_text.delta", {
      delta: "Hi",
    });
    expect(result).toContain("event: content_block_delta");
    expect(result).toContain("text_delta");
    expect(result).toContain("Hi");
  });
});
