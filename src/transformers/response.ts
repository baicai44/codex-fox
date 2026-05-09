import {
  ChatCompletionsResponse,
  ResponsesAPIResponse,
} from "../types.js";

export function transformToResponsesAPI(
  response: ChatCompletionsResponse
): ResponsesAPIResponse {
  const textContent = response.choices[0]?.message?.content || "";
  const finishReason = response.choices[0]?.finish_reason || "stop";

  return {
    id: response.id,
    object: "response",
    created_at: response.created,
    status: finishReason === "stop" ? "completed" : finishReason === "length" ? "incomplete" : "completed",
    output: [
      {
        type: "message",
        role: response.choices[0]?.message?.role || "assistant",
        content: [{ type: "output_text", text: textContent }],
      },
    ],
    usage: response.usage
      ? {
          input_tokens: response.usage.prompt_tokens,
          output_tokens: response.usage.completion_tokens,
          total_tokens: response.usage.total_tokens,
        }
      : undefined,
  };
}
