const { readFileSync } = require("fs");
const { join } = require("path");

function loadPrompt(filename) {
  return readFileSync(join(__dirname, filename), "utf8")
    .trim()
    .replace(/%BOT_NAME%/g, process.env.TELEGRAM_BOT_USERNAME || "bot");
}

const DEFAULT_SYSTEM_PROMPT = [
  loadPrompt("ROLE.md"),
  loadPrompt("BOT.md"),
  loadPrompt("TOOLS.md"),
].join("\n\n");

const BACKENDS = {
  openai: () => require("./backends/openai"),
  claude: () => require("./backends/claude"),
  gemini: () => require("./backends/gemini"),
  lumo: () => require("./backends/lumo"),
};

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
    this.backendName = backendName;
  }

  providerInfo() {
    return `${this.backendName} / ${this.backend.model}`;
  }

  async chat(thread, userMessage, { chatId } = {}) {
    thread.append("user", userMessage);

    const systemPrompt = [
      DEFAULT_SYSTEM_PROMPT,
      `Current UTC time: ${new Date().toISOString()}`,
      process.env.LLM_SYSTEM_PROMPT,
    ]
      .filter(Boolean)
      .join("\n\n");

    const messages = [
      { role: "system", content: systemPrompt },
      ...thread.history,
    ];

    const reply = await this.backend.complete(messages, { chatId });
    thread.append("assistant", reply);
    await thread.save();

    return reply;
  }
}

module.exports = LLMClient;
