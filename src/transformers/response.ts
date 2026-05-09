import {
  ResponsesAPIResponse,
  OpenAIChatCompletionResponse,
  AnthropicMessageResponse,
} from "../types.js";

export function transformToOpenAIResponse(
  response: ResponsesAPIResponse,
  model: string
): OpenAIChatCompletionResponse {
  const textContent =
    response.output[0]?.content
      ?.filter((c) => c.type === "output_text")
      .map((c) => c.text)
      .join("\n") || "";

  return {
    id: response.id,
    object: "chat.completion",
    created: response.created_at,
    model,
    choices: [
      {
        index: 0,
        message: {
          role: response.output[0]?.role || "assistant",
          content: textContent,
        },
        finish_reason: "stop",
      },
    ],
    usage: response.usage
      ? {
          prompt_tokens: response.usage.input_tokens,
          completion_tokens: response.usage.output_tokens,
          total_tokens: response.usage.total_tokens,
        }
      : undefined,
  };
}

export function transformToAnthropicResponse(
  response: ResponsesAPIResponse,
  model: string
): AnthropicMessageResponse {
  const textContent =
    response.output[0]?.content
      ?.filter((c) => c.type === "output_text")
      .map((c) => c.text) || [];

  return {
    id: response.id,
    type: "message",
    role: response.output[0]?.role || "assistant",
    content: textContent.map((t) => ({ type: "text", text: t })),
    model,
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: response.usage
      ? {
          input_tokens: response.usage.input_tokens,
          output_tokens: response.usage.output_tokens,
        }
      : undefined,
  };
}
