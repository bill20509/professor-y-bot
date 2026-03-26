/**
 * Returns the best image attachment from a Telegram message, or null if none.
 * For compressed photos, Telegram sends an array of sizes — we take the last
 * (largest) one. Uncompressed image documents are also supported.
 * For stickers (static, animated, or video), the thumbnail is used.
 *
 * @param {object|null|undefined} msg - A Telegram message object
 * @returns {object|null} A Telegram PhotoSize/Document object with file_id, or null
 */
function getLastImage(msg) {
  if (!msg) return null;
  if (msg.photo) return msg.photo[msg.photo.length - 1];
  if (msg.document?.mime_type?.startsWith("image/")) return msg.document;
  if (msg.sticker?.thumbnail) return msg.sticker.thumbnail;
  return null;
}

/**
 * Converts a Telegram file object (from bot.getFile()) into a neutral LLM image block.
 *
 * @param {string} token - Telegram bot token (used to build the file download URL)
 * @param {object} file - Telegram File object returned by bot.getFile()
 * @returns {{ type: "image", mediaType: string, data: string }}
 */
async function toImageBlock(token, file) {
  const url = `https://api.telegram.org/file/bot${token}/${file.file_path}`;
  const res = await fetch(url);
  const buffer = await res.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  const ext = file.file_path.split(".").pop().toLowerCase();
  const mediaType =
    {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
    }[ext] || "image/jpeg";
  return { type: "image", mediaType, data: base64 };
}

module.exports = { getLastImage, toImageBlock };
