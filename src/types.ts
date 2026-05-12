// ==================== Chat Completions 格式（DeepSeek 等兼容服务） ====================

export interface ChatCompletionsToolCallFunction {
  name: string;
  arguments: string;
}

export interface ChatCompletionsToolCall {
  id: string;
  type: "function";
  function: ChatCompletionsToolCallFunction;
}

export interface ChatCompletionsMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | Array<{ type: string; text?: string; image_url?: any }> | null;
  tool_call_id?: string;
  name?: string;
  tool_calls?: ChatCompletionsToolCall[];
}

export interface ChatCompletionsTool {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters: Record<string, unknown>;
  };
}

export interface ChatCompletionsRequest {
  model: string;
  messages: ChatCompletionsMessage[];
  tools?: ChatCompletionsTool[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string | string[];
  stream?: boolean;
}

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
  role?: "system" | "user" | "assistant";
  content?: string | ResponsesContentPart[];
  type?: "function_call_output" | "function_call";
  call_id?: string;
  output?: string;
  name?: string;
  arguments?: string;
}

export interface ResponsesContentPart {
  type: "input_text" | "input_image" | "function_call";
  text?: string;
  image_url?: string;
  image_detail?: "auto" | "low" | "high";
  call_id?: string;
  name?: string;
  arguments?: string;
}

export interface ResponsesFunctionCallOutputItem {
  type: "function_call_output";
  call_id: string;
  output: string;
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
  /** reasoning effort for reasoning models */
  reasoning?: { effort?: "low" | "medium" | "high" };
}

// ==================== Responses API 响应 ====================

export interface ResponsesAPIResponse {
  id: string;
  object: string;
  created_at: number;
  status: string;
  model?: string;
  output: Array<
    | {
        type: "message";
        id?: string;
        role?: string;
        content: Array<
          | { type: "output_text"; text: string }
          | { type: "reasoning_text"; text: string }
        >;
      }
    | {
        type: "function_call";
        id?: string;
        call_id: string;
        name: string;
        arguments: string;
      }
  >;
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

export interface ChatCompletionsResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string | null;
      reasoning_content?: string;
      tool_calls?: Array<{
        id: string;
        type: "function";
        function: { name: string; arguments: string };
      }>;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
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
