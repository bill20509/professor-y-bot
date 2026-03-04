# Professor-Y

A Telegram bot that listens to group messages and replies using an LLM backend (OpenAI or Claude). No database — conversation history is kept in memory per process.

In groups, the bot activates when you **@mention it inside a reply**. The replied-to message becomes the prompt, and your mention message becomes the instruction. In private chats, it responds to all messages.

## Requirements

- Node.js 20+
- Yarn
- A Telegram bot token (from BotFather)
- An OpenAI or Anthropic API key

## Install & run locally

```sh
cp .env.example .env   # fill in your tokens and config
yarn install
yarn dev               # starts in polling mode
```

See `.env.example` for all supported environment variables, and `CLAUDE.md` for full implementation details.
