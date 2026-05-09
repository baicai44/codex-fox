import { describe, it, expect } from "vitest";
import {
  transformToOpenAIResponse,
  transformToAnthropicResponse,
} from "../src/transformers/response.js";

describe("transformToOpenAIResponse", () => {
  it("converts responses API response to OpenAI chat completion format", () => {
    const input = {
      id: "resp_abc123",
      object: "response",
      created_at: 1715000000,
      status: "completed",
      output: [
        {
          type: "message",
          role: "assistant",
          content: [{ type: "output_text", text: "Hello there!" }],
        },
      ],
      usage: {
        input_tokens: 10,
        output_tokens: 5,
        total_tokens: 15,
      },
    };

    const result = transformToOpenAIResponse(input, "gpt-4o");

    expect(result.id).toBe("resp_abc123");
    expect(result.object).toBe("chat.completion");
    expect(result.model).toBe("gpt-4o");
    expect(result.choices[0].message).toEqual({
      role: "assistant",
      content: "Hello there!",
    });
    expect(result.choices[0].finish_reason).toBe("stop");
    expect(result.usage).toEqual({
      prompt_tokens: 10,
      completion_tokens: 5,
      total_tokens: 15,
    });
  });
});

describe("transformToAnthropicResponse", () => {
  it("converts responses API response to Anthropic message format", () => {
    const input = {
      id: "resp_xyz789",
      object: "response",
      created_at: 1715000000,
      status: "completed",
      output: [
        {
          type: "message",
          role: "assistant",
          content: [{ type: "output_text", text: "Hi!" }],
        },
      ],
      usage: {
        input_tokens: 8,
        output_tokens: 3,
        total_tokens: 11,
      },
    };

    const result = transformToAnthropicResponse(input, "claude-3-5-sonnet-20241022");

    expect(result.id).toBe("resp_xyz789");
    expect(result.type).toBe("message");
    expect(result.role).toBe("assistant");
    expect(result.content).toEqual([{ type: "text", text: "Hi!" }]);
    expect(result.model).toBe("claude-3-5-sonnet-20241022");
    expect(result.stop_reason).toBe("end_turn");
    expect(result.usage).toEqual({
      input_tokens: 8,
      output_tokens: 3,
    });
  });
});
