const { SLASH_COMMANDS } = require("../constants/commands");
const { getDb } = require("./db");

const ADMIN_USERNAME = "yanglin1112";

/**
 * Command registry for standard Telegram bot commands.
 * Triggered by sending /command in any chat (or /command@botname in groups).
 * Handlers may be async; returning null suppresses the default reply
 * (use this when the handler sends its own message).
 */
const COMMANDS = {
  [SLASH_COMMANDS.ME]: async ({ msg, bot, chatId }) => {
    const username = msg.from?.username;
    if (!username)
      return "Unable to look up your profile — you don't have a Telegram username set.";

    const db = getDb();
    if (!db) return "Database not available.";

    const record = await db.userProfile.findUnique({ where: { username } });
    if (!record || !record.notes)
      return `No profile on record for @${username}.`;

    await bot.sendMessage(
      chatId,
      `<b>@${username}'s profile:</b>\n\n${record.notes}`,
      { parse_mode: "HTML", reply_to_message_id: msg.message_id },
    );
    return null;
  },

  [SLASH_COMMANDS.FORGET]: async ({ msg }) => {
    const username = msg.from?.username;
    if (!username)
      return "Unable to find your profile — you don't have a Telegram username set.";

    const db = getDb();
    if (!db) return "Database not available.";

    const record = await db.userProfile.findUnique({ where: { username } });
    if (!record || !record.notes)
      return `No profile on record for @${username} — nothing to clear.`;

    await db.userProfile.update({
      where: { username },
      data: { notes: "" },
    });

    return `Profile cleared for @${username}.`;
  },

  [SLASH_COMMANDS.MODEL]: async ({ msg, bot, chatId, llm }) => {
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

  // All commands are PM only
  if (isGroup) return false;

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
