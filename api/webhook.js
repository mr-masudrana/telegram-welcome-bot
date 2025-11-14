// api/webhook.js

export default async function handler(req, res) {
  const BOT_TOKEN = process.env.BOT_TOKEN;
  const SECRET_TOKEN = process.env.SECRET_TOKEN;

  const API = `https://api.telegram.org/bot${BOT_TOKEN}`;

  // Verify secret token for security
  const headerToken = req.headers["x-telegram-bot-api-secret-token"];
  if (SECRET_TOKEN && headerToken !== SECRET_TOKEN) {
    return res.status(401).json({ ok: false, error: "Invalid secret token" });
  }

  const update = req.body;
  res.status(200).json({ ok: true }); // ACK

  // ============================
  // Helper: Send Message
  // ============================
  async function sendMessage(chat_id, text, buttons = null) {
    const payload = {
      chat_id,
      text,
      parse_mode: "HTML"
    };

    if (buttons) {
      payload.reply_markup = { inline_keyboard: buttons };
    }

    const res = await fetch(`${API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    return res.json();
  }

  // ============================
  // Helper: Send Banner Photo
  // ============================
  async function sendBanner(chat_id, caption, buttons) {
    const res = await fetch(`${API}/sendPhoto`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id,
        photo: "https://i.ibb.co/4YFWSjd/welcome-banner.jpg", // Custom Banner
        caption,
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: buttons }
      })
    });
    return res.json();
  }

  // ============================
  // Helper: Delete old message
  // ============================
  async function deleteMessage(chat_id, msg_id) {
    await fetch(`${API}/deleteMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id,
        message_id: msg_id
      })
    });
  }

  // Create Mention Name
  function mention(user) {
    if (user.username) return `@${user.username}`;
    return `<a href="tg://user?id=${user.id}">${user.first_name || "User"}</a>`;
  }

  // ================================
  // Welcome Text Template
  // ================================
  function welcomeText(user, groupName) {
    const username = user.username ? `@${user.username}` : "Not set";

    return `
🎉 Welcome, ${mention(user)}!

👤 Username: ${username}
🆔 User ID: ${user.id}
🏠 Group: ${groupName}

আমরা আনন্দিত যে আপনি আমাদের সাথে যোগ দিয়েছেন!  
নিয়মগুলো দেখে নিন এবং সবার সাথে সুন্দরভাবে কথা বলুন। 😊
`;
  }

  // ===================================================
  // 1️⃣ NEW MEMBER via new_chat_members
  // ===================================================
  if (update.message?.new_chat_members) {
    const chatId = update.message.chat.id;
    const groupName = update.message.chat.title || "This Group";

    for (const user of update.message.new_chat_members) {
      const text = welcomeText(user, groupName);

      // Inline buttons
      const buttons = [
        [{ text: "📜 Group Rules", url: "https://your-rules-link.com" }],
        [{ text: "ℹ About Group", url: "https://your-about-link.com" }]
      ];

      // Send banner image first
      const bannerMsg = await sendBanner(chatId, text, buttons);

      // Auto-delete old welcome after 2 minutes
      setTimeout(() => {
        deleteMessage(chatId, bannerMsg.result.message_id);
      }, 120000);
    }
  }

  // ===================================================
  // 2️⃣ chat_member → Joined via Invite Link
  // ===================================================
  if (update.chat_member) {
    const chatId = update.chat_member.chat.id;
    const groupName = update.chat_member.chat.title || "This Group";

    const oldS = update.chat_member.old_chat_member.status;
    const newS = update.chat_member.new_chat_member.status;

    const user = update.chat_member.new_chat_member.user;

    if ((oldS === "left" || oldS === "kicked") && newS === "member") {
      const text = welcomeText(user, groupName);

      const buttons = [
        [{ text: "📜 Group Rules", url: "https://your-rules-link.com" }],
        [{ text: "ℹ About Group", url: "https://your-about-link.com" }]
      ];

      const bannerMsg = await sendBanner(chatId, text, buttons);

      // Auto-delete after 2 min
      setTimeout(() => {
        deleteMessage(chatId, bannerMsg.result.message_id);
      }, 120000);
    }
  }
    }
