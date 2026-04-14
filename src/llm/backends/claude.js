const Anthropic = require("@anthropic-ai/sdk");
const remindTool = require("../tools/remind");
const fetchUrlTool = require("../tools/fetch-url");
const userProfileTool = require("../tools/user-profile");
const searchMapTool = require("../tools/search-map");

class ClaudeBackend {
  constructor() {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is required for the claude backend");
    }

    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    this.model = "claude-haiku-4-5-20251001";
  }

  normalizeMessages(messages) {
    return messages.map((msg) => {
      if (!Array.isArray(msg.content)) return msg;
      return {
        ...msg,
        content: msg.content.map((block) =>
          block.type === "image"
            ? {
                type: "image",
                source: {
                  type: "base64",
                  media_type: block.mediaType,
                  data: block.data,
                },
              }
            : block,
        ),
      };
    });
  }

  async complete(messages, { chatId, userId, username } = {}) {
    const normalized = this.normalizeMessages(messages);
    const systemMessage = normalized.find((m) => m.role === "system");
    const conversationMessages = normalized.filter((m) => m.role !== "system");

    const tools = [
      { type: "web_search_20250305", name: "web_search" },
      {
        name: fetchUrlTool.definition.name,
        description: fetchUrlTool.definition.description,
        input_schema: fetchUrlTool.definition.parameters,
      },
      {
        name: searchMapTool.definition.name,
        description: searchMapTool.definition.description,
        input_schema: searchMapTool.definition.parameters,
      },
    ];
    if (remindTool.enabled) {
      tools.push({
        name: remindTool.definition.name,
        description: remindTool.definition.description,
        input_schema: remindTool.definition.parameters,
      });
    }
    if (userProfileTool.enabled) {
      tools.push(
        {
          name: userProfileTool.getDefinition.name,
          description: userProfileTool.getDefinition.description,
          input_schema: userProfileTool.getDefinition.parameters,
        },
        {
          name: userProfileTool.updateDefinition.name,
          description: userProfileTool.updateDefinition.description,
          input_schema: userProfileTool.updateDefinition.parameters,
        },
      );
    }

    const params = {
      model: this.model,
      max_tokens: 4096,
      tools,
      messages: [...conversationMessages],
    };

    if (systemMessage) {
      params.system = systemMessage.content;
    }

    let response = await this.client.messages.create(params);

    while (response.stop_reason === "tool_use") {
      params.messages.push({ role: "assistant", content: response.content });

      const toolResults = await Promise.all(
        response.content
          .filter((b) => b.type === "tool_use")
          .map(async (block) => {
            let content = "";
            if (block.name === remindTool.definition.name) {
              content = await remindTool.execute(block.input, { chatId });
            } else if (block.name === fetchUrlTool.definition.name) {
              content = await fetchUrlTool.execute(block.input);
            } else if (block.name === searchMapTool.definition.name) {
              content = await searchMapTool.execute(block.input);
            } else if (block.name === userProfileTool.getDefinition.name) {
              content = await userProfileTool.getProfile(block.input, { chatId, userId, username });
            } else if (block.name === userProfileTool.updateDefinition.name) {
              content = await userProfileTool.updateProfile(block.input, { chatId, userId, username });
            }
            return { type: "tool_result", tool_use_id: block.id, content };
          }),
      );

      params.messages.push({ role: "user", content: toolResults });
      response = await this.client.messages.create(params);
    }

    return response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
  }

  async listModels() {
    const models = [];
    for await (const m of this.client.models.list()) models.push(m.id);
    return models.filter((id) => id.startsWith("claude-"));
  }
}

module.exports = ClaudeBackend;
