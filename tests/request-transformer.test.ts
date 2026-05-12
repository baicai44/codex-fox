import { describe, it, expect } from "vitest";
import {
  transformOpenAIRequest,
  transformAnthropicRequest,
} from "../src/transformers/request.js";

describe("transformOpenAIRequest", () => {
  it("passes through OpenAI request unchanged", () => {
    const input = {
      model: "deepseek-chat",
      messages: [
        { role: "system", content: "You are helpful" },
        { role: "user", content: "Hello" },
      ],
      temperature: 0.7,
      max_tokens: 100,
    };

    const result = transformOpenAIRequest(input);

    expect(result.model).toBe("deepseek-chat");
    expect(result.messages).toEqual([
      { role: "system", content: "You are helpful" },
      { role: "user", content: "Hello" },
    ]);
    expect(result.temperature).toBe(0.7);
    expect(result.max_tokens).toBe(100);
  });

  it("preserves tools format", () => {
    const tools = [
      {
        type: "function",
        function: {
          name: "get_weather",
          description: "Get weather",
          parameters: { type: "object", properties: {} },
        },
      },
    ];

    const input = {
      model: "deepseek-chat",
      messages: [{ role: "user", content: "Weather?" }],
      tools,
    };

    const result = transformOpenAIRequest(input);

    expect(result.tools).toEqual(tools);
  });
});

describe("transformAnthropicRequest", () => {
  it("converts basic anthropic request to Chat Completions format", () => {
    const input = {
      model: "claude-3-5-sonnet-20241022",
      messages: [{ role: "user", content: "Hello" }],
      max_tokens: 100,
    };

    const result = transformAnthropicRequest(input, "deepseek-chat");

    expect(result.model).toBe("deepseek-chat");
    expect(result.messages).toEqual([{ role: "user", content: "Hello" }]);
    expect(result.max_tokens).toBe(100);
  });

  it("moves system string to first message", () => {
    const input = {
      model: "claude-3-5-sonnet-20241022",
      messages: [{ role: "user", content: "Hi" }],
      system: "You are a coder",
      max_tokens: 100,
    };

    const result = transformAnthropicRequest(input, "deepseek-chat");

    expect(result.messages[0]).toEqual({
      role: "system",
      content: "You are a coder",
    });
    expect(result.messages[1]).toEqual({
      role: "user",
      content: "Hi",
    });
  });

  it("converts anthropic tools to chat completions tools", () => {
    const tools = [
      {
        name: "get_weather",
        description: "Get weather",
        input_schema: { type: "object", properties: {} },
      },
    ];

    const input = {
      model: "claude-3-5-sonnet-20241022",
      messages: [{ role: "user", content: "Weather?" }],
      tools,
      max_tokens: 100,
    };

    const result = transformAnthropicRequest(input, "deepseek-chat");

    expect(result.tools).toEqual([
      {
        type: "function",
        function: {
          name: "get_weather",
          description: "Get weather",
          parameters: { type: "object", properties: {} },
        },
      },
    ]);
  });

  it("maps stop_sequences to stop", () => {
    const input = {
      model: "claude-3-5-sonnet-20241022",
      messages: [{ role: "user", content: "Hi" }],
      max_tokens: 100,
      stop_sequences: ["\n\n", "STOP"],
    };

    const result = transformAnthropicRequest(input, "deepseek-chat");

    expect(result.stop).toEqual(["\n\n", "STOP"]);
  });
});
