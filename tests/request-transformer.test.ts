import { describe, it, expect } from "vitest";
import {
  transformOpenAIRequest,
  transformAnthropicRequest,
} from "../src/transformers/request.js";

describe("transformOpenAIRequest", () => {
  it("converts basic chat request to Responses API format", () => {
    const input = {
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are helpful" },
        { role: "user", content: "Hello" },
      ],
      temperature: 0.7,
      max_tokens: 100,
    };

    const result = transformOpenAIRequest(input);

    expect(result.model).toBe("gpt-4o");
    expect(result.input).toEqual([
      { role: "system", content: "You are helpful" },
      { role: "user", content: "Hello" },
    ]);
    expect(result.temperature).toBe(0.7);
    expect(result.max_output_tokens).toBe(100);
  });

  it("converts max_tokens to max_output_tokens", () => {
    const input = {
      model: "gpt-4o",
      messages: [{ role: "user", content: "Hi" }],
      max_tokens: 50,
    };

    const result = transformOpenAIRequest(input);

    expect(result.max_output_tokens).toBe(50);
    expect(result).not.toHaveProperty("max_tokens");
  });

  it("passes tools through unchanged", () => {
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
      model: "gpt-4o",
      messages: [{ role: "user", content: "Weather?" }],
      tools,
    };

    const result = transformOpenAIRequest(input);

    expect(result.tools).toEqual([
      {
        type: "function",
        name: "get_weather",
        description: "Get weather",
        parameters: { type: "object", properties: {} },
      },
    ]);
  });

  it("converts image_url content parts correctly", () => {
    const input = {
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text" as const, text: "What is this?" },
            {
              type: "image_url" as const,
              image_url: { url: "https://example.com/img.png", detail: "high" },
            },
          ],
        },
      ],
    };

    const result = transformOpenAIRequest(input);

    expect(result.input).toEqual([
      {
        role: "user",
        content: [
          { type: "input_text", text: "What is this?" },
          {
            type: "input_image",
            image_url: "https://example.com/img.png",
            image_detail: "high",
          },
        ],
      },
    ]);
  });

  it("filters out tool role messages", () => {
    const input = {
      model: "gpt-4o",
      messages: [
        { role: "user", content: "Hello" },
        { role: "tool", content: "result", tool_call_id: "abc" },
      ],
    };

    const result = transformOpenAIRequest(input);

    expect(result.input).toHaveLength(1);
    expect(result.input[0]).toEqual({ role: "user", content: "Hello" });
  });
});

describe("transformAnthropicRequest", () => {
  it("converts basic anthropic request to Responses API format", () => {
    const input = {
      model: "claude-3-5-sonnet-20241022",
      messages: [{ role: "user", content: "Hello" }],
      max_tokens: 100,
    };

    const result = transformAnthropicRequest(input, "gpt-4o");

    expect(result.model).toBe("gpt-4o");
    expect(result.input).toEqual([{ role: "user", content: "Hello" }]);
    expect(result.max_output_tokens).toBe(100);
  });

  it("moves system string to first input item", () => {
    const input = {
      model: "claude-3-5-sonnet-20241022",
      messages: [{ role: "user", content: "Hi" }],
      system: "You are a coder",
      max_tokens: 100,
    };

    const result = transformAnthropicRequest(input, "gpt-4o");

    expect((result.input as any[])[0]).toEqual({
      role: "system",
      content: "You are a coder",
    });
    expect((result.input as any[])[1]).toEqual({
      role: "user",
      content: "Hi",
    });
  });

  it("converts anthropic tools to responses API tools", () => {
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

    const result = transformAnthropicRequest(input, "gpt-4o");

    expect(result.tools).toEqual([
      {
        type: "function",
        name: "get_weather",
        description: "Get weather",
        parameters: { type: "object", properties: {} },
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

    const result = transformAnthropicRequest(input, "gpt-4o");

    expect(result.stop).toEqual(["\n\n", "STOP"]);
  });
});
