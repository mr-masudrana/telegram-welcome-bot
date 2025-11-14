// index.js
import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";

dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN;
const SECRET_TOKEN = process.env.SECRET_TOKEN; // webhook secret token
const PORT = process.env.PORT || 3000;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

if (!BOT_TOKEN) {
  console.error("BOT_TOKEN is required in .env");
  process.exit(1);
}

const app = express();
app.use(bodyParser.json());

// Helper to send message
async function sendMessage(chat_id, text, extra = {}) {
  const payload = {
    chat_id,
    text,
    parse_mode: "HTML",
    ...extra,
  };

  const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!data.ok) {
    console.error("sendMessage error:", data);
  }
  return data;
}

// Create friendly mention (HTML) for a user
function mentionHTML(user) {
  const name = `${user.first_name || ""}${user.last_name ? " " + user.last_name : ""}`.trim() || "User";
  if (user.username) {
    return `@${user.username}`;
  } else {
    // tg://user?id=... link works as mention
    return `<a href="tg://user?id=${user.id}">${escapeHtml(name)}</a>`;
  }
}

// Basic HTML escape for plain text inside tags
function escapeHtml(text = "") {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Webhook endpoint
app.post("/webhook", async (req, res) => {
  // Optional security: verify Telegram secret token header if you set it when calling setWebhook
  const headerSecret = req.get("x-telegram-bot-api-secret-token");
  if (SECRET_TOKEN && headerSecret !== SECRET_TOKEN) {
    console.warn("Invalid secret token header");
    return res.status(401).send("invalid secret");
  }

  const update = req.body;
  // quick ACK
  res.sendStatus(200);

  try {
    // 1) message.new_chat_members — classic join via add or join
    if (update.message && Array.isArray(update.message.new_chat_members) && update.message.new_chat_members.length) {
      const chatId = update.message.chat.id;
      for (const newUser of update.message.new_chat_members) {
        const mention = mentionHTML(newUser);
        const welcomeText = `স্বাগতম ${mention}!\n\nআমরা আনন্দিত তুমি এখানে যোগ দিয়েছো। নিজের পরিচয় দিন এবং নিয়মগুলো পড়ে নাও।`;
        await sendMessage(chatId, welcomeText, { disable_web_page_preview: true });
      }
    }

    // 2) chat_member update — when user's chat status changed (e.g., joined via invite link)
    else if (update.chat_member) {
      const chatId = update.chat_member.chat.id;
      const oldStatus = update.chat_member.old_chat_member.status;
      const newStatus = update.chat_member.new_chat_member.status;
      const user = update.chat_member.new_chat_member.user;

      // If previously left/kicked and now member => treat as join
      const becameMember = (oldStatus === "left" || oldStatus === "kicked") && newStatus === "member";
      // Also consider if newStatus is "member" and oldStatus not "member" (safer)
      const joined = (oldStatus !== "member") && (newStatus === "member");

      if (becameMember || joined) {
        const mention = mentionHTML(user);
        const welcomeText = `স্বাগতম ${mention}!\n\nকমিউনিটিতে তোমাকে স্বাগতম — আশা করি ভালো লাগবে। দয়া করে নিয়ম পড়ে নাও।`;
        await sendMessage(chatId, welcomeText, { disable_web_page_preview: true });
      }
    }

    // (Optional) other update types can be handled here

  } catch (err) {
    console.error("Error handling update:", err);
  }
});

app.listen(PORT, () => {
  console.log(`Bot webhook listener running on port ${PORT}`);
  console.log("Make sure you set Telegram webhook to: https://<your-domain>/webhook");
});
