import {
  OpenAIChatRequest,
  AnthropicMessageRequest,
  ResponsesAPIRequest,
  ResponsesInputItem,
  ResponsesContentPart,
  AnthropicTool,
  ResponsesTool,
} from "../types.js";

export function transformOpenAIRequest(
  request: OpenAIChatRequest
): ResponsesAPIRequest {
  // Filter out tool role messages — Responses API does not accept role "tool"
  const input: ResponsesInputItem[] = request.messages
    .filter((msg) => msg.role !== "tool")
    .map((msg) => {
      const content: string | ResponsesContentPart[] =
        typeof msg.content === "string"
          ? msg.content
          : msg.content.map((part): ResponsesContentPart => {
              if (part.type === "text")
                return { type: "input_text", text: part.text };
              if (part.type === "image_url" && part.image_url)
                return {
                  type: "input_image",
                  image_url: part.image_url.url,
                  image_detail:
                    (part.image_url.detail || "auto") as "auto" | "low" | "high",
                };
              return { type: "input_text", text: JSON.stringify(part) };
            });
      return {
        role: msg.role as "system" | "user" | "assistant",
        content,
      };
    });

  return {
    model: request.model,
    input,
    tools: request.tools?.map((t) => ({
      type: "function" as const,
      name: t.function.name,
      description: t.function.description,
      parameters: t.function.parameters,
    })),
    temperature: request.temperature,
    max_output_tokens: request.max_tokens,
    top_p: request.top_p,
    frequency_penalty: request.frequency_penalty,
    presence_penalty: request.presence_penalty,
    stop: request.stop,
    stream: request.stream,
  };
}

export function transformAnthropicRequest(
  request: AnthropicMessageRequest,
  targetModel: string
): ResponsesAPIRequest {
  const inputItems: ResponsesInputItem[] = [];

  // Handle system prompt
  if (request.system) {
    const systemContent =
      typeof request.system === "string"
        ? request.system
        : request.system
            .filter((s) => s.type === "text")
            .map((s) => s.text)
            .join("\n");
    inputItems.push({ role: "system", content: systemContent });
  }

  // Handle messages
  for (const msg of request.messages) {
    const content: string | ResponsesContentPart[] =
      typeof msg.content === "string"
        ? msg.content
        : msg.content.map((part): ResponsesContentPart => {
            if (part.type === "text")
              return { type: "input_text", text: part.text };
            if (part.type === "image" && part.source)
              return {
                type: "input_image",
                image_url: `data:${part.source.media_type};base64,${part.source.data}`,
              };
            return { type: "input_text", text: JSON.stringify(part) };
          });
    inputItems.push({
      role: msg.role as "user" | "assistant",
      content,
    });
  }

  // Convert tools
  const tools: ResponsesTool[] | undefined = request.tools?.map(
    (t: AnthropicTool) => ({
      type: "function" as const,
      name: t.name,
      description: t.description,
      parameters: t.input_schema,
    })
  );

  return {
    model: targetModel,
    input: inputItems,
    tools,
    temperature: request.temperature,
    max_output_tokens: request.max_tokens,
    top_p: request.top_p,
    stop: request.stop_sequences,
    stream: request.stream,
  };
}
