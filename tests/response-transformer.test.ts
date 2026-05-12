import { describe, it, expect } from "vitest";
import { transformToResponsesAPI } from "../src/transformers/response.js";

describe("transformToResponsesAPI", () => {
  it("converts ChatCompletions response to Responses API format", () => {
    const input = {
      id: "resp_abc123",
      object: "chat.completion",
      created: 1715000000,
      model: "deepseek-chat",
      choices: [
        {
          index: 0,
          message: { role: "assistant", content: "Hello there!" },
          finish_reason: "stop",
        },
      ],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 5,
        total_tokens: 15,
      },
    };

    const result = transformToResponsesAPI(input);

    expect(result.id).toBe("resp_abc123");
    expect(result.object).toBe("response");
    expect(result.created_at).toBe(1715000000);
    expect(result.status).toBe("completed");
    expect(result.output[0]).toEqual({
      id: "resp_abc123_msg",
      type: "message",
      role: "assistant",
      content: [{ type: "output_text", text: "Hello there!" }],
    });
    expect(result.usage).toEqual({
      input_tokens: 10,
      output_tokens: 5,
      total_tokens: 15,
    });
  });

  it("handles empty content", () => {
    const input = {
      id: "resp_empty",
      object: "chat.completion",
      created: 1715000000,
      model: "deepseek-chat",
      choices: [
        {
          index: 0,
          message: { role: "assistant", content: "" },
          finish_reason: "stop",
        },
      ],
    };

    const result = transformToResponsesAPI(input);

    expect(result.output[0].content[0].text).toBe("");
  });

  it("maps finish_reason length to incomplete status", () => {
    const input = {
      id: "resp_truncated",
      object: "chat.completion",
      created: 1715000000,
      model: "deepseek-chat",
      choices: [
        {
          index: 0,
          message: { role: "assistant", content: "Partial..." },
          finish_reason: "length",
        },
      ],
    };

    const result = transformToResponsesAPI(input);

    expect(result.status).toBe("incomplete");
  });
});
