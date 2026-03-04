const BACKENDS = {
  openai: () => require("./backends/openai"),
  claude: () => require("./backends/claude"),
};

const MAX_HISTORY = 20;

class LLMClient {
  constructor() {
    const backendName = process.env.LLM_BACKEND || "openai";
    const loadBackend = BACKENDS[backendName];

    if (!loadBackend) {
      throw new Error(
        `Unknown LLM_BACKEND: "${backendName}". Supported: ${Object.keys(BACKENDS).join(", ")}`,
      );
    }

    const Backend = loadBackend();
    this.backend = new Backend();
    this.history = new Map(); // `chatId:userId` -> messages[]
  }

  getHistory(chatId, userId) {
    const key = `${chatId}:${userId}`;
    if (!this.history.has(key)) {
      this.history.set(key, []);
    }
    return this.history.get(key);
  }

  clearHistory(chatId, userId) {
    this.history.delete(`${chatId}:${userId}`);
  }

  async chat(chatId, userId, userMessage) {
    const history = this.getHistory(chatId, userId);
    history.push({ role: "user", content: userMessage });

    // Trim to keep history bounded
    if (history.length > MAX_HISTORY) {
      history.splice(0, history.length - MAX_HISTORY);
    }

    const messages = [];

    const systemPrompt = process.env.LLM_SYSTEM_PROMPT;
    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }

    messages.push(...history);

    const reply = await this.backend.complete(messages);
    history.push({ role: "assistant", content: reply });

    return reply;
  }
}

module.exports = LLMClient;
