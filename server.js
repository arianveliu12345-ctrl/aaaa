const express = require('express');
const cron = require('node-cron');
const fetch = require('node-fetch');
const fs = require('fs');
const app = express();
app.use(express.json());

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'abc123';
const PORT = process.env.PORT || 3000;

// ============================================
// CUSTOMIZE THESE:
const MY_NAME = "Sarah"; // ← your name
const MY_WHATSAPP = "https://wa.me/355XXXXXXXXX"; // ← your WhatsApp
const MY_PHOTOS = [
  "https://i.imgur.com/photo1.jpg", // ← your photos
  "https://i.imgur.com/photo2.jpg",
  "https://i.imgur.com/photo3.jpg",
  "https://i.imgur.com/photo4.jpg",
  "https://i.imgur.com/photo5.jpg",
];
// ============================================

// Rotating daily messages
const DAILY_MESSAGES = [
  { text: `Hey gorgeous! 💕 Thinking of you... ${MY_NAME}`, subtitle: `I'm on WhatsApp... lets talk ${MY_NAME}` },
  { text: `Good morning beautiful! 🌸 Miss you... ${MY_NAME}`, subtitle: `Come chat with me ${MY_NAME} 💬` },
  { text: `Hey darling! 💋 How are you today? ${MY_NAME}`, subtitle: `Message me on WhatsApp... I'm waiting 😊 ${MY_NAME}` },
  { text: `Hi sweetheart! ❤️ Just thinking of you... ${MY_NAME}`, subtitle: `Let's talk on WhatsApp today 👇 ${MY_NAME}` },
  { text: `Good morning! ☀️ You crossed my mind... ${MY_NAME}`, subtitle: `Come find me on WhatsApp 💕 ${MY_NAME}` },
  { text: `Hey you! 💕 Don't be a stranger... ${MY_NAME}`, subtitle: `I'm on WhatsApp... come say hi 👋 ${MY_NAME}` },
  { text: `Morning gorgeous! 🌺 Hope you're having a great day... ${MY_NAME}`, subtitle: `Let's chat on WhatsApp 💬 ${MY_NAME}` },
  { text: `Hey baby! 💕 Just woke up thinking of you... ${MY_NAME}`, subtitle: `Talk to me on WhatsApp 😘 ${MY_NAME}` },
  { text: `Good morning! 💋 You make me smile... ${MY_NAME}`, subtitle: `Come chat on WhatsApp today 💕 ${MY_NAME}` },
  { text: `Hey handsome! ❤️ Another beautiful day... ${MY_NAME}`, subtitle: `Message me on WhatsApp 👇 ${MY_NAME}` },
];

function getTodaysMessage() {
  const dayOfYear = Math.floor(
    (new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000
  );
  return DAILY_MESSAGES[dayOfYear % DAILY_MESSAGES.length];
}

function
