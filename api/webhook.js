// api/webhook.js

export default async function handler(req, res) {
  const BOT_TOKEN = process.env.BOT_TOKEN;
  const SECRET_TOKEN = process.env.SECRET_TOKEN;
  const API = `https://api.telegram.org/bot${BOT_TOKEN}`;

  // Security Check
  const headerToken = req.headers["x-telegram-bot-api-secret-token"];
  if (SECRET_TOKEN && headerToken !== SECRET_TOKEN) {
    return res.status(401).json({ ok: false, error: "Invalid secret token" });
  }

  const update = req.body;
  res.status(200).json({ ok: true });

  // Send Message Helper
  async function sendMessage(chat_id, text) {
    try {
      await fetch(`${API}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id,
          text,
          parse_mode: "HTML"
        })
      });
    } catch (e) {
      console.error("sendMessage error:", e);
    }
  }

  // Optional Sticker
  async function sendSticker(chat_id, file_id) {
    await fetch(`${API}/sendSticker`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id, sticker: file_id })
    });
  }

  // Optional Photo
  async function sendPhoto(chat_id, photoUrl, caption) {
    await fetch(`${API}/sendPhoto`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id,
        photo: photoUrl,
        caption,
        parse_mode: "HTML"
      })
    });
  }

  // Create mention name
  function mention(user) {
    if (user.username) return `@${user.username}`;
    return `<a href="tg://user?id=${user.id}">${user.first_name || "User"}</a>`;
  }

  // 🌟 Clean, minimal welcome text
  function welcomeText(user, groupName) {
    const username = user.username ? `@${user.username}` : "Not set";
    return `
🎉 Welcome, ${mention(user)}!

👤 Username: ${username}
🆔 User ID: ${user.id}
🏠 Group: ${groupName}

আপনাকে আমাদের গ্রুপে পেয়ে আমরা আনন্দিত!  
আশা করি আমাদের সঙ্গে আপনার সময়টা সুন্দর কাটবে। 😊
`;
  }

  // ================================
  // 1️⃣ NEW MEMBER via new_chat_members
  // ================================
  if (update.message?.new_chat_members) {
    const chatId = update.message.chat.id;
    const groupName = update.message.chat.title || "This Group";

    for (const user of update.message.new_chat_members) {
      // Optional Sticker
      await sendSticker(chatId, "CAACAgUAAxkBAAEIYvZlMd8eqN3W6"); // চাইলে পরিবর্তন বা বন্ধ করতে পারেন

      // Optional Photo (OFF by default)
      // await sendPhoto(chatId, "https://i.imgur.com/xyz.png", welcomeText(user, groupName));

      await sendMessage(chatId, welcomeText(user, groupName));
    }
  }

  // =====================================================
  // 2️⃣ Via chat_member → joined from invite link / approval
  // =====================================================
  if (update.chat_member) {
    const chatId = update.chat_member.chat.id;
    const groupName = update.chat_member.chat.title || "This Group";

    const oldStatus = update.chat_member.old_chat_member.status;
    const newStatus = update.chat_member.new_chat_member.status;

    const user = update.chat_member.new_chat_member.user;

    if ((oldStatus === "left" || oldStatus === "kicked") && newStatus === "member") {
      await sendSticker(chatId, "CAACAgUAAxkBAAEIYvZlMd8eqN3W6");

      await sendMessage(chatId, welcomeText(user, groupName));
    }
  }
                                         }
