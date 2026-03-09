const OpenAI = require("openai");

class OpenAIBackend {
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is required for the openai backend");
    }

    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  }

  normalizeMessages(messages) {
    return messages.map((msg) => {
      if (!Array.isArray(msg.content)) return msg;
      return {
        ...msg,
        content: msg.content.map((block) => {
          if (block.type === "image")
            return {
              type: "input_image",
              image_url: `data:${block.mediaType};base64,${block.data}`,
            };
          if (block.type === "text")
            return { type: "input_text", text: block.text };
          return block;
        }),
      };
    });
  }

  async complete(messages) {
    const normalized = this.normalizeMessages(messages);
    // Responses API: supports web_search_preview natively and handles the
    // tool loop server-side, returning the final answer directly.
    const systemMessage = normalized.find((m) => m.role === "system");
    const inputMessages = normalized.filter((m) => m.role !== "system");

    const params = {
      model: this.model,
      input: inputMessages,
      tools: [{ type: "web_search_preview" }],
    };

    if (systemMessage) {
      params.instructions = systemMessage.content;
    }

    const response = await this.client.responses.create(params);
    return response.output_text;
  }
}

module.exports = OpenAIBackend;
