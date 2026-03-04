const Anthropic = require("@anthropic-ai/sdk");

class ClaudeBackend {
  constructor() {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is required for the claude backend");
    }

    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    this.model = process.env.CLAUDE_MODEL || "claude-haiku-4-5-20251001";
  }

  async complete(messages) {
    // Anthropic takes system as a top-level param, not a message role
    const systemMessage = messages.find((m) => m.role === "system");
    const conversationMessages = messages.filter((m) => m.role !== "system");

    const params = {
      model: this.model,
      max_tokens: 1024,
      messages: conversationMessages,
    };

    if (systemMessage) {
      params.system = systemMessage.content;
    }

    const response = await this.client.messages.create(params);
    return response.content[0].text;
  }
}

module.exports = ClaudeBackend;
