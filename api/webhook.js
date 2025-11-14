export default async function handler(req, res) {
  const BOT_TOKEN = process.env.BOT_TOKEN;
  const SECRET_TOKEN = process.env.SECRET_TOKEN;
  const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

  // Security check
  const headerSecret = req.headers['x-telegram-bot-api-secret-token'];
  if (SECRET_TOKEN && headerSecret !== SECRET_TOKEN) {
    return res.status(401).json({ ok: false, error: "Invalid secret token" });
  }

  const update = req.body;
  res.status(200).json({ ok: true }); // Immediately respond to Telegram

  // Helper to send messages
  async function sendMessage(chat_id, text) {
    await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id,
        text,
        parse_mode: "HTML"
      })
    });
  }

  function mentionHTML(user) {
    let name = user.first_name || "User";
    if (user.username) return `@${user.username}`;
    return `<a href="tg://user?id=${user.id}">${name}</a>`;
  }

  // Welcome via new_chat_members
  if (update.message?.new_chat_members) {
    const chatId = update.message.chat.id;
    for (const user of update.message.new_chat_members) {
      const mention = mentionHTML(user);
      const txt = `🎉 স্বাগতম ${mention}!\nগ্রুপে আপনাকে পেয়ে ভালো লাগলো!`;
      await sendMessage(chatId, txt);
    }
  }

  // Welcome via chat_member
  if (update.chat_member) {
    const chatId = update.chat_member.chat.id;
    const oldS = update.chat_member.old_chat_member.status;
    const newS = update.chat_member.new_chat_member.status;

    if ((oldS === "left" || oldS === "kicked") && newS === "member") {
      const user = update.chat_member.new_chat_member.user;
      const mention = mentionHTML(user);
      const txt = `🎉 স্বাগতম ${mention}!\nগ্রুপে আপনাকে স্বাগতম!`;
      await sendMessage(chatId, txt);
    }
  }
}
