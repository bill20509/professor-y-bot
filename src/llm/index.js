const { v4: uuidv4 } = require("uuid");

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
    this.threads = new Map();         // threadId -> messages[]
    this.messageToThread = new Map(); // messageId -> threadId
  }

  createThread() {
    const threadId = uuidv4();
    this.threads.set(threadId, []);
    return threadId;
  }

  trackMessage(messageId, threadId) {
    this.messageToThread.set(messageId, threadId);
  }

  resolveThread(messageId) {
    return this.messageToThread.get(messageId) ?? null;
  }

  async chat(threadId, userMessage) {
    if (!this.threads.has(threadId)) {
      this.threads.set(threadId, []);
    }

    const history = this.threads.get(threadId);
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
