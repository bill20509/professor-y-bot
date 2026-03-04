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
    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages,
    });
    return completion.choices[0].message.content;
  }
}

module.exports = OpenAIBackend;
