const TelegramBot = require("node-telegram-bot-api");
const parseMessage = require("./libs/parseMessage");

class EnhancedBot extends TelegramBot {
  handleMessage = () => {};

  constructor(token, options) {
    super(token, {
      polling: options.mode !== "production",
      request: {
        agentOptions: {
          keepAlive: true,
          family: 4,
        },
      },
    });

    if (!token) {
      throw new Error("Telegram bot token is required");
    }

    this.on("error", (error) => {
      console.error("Bot error:", error);
    });

    this.on("polling_error", (error) => {
      console.error("Polling error:", error);
    });

    this.on("message", async (msg) => {
      if (!msg.text) return;

      return this.handleMessage(msg);
    });
  }

  async respond(msg, response) {
    const { chatId } = parseMessage(msg);
    await this.sendMessage(chatId, response);
  }

  onMessage(callback) {
    this.handleMessage = callback;
  }
}

module.exports = EnhancedBot;
