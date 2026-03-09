const Anthropic = require("@anthropic-ai/sdk");

class ClaudeBackend {
  constructor() {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is required for the claude backend");
    }

    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    this.model = process.env.CLAUDE_MODEL || "claude-haiku-4-5-20251001";
  }

  normalizeMessages(messages) {
    return messages.map((msg) => {
      if (!Array.isArray(msg.content)) return msg;
      return {
        ...msg,
        content: msg.content.map((block) =>
          block.type === "image"
            ? {
                type: "image",
                source: {
                  type: "base64",
                  media_type: block.mediaType,
                  data: block.data,
                },
              }
            : block,
        ),
      };
    });
  }

  async complete(messages) {
    const normalized = this.normalizeMessages(messages);
    // Anthropic takes system as a top-level parameter, not a message role
    const systemMessage = normalized.find((m) => m.role === "system");
    const conversationMessages = normalized.filter((m) => m.role !== "system");

    const params = {
      model: this.model,
      max_tokens: 4096,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [...conversationMessages],
    };

    if (systemMessage) {
      params.system = systemMessage.content;
    }

    let response = await this.client.messages.create(params);

    // Tool-use loop: web_search is executed server-side by Anthropic,
    // but still follows the standard multi-turn tool protocol.
    while (response.stop_reason === "tool_use") {
      params.messages.push({ role: "assistant", content: response.content });

      const toolResults = response.content
        .filter((b) => b.type === "tool_use")
        .map((block) => ({
          type: "tool_result",
          tool_use_id: block.id,
          content: "",
        }));

      params.messages.push({ role: "user", content: toolResults });
      response = await this.client.messages.create(params);
    }

    // Join all text blocks — the response may be split across multiple text
    // blocks with tool_use/tool_result blocks interleaved in between.
    return response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
  }
}

module.exports = ClaudeBackend;
