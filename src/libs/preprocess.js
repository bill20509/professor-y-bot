const { SLASH_COMMANDS } = require("../constants/commands");

const ADMIN_USERNAME = "yanglin1112";

/**
 * Command registry for standard Telegram bot commands.
 * Triggered by sending /command in any chat (or /command@botname in groups).
 * Handlers may be async; returning null suppresses the default reply
 * (use this when the handler sends its own message).
 */
const COMMANDS = {
  [SLASH_COMMANDS.MODEL]: async ({ msg, bot, chatId, llm, isGroup }) => {
    if (isGroup) return null;

    if (msg.from?.username !== ADMIN_USERNAME) {
      return llm.providerInfo();
    }

    const groups = await llm.listModels();
    if (!groups.length) {
      await bot.sendMessage(
        chatId,
        "No models available — check your API keys.",
      );
      return null;
    }

    const rows = [];
    for (let i = 0; i < groups.length; i += 2) {
      rows.push(
        groups.slice(i, i + 2).map((g) => ({
          text: g.backend.charAt(0).toUpperCase() + g.backend.slice(1),
          callback_data: `mp:${g.backend}`,
        })),
      );
    }

    await bot.sendMessage(
      chatId,
      `Current: <b>${llm.providerInfo()}</b>\n\nChoose a provider:`,
      { parse_mode: "HTML", reply_markup: { inline_keyboard: rows } },
    );
    return null;
  },
};

/**
 * Detect and dispatch a standard Telegram bot command from the message entities.
 * Must be called before any thread/mention routing so commands bypass the LLM flow.
 *
 * Returns true if a command was handled (caller should stop processing),
 * false if the message is not a bot command or no handler is registered for it.
 *
 * In groups, commands addressed to another bot (/cmd@otherbot) are ignored.
 *
 * @param {object}  ctx
 * @param {object}  ctx.msg
 * @param {object}  ctx.bot
 * @param {object}  ctx.llm
 * @param {number}  ctx.chatId
 * @param {boolean} ctx.isGroup
 * @returns {Promise<boolean>}
 */
async function preprocess(ctx) {
  const { msg, bot, chatId, isGroup } = ctx;

  const commandEntity = msg.entities?.find(
    (e) => e.type === "bot_command" && e.offset === 0,
  );
  if (!commandEntity) return false;

  const raw = msg.text.slice(0, commandEntity.length); // e.g. "/model" or "/model@botname"
  const [command, addressee] = raw.split("@");

  // In groups, ignore commands addressed to a different bot
  const botUsername = process.env.TELEGRAM_BOT_USERNAME;
  if (isGroup && addressee && addressee !== botUsername) return false;

  const handler = COMMANDS[command];
  if (!handler) return false;

  const reply = await handler(ctx);
  if (reply != null) {
    await bot.sendMessage(chatId, reply, {
      reply_to_message_id: msg.message_id,
    });
  }
  return true;
}

module.exports = preprocess;
