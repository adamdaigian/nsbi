/**
 * AI client — Anthropic streaming via Messages API.
 * Uses native fetch (no SDK dependency) to keep it lightweight.
 */

export interface AIConfig {
  provider: string;
  apiKey: string;
  model: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Stream chat completions from Anthropic Claude.
 * Yields content text deltas as they arrive.
 */
export async function* streamChatCompletion(
  config: AIConfig,
  systemPrompt: string,
  messages: ChatMessage[],
): AsyncGenerator<string> {
  if (config.provider !== "anthropic") {
    throw new Error(`AI provider "${config.provider}" not yet supported. Use "anthropic".`);
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      stream: true,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Anthropic API error (${response.status}): ${errText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6);
        if (data === "[DONE]") return;

        try {
          const event = JSON.parse(data) as {
            type: string;
            delta?: { type: string; text?: string };
          };
          if (event.type === "content_block_delta" && event.delta?.text) {
            yield event.delta.text;
          }
        } catch {
          // Skip malformed JSON
        }
      }
    }
  }
}
