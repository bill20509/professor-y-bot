async function setup({ app, bot }, options) {
  const DEV_MODE = options.mode !== "production";

  if (DEV_MODE) {
    console.log("Bot running in DEVELOPMENT mode with polling");
  } else {
    const port = process.env.PORT || 80;

    app.get("/", (req, res) => res.send("ok"));

    app.post("/webhook", (req, res) => {
      try {
        bot.processUpdate(req.body);
        res.sendStatus(200);
      } catch (error) {
        console.error("Error handling webhook update:", error);
        res.sendStatus(500);
      }
    });

    const externalUrl = process.env.EXTERNAL_URL;
    if (externalUrl) {
      const webhookUrl = `${externalUrl}/webhook`;
      bot
        .setWebHook(webhookUrl)
        .then(() => console.log(`Webhook set to: ${webhookUrl}`))
        .catch((error) => console.error("Failed to set webhook:", error));
    } else {
      console.warn(
        "EXTERNAL_URL not set. Webhook not registered. Bot will not receive updates.",
      );
    }

    app.listen(port, () => console.log(`Bot server running on port ${port}`));
  }
}

module.exports = setup;
