const OpenAI = require("openai");

class OpenAIBackend {
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is required for the openai backend");
    }

    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  }

  async complete(messages) {
    // Responses API: supports web_search_preview natively and handles the
    // tool loop server-side, returning the final answer directly.
    const systemMessage = messages.find((m) => m.role === "system");
    const inputMessages = messages.filter((m) => m.role !== "system");

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
