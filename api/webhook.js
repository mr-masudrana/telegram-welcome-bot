// api/webhook.js

export default async function handler(req, res) {
  const BOT_TOKEN = process.env.BOT_TOKEN;
  const SECRET_TOKEN = process.env.SECRET_TOKEN;
  const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

  // ✔ Verify Secret Token (Security)
  const headerToken = req.headers["x-telegram-bot-api-secret-token"];
  if (SECRET_TOKEN && headerToken !== SECRET_TOKEN) {
    return res.status(401).json({ ok: false, error: "Invalid secret token" });
  }

  const update = req.body;

  // ✔ Respond immediately to Telegram
  res.status(200).json({ ok: true });

  // Helper to send message
  async function sendMessage(chat_id, text) {
    await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id,
        text,
        parse_mode: "HTML"
      })
    }).catch(console.error);
  }

  // Mention generator
  function mention(user) {
    if (user.username) return `@${user.username}`;
    return `<a href="tg://user?id=${user.id}">${user.first_name || "User"}</a>`;
  }

  // ================================
  // 1️⃣ new_chat_members → User Joined
  // ================================
  if (update.message?.new_chat_members) {
    const chatId = update.message.chat.id;

    for (const user of update.message.new_chat_members) {
      const name = mention(user);

      await sendMessage(
        chatId,
        `🎉 স্বাগতম ${name}!\nগ্রুপে যোগ দেওয়ার জন্য ধন্যবাদ!`
      );
    }
  }

  // ==================================
  // 2️⃣ chat_member → Joined via Invite Link
  // ==================================
  if (update.chat_member) {
    const chatId = update.chat_member.chat.id;
    const oldStatus = update.chat_member.old_chat_member.status;
    const newStatus = update.chat_member.new_chat_member.status;

    const user = update.chat_member.new_chat_member.user;

    // Old: left/kicked → New: member
    if ((oldStatus === "left" || oldStatus === "kicked") && newStatus === "member") {
      await sendMessage(
        chatId,
        `🎉 স্বাগতম ${mention(user)}!\nআপনি গ্রুপে সফলভাবে যোগ দিয়েছেন!`
      );
    }
  }
}
