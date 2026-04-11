const { getDb } = require("../../libs/db");

// Only register these tools when a database is configured.
// Profiles are keyed by Telegram username — the only user identity visible to the LLM.
const enabled = !!process.env.DATABASE_URL;

const getDefinition = {
  name: "get_user_profile",
  description:
    "Retrieve the persistent Markdown profile notes for a user. " +
    "Omit 'username' to fetch the current user's profile. " +
    "Pass a Telegram username (without @) to look up another user's profile — useful when someone asks about another member of the group.",
  parameters: {
    type: "object",
    properties: {
      username: {
        type: "string",
        description:
          "The Telegram username (without @) of the user to look up. Omit to retrieve the current user's own profile.",
      },
    },
    required: [],
  },
};

const updateDefinition = {
  name: "update_user_profile",
  description:
    "Save updated Markdown profile notes for a user. " +
    "Omit 'username' to update the current user's profile. " +
    "Pass a Telegram username (without @) to update another user's profile — use this when the conversation is about or involves another member.",
  parameters: {
    type: "object",
    properties: {
      notes: {
        type: "string",
        description:
          "The full updated Markdown profile text. Use bullet points grouped by topic. Example:\n- Name: prefers 'Alex'\n- Language: English\n- Interests: climbing, coffee",
      },
      username: {
        type: "string",
        description:
          "The Telegram username (without @) of the user whose profile to update. Omit to update the current user's own profile.",
      },
    },
    required: ["notes"],
  },
};

/**
 * @param {object} _args
 * @param {{ chatId: number, userId: number, username?: string }} context
 */
async function getProfile({ username: targetUsername } = {}, { username: currentUsername } = {}) {
  const db = getDb();
  if (!db) return "Database not available.";

  const username = targetUsername || currentUsername;
  if (!username) return "User identity unavailable.";

  const record = await db.userProfile.findUnique({ where: { username } });
  return record?.notes || `No profile found for @${username}.`;
}

/**
 * @param {{ notes: string }} args
 * @param {{ chatId: number, userId: number, username?: string }} context
 */
async function updateProfile({ notes, username: targetUsername }, { username: currentUsername } = {}) {
  const db = getDb();
  if (!db) return "Database not available.";

  const username = targetUsername || currentUsername;
  if (!username) return "User identity unavailable.";

  await db.userProfile.upsert({
    where: { username },
    update: { notes },
    create: { username, notes },
  });

  return "Profile updated successfully.";
}

module.exports = {
  enabled,
  getDefinition,
  updateDefinition,
  getProfile,
  updateProfile,
};
