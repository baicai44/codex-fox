import {
  OpenAIChatRequest,
  AnthropicMessageRequest,
  AnthropicTool,
  ChatCompletionsRequest,
  ChatCompletionsMessage,
  ChatCompletionsTool,
  ChatCompletionsToolCall,
  ResponsesAPIRequest,
} from "../types.js";

export function transformOpenAIRequest(
  request: OpenAIChatRequest
): ChatCompletionsRequest {
  // 兼容转换：将上游不支持的 role 映射到支持的 role
  const messages = request.messages?.map((msg) => {
    let role = msg.role as string;
    if (role === "developer") role = "system";

    // 修复 content 中的不兼容类型
    let content = msg.content;
    if (Array.isArray(content)) {
      content = content.map((part: any) => {
        if (part.type === "input_image") return { type: "text", text: "[image]" };
        return part;
      });
    }

    return { ...msg, role, content } as ChatCompletionsMessage;
  });
  // 过滤空名工具
  const tools = request.tools?.filter((t) => t.function?.name?.trim());
  return { ...request, messages, tools, stream: false } as unknown as ChatCompletionsRequest;
}

export function transformAnthropicRequest(
  request: AnthropicMessageRequest,
  targetModel: string
): ChatCompletionsRequest {
  const messages: ChatCompletionsMessage[] = [];

  if (request.system) {
    const systemContent =
      typeof request.system === "string"
        ? request.system
        : request.system
            .filter((s) => s.type === "text")
            .map((s) => s.text)
            .join("\n");
    messages.push({ role: "system", content: systemContent });
  }

  for (const msg of request.messages) {
    const content: string | Array<{ type: string; text?: string; image_url?: any }> =
      typeof msg.content === "string"
        ? msg.content
        : msg.content.map((part) => {
            if (part.type === "text") return { type: "text", text: part.text };
            if (part.type === "image" && part.source)
              return {
                type: "image_url",
                image_url: { url: `data:${part.source.media_type};base64,${part.source.data}` },
              };
            return { type: "text", text: JSON.stringify(part) };
          });
    messages.push({ role: msg.role as "user" | "assistant", content });
  }

  const tools: ChatCompletionsTool[] | undefined = request.tools?.map(
    (t: AnthropicTool) => ({
      type: "function" as const,
      function: { name: t.name, description: t.description, parameters: t.input_schema },
    })
  );

  return {
    model: targetModel, messages, tools,
    temperature: request.temperature,
    max_tokens: request.max_tokens,
    top_p: request.top_p,
    stop: request.stop_sequences,
    stream: false,
  };
}

export function transformResponsesToChatCompletions(
  request: ResponsesAPIRequest,
  targetModel: string
): ChatCompletionsRequest {
  const messages: ChatCompletionsMessage[] = [];
  const pendingFunctionCalls: typeof request.input = [];

  // 兼容转换：DeepSeek 等上游不支持的 role → 映射到支持的 role
  const normalizeRole = (raw: string): "system" | "user" | "assistant" | "tool" => {
    if (raw === "developer") return "system";
    return raw as "system" | "user" | "assistant" | "tool";
  };

  if (typeof request.input === "string") {
    messages.push({ role: "user", content: request.input });
  } else {
    for (const item of request.input) {
      // 收集连续 function_call 项，合成一个 assistant
      if (item.type === "function_call") {
        pendingFunctionCalls.push(item);
        continue;
      }

      // 遇到非 function_call 项时，flush 收集的 function_calls
      if (pendingFunctionCalls.length > 0) {
        const toolCalls: ChatCompletionsToolCall[] = pendingFunctionCalls.map(fc => ({
          id: fc.call_id || "call_auto",
          type: "function" as const,
          function: { name: fc.name || "unknown", arguments: fc.arguments || "{}" },
        }));
        messages.push({ role: "assistant", content: null, tool_calls: toolCalls, reasoning_content: "OK" } as any);
        pendingFunctionCalls.length = 0;
      }

      // Handle function_call_output items (tool call results)
      if (item.type === "function_call_output") {
        // tool output 可能是纯文本或包含图片的内容数组
        let toolContent: string | Array<{ type: string; text?: string }> = "";
        if (typeof item.output === "string") {
          toolContent = item.output;
        } else if (Array.isArray(item.output)) {
          toolContent = (item.output as any[]).map((p: any) => {
            if (p.type === "input_image") return { type: "text", text: "[image]" };
            if (p.type === "input_text" || p.type === "output_text") return { type: "text", text: p.text || "" };
            return { type: "text", text: JSON.stringify(p) };
          });
        }
        messages.push({
          role: "tool",
          tool_call_id: item.call_id!,
          content: toolContent as any,
        });
        continue;
      }

      // Handle regular messages — normalize role for upstream compatibility
      const role = normalizeRole(item.role || "user");
      if (typeof item.content === "string") {
        messages.push({ role, content: item.content });
      } else if (Array.isArray(item.content)) {
        // Check if this assistant message contains function_calls
        const functionCallParts = item.content.filter(
          (p: any) => p.type === "function_call"
        );

        if (functionCallParts.length > 0 && role === "assistant") {
          const toolCalls: ChatCompletionsToolCall[] = functionCallParts.map(
            (fc: any) => ({
              id: fc.call_id || "",
              type: "function" as const,
              function: { name: fc.name || "", arguments: fc.arguments || "" },
            })
          );

          // Extract text + reasoning parts
          const reasoningPartsTc = item.content!.filter((p: any) => p.type === "reasoning_text");
          const textParts = item.content!.filter(
            (p: any) => p.type === "input_text" || p.type === "output_text" || p.type === "input_image"
          );
          const rc = reasoningPartsTc.length > 0 ? reasoningPartsTc.map((p: any) => p.text).join("\n") : undefined;

          if (textParts.length > 0) {
            const parts = textParts.map((part: any) => {
              if (part.type === "input_text" || part.type === "output_text") return { type: "text", text: part.text };
              if (part.type === "input_image") return { type: "text", text: "[image]" };
              return { type: "text", text: JSON.stringify(part) };
            });
            messages.push({ role, content: parts as any, tool_calls: toolCalls, ...(rc ? { reasoning_content: rc } as any : {}) });
          } else {
            messages.push({ role, content: null, tool_calls: toolCalls, ...(rc ? { reasoning_content: rc } as any : {}) });
          }
        } else {
          // Regular content (text/images)
          // 分离 reasoning_text 和普通文本
          const reasoningParts = item.content!.filter((p: any) => p.type === "reasoning_text");
          const visibleParts = item.content!.filter((p: any) =>
            p.type === "input_text" || p.type === "output_text" || p.type === "input_image"
          );

          const parts = visibleParts.map((part: any) => {
            if (part.type === "input_text" || part.type === "output_text") return { type: "text", text: part.text };
            if (part.type === "input_image") return { type: "text", text: "[image]" };
            return { type: "text", text: JSON.stringify(part) };
          });

          const reasoningContent = reasoningParts.length > 0
            ? reasoningParts.map((p: any) => p.text).join("\n")
            : undefined;

          const msg: ChatCompletionsMessage = {
            role,
            content: parts.length > 0 ? (parts as any) : (reasoningContent ? null : ""),
          };
          if (reasoningContent) (msg as any).reasoning_content = reasoningContent;
          messages.push(msg);
        }
      }
    }
  }

  // Flush 剩余的 function_calls（转为单个 assistant）
  if (pendingFunctionCalls.length > 0) {
    const toolCalls: ChatCompletionsToolCall[] = pendingFunctionCalls.map(fc => ({
      id: fc.call_id || "call_auto",
      type: "function" as const,
      function: { name: fc.name || "unknown", arguments: fc.arguments || "{}" },
    }));
    messages.push({ role: "assistant", content: null, tool_calls: toolCalls, reasoning_content: "OK" } as any);
    pendingFunctionCalls.length = 0;
  }

  // Transform tools from Responses format to Chat Completions format
  // 过滤空名工具（上游 DeepSeek 不认空字符串 name）
  const rawTools = request.tools || [];
  const validTools = rawTools.filter((t) => t.name && t.name.trim().length > 0);
  if (rawTools.length > 0) {
    // tools processed
  }
  const tools: ChatCompletionsTool[] | undefined = validTools.length > 0 ? validTools
    .map((t) => ({
      type: "function" as const,
      function: {
        name: t.name,
        ...(t.description ? { description: t.description } : {}),
        parameters: t.parameters,
      },
    })) : undefined;

  // V4 Pro 无限探索——超过 6 条 tool 消息时注入停手指令
  const toolMsgCount = messages.filter(m => m.role === "tool").length;
  if (toolMsgCount >= 6) {
    const sysIdx = messages.findIndex(m => m.role === "system");
    if (sysIdx >= 0) {
      messages[sysIdx].content = (typeof messages[sysIdx].content === "string" ? messages[sysIdx].content + "\n\n" : "") +
        "IMPORTANT: You have already explored enough. Now provide a final concise summary of what you found and STOP. Do NOT call any more tools. Just output text.";
    }
  }

  // 上下文截断：超过 10 轮工具调用时，只保留 system + 首轮 + 最后 4 轮
  const toolMsgs = messages.filter(m => m.role === "tool");
  if (toolMsgs.length > 10) {
    const keepLast = 4; // 保留最后 N 轮
    const sysMsgs = messages.filter(m => m.role === "system" || m.role === "developer");
    const firstUser = messages.find(m => m.role === "user");

    // 找最后 keepLast 个 assistant 及其 tool 消息
    const lastAsstIndices: number[] = [];
    for (let i = messages.length - 1; i >= 0 && lastAsstIndices.length < keepLast; i--) {
      if (messages[i].role === "assistant") lastAsstIndices.unshift(i);
    }
    if (lastAsstIndices.length > 0) {
      const firstKeepIdx = lastAsstIndices[0];
      const kept = [...sysMsgs];
      if (firstUser && !kept.includes(firstUser)) kept.push(firstUser);
      kept.push(...messages.slice(firstKeepIdx));
      messages.length = 0;
      messages.push(...kept);
    }
  }

  // 重排 tool 消息：DeepSeek 要求 tool 紧跟在对应 assistant 后面，中间不能有其他消息
  // 1) 找出每个 tool 归属的 assistant
  const toolToAsst = new Map<number, number>(); // tool msg index → assistant msg index
  for (let i = 0; i < messages.length; i++) {
    if (messages[i].role === "tool") {
      for (let j = i - 1; j >= 0; j--) {
        if (messages[j].role === "assistant") {
          toolToAsst.set(i, j);
          break;
        }
      }
    }
  }

  // 2) 收集每个 assistant 对应的 tool 消息，并为 assistant 注入 tool_calls
  const asstTools = new Map<number, ChatCompletionsMessage[]>();
  for (const [toolIdx, asstIdx] of toolToAsst) {
    if (!asstTools.has(asstIdx)) asstTools.set(asstIdx, []);
    const tool = messages[toolIdx];
    asstTools.get(asstIdx)!.push(tool);
    // 注入 tool_calls（去重：assistant 可能已有来自 function_call 项的 tool_calls）
    const callId = tool.tool_call_id || `call_auto_${toolIdx}`;
    const outputPreview = typeof tool.content === "string" ? tool.content.slice(0, 100) : "executed";
    if (!messages[asstIdx].tool_calls) messages[asstIdx].tool_calls = [];
    if (!messages[asstIdx].tool_calls!.some(tc => tc.id === callId)) {
      messages[asstIdx].tool_calls!.push({
        id: callId, type: "function", function: { name: "execute_command", arguments: JSON.stringify({ executed: true, output: outputPreview }) },
      });
    }
  }

  // 3) 重建消息列表：assistant 后紧跟其 tool 消息
  const reordered: ChatCompletionsMessage[] = [];
  const placedTools = new Set<number>();
  for (let i = 0; i < messages.length; i++) {
    if (placedTools.has(i)) continue;
    if (messages[i].role === "tool") continue; // 会在 assistant 后处理
    reordered.push(messages[i]);
    // 如果是 assistant 且有对应的 tool 消息，紧跟在后面
    const tools = asstTools.get(i);
    if (tools) {
      for (const t of tools) {
        reordered.push(t);
        placedTools.add(messages.indexOf(t));
      }
    }
  }
  messages.length = 0;
  messages.push(...reordered);

  return {
    model: targetModel,
    messages,
    tools,
    temperature: request.temperature,
    max_tokens: request.max_output_tokens,
    top_p: request.top_p,
    stop: request.stop,
    stream: false, // 上游 SSE 流式返回会导致 JSON 解析失败，强制关闭
  };
}
