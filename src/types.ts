// ==================== OpenAI Chat Completions 入站 ====================

export interface OpenAIChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | Array<ContentPart>;
  tool_call_id?: string;
  name?: string;
}

export interface ContentPart {
  type: "text" | "image_url";
  text?: string;
  image_url?: { url: string; detail?: string };
}

export interface OpenAIChatTool {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters: Record<string, unknown>;
  };
}

export interface OpenAIChatRequest {
  model: string;
  messages: OpenAIChatMessage[];
  tools?: OpenAIChatTool[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string | string[];
  stream?: boolean;
}

// ==================== Anthropic Messages 入站 ====================

export interface AnthropicMessage {
  role: "user" | "assistant";
  content: string | Array<AnthropicContentPart>;
}

export interface AnthropicContentPart {
  type: "text" | "image" | "tool_use" | "tool_result";
  text?: string;
  source?: { type: "base64"; media_type: string; data: string };
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  output?: Array<AnthropicContentPart>;
}

export interface AnthropicTool {
  name: string;
  description?: string;
  input_schema: Record<string, unknown>;
}

export interface AnthropicMessageRequest {
  model: string;
  messages: AnthropicMessage[];
  system?: string | Array<{ type: "text"; text: string }>;
  tools?: AnthropicTool[];
  max_tokens: number;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  stop_sequences?: string[];
  stream?: boolean;
}

// ==================== OpenAI Responses API ====================

export interface ResponsesInputItem {
  role: "system" | "user" | "assistant";
  content: string | Array<ResponsesContentPart>;
}

export interface ResponsesContentPart {
  type: "input_text" | "input_image";
  text?: string;
  image_url?: string;
  image_detail?: "auto" | "low" | "high";
}

export interface ResponsesTool {
  type: "function";
  name: string;
  description?: string;
  parameters: Record<string, unknown>;
}

export interface ResponsesAPIRequest {
  model: string;
  input: string | ResponsesInputItem[];
  tools?: ResponsesTool[];
  temperature?: number;
  max_output_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string | string[];
  stream?: boolean;
}

// ==================== Responses API 响应 ====================

export interface ResponsesAPIResponse {
  id: string;
  object: string;
  created_at: number;
  status: string;
  output: Array<{
    type: string;
    role?: string;
    content: Array<{
      type: string;
      text: string;
    }>;
  }>;
  usage?: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
}

export interface ResponsesAPIStreamEvent {
  type: string;
  output_index?: number;
  delta?: string;
  item?: {
    role?: string;
    content?: Array<{ type: string; text: string }>;
  };
}

// ==================== 出站响应格式 ====================

export interface OpenAIChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: { role: string; content: string };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface AnthropicMessageResponse {
  id: string;
  type: string;
  role: string;
  content: Array<{ type: string; text: string }>;
  model: string;
  stop_reason: string;
  stop_sequence?: string | null;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

// ==================== 错误响应 ====================

export interface ErrorResponse {
  error: {
    message: string;
    type: string;
    code?: string;
  };
}

// ==================== 上游响应 ====================

export interface UpstreamResponse {
  ok: boolean;
  status: number;
  body: ReadableStream<Uint8Array> | null;
  text: () => Promise<string>;
  json: () => Promise<unknown>;
}
