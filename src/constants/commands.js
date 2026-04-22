const SLASH_COMMANDS = {
  MODEL: "/model",
};

const INLINE_COMMANDS = {
  NOREPLY: "!noreply",
  INFO: "!info",
};

/**
 * Bot commands registered with Telegram via setMyCommands on startup.
 * Each entry: { command, description, scope } where scope is a Telegram BotCommandScope object.
 */
const BOT_COMMANDS = [
  {
    command: "model",
    description: "Show current AI model; switch provider and model (admin only)",
    scope: { type: "all_private_chats" },
  },
];

module.exports = { SLASH_COMMANDS, INLINE_COMMANDS, BOT_COMMANDS };
