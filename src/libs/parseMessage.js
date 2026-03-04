function parseMessage(msg) {
  const id = msg.message_id;
  const chatId = msg.chat.id;
  const text = msg.text || "";
  const args = text.split(" ").slice(1);
  const from = msg.from;
  const username = from?.username;

  return { id, chatId, text, args, from, username };
}

module.exports = parseMessage;
