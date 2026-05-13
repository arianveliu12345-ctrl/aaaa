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
// CUSTOMIZE THESE 2 THINGS:
const MY_PHOTO = "https://i.imgur.com/your-image.jpg"; // your photo URL
const MY_WHATSAPP = "https://wa.me/355XXXXXXXXX"; // your WhatsApp number
// ============================================

// Rotating daily messages
const DAILY_MESSAGES = [
  { text: "Hey gorgeous! 💕 Thinking of you today...", subtitle: "I'm on WhatsApp... lets talk" },
  { text: "Good morning beautiful! 🌸 Miss you...", subtitle: "Come chat with me on WhatsApp 💬" },
  { text: "Hey darling! 💋 How are you today?", subtitle: "Message me on WhatsApp... I'm waiting 😊" },
  { text: "Hi sweetheart! ❤️ Just thinking of you...", subtitle: "Let's talk on WhatsApp today 👇" },
  { text: "Good morning! ☀️ You crossed my mind today...", subtitle: "Come find me on WhatsApp 💕" },
  { text: "Hey you! 💕 Don't be a stranger...", subtitle: "I'm on WhatsApp... come say hi 👋" },
  { text: "Morning gorgeous! 🌺 Hope you're having a great day...", subtitle: "Let's chat on WhatsApp 💬" },
  { text: "Hey baby! 💕 Just woke up thinking of you...", subtitle: "Talk to me on WhatsApp 😘" },
  { text: "Good morning! 💋 You make me smile...", subtitle: "Come chat on WhatsApp today 💕" },
  { text: "Hey handsome! ❤️ Another day, another reason to smile...", subtitle: "Message me on WhatsApp 👇" }
];

function getTodaysMessage() {
  const dayOfYear = Math.floor(
    (new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000
  );
  return DAILY_MESSAGES[dayOfYear % DAILY_MESSAGES.length];
}

function setupMessenger() {
  fetch(`https://graph.facebook.com/v2.6/me/messenger_profile?access_token=${PAGE_ACCESS_TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      "get_started": { "payload": "GET_STARTED" },
      "greeting": [{ "locale": "default", "text": "Hey gorgeous! 💕 Tap Get Started to chat with us!" }]
    })
  })
  .then(r => r.json())
  .then(data => console.log('Messenger setup:', data))
  .catch(err => console.error('Setup error:', err));
}

// Check fans in browser
app.get('/', (req, res) => {
  let fans = loadFans();
  let today = getTodaysMessage();
  res.send(`
    <h2>✅ Bot is running!</h2>
    <h3>Total fans saved: ${fans.length}</h3>
    <h3>Tomorrow's message:</h3>
    <p>${today.text}</p>
    <p>${today.subtitle}</p>
  `);
});

// Webhook verification
app.get('/webhook', (req, res) => {
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (token === VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Receive messages
app.post('/webhook', (req, res) => {
  let body = req.body;
  if (body.object === 'page') {
    body.entry.forEach(entry => {
      let event = entry.messaging[0];
      let psid = event.sender.id;
      saveFan(psid);

      if (event.postback && event.postback.payload === 'GET_STARTED') {
        sendMessage(psid, "Hey gorgeous! 💕 So happy you're here!");
        setTimeout(() => sendCard(psid, "Heyy darling ❤️", "I'm on WhatsApp... lets talk"), 1000);

      } else if (event.message) {
        sendMessage(psid, "Hey beautiful! 💕 Message me on WhatsApp 👇");
        setTimeout(() => sendCard(psid, "Heyy darling ❤️", "I'm on WhatsApp... lets talk"), 1000);
      }
    });
    res.status(200).send('EVENT_RECEIVED');
  } else {
    res.sendStatus(404);
  }
});

function sendMessage(psid, text) {
  fetch(`https://graph.facebook.com/v2.6/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { id: psid },
      message: { text: text }
    })
  })
  .then(r => r.json())
  .then(data => console.log('Message sent:', data))
  .catch(err => console.error('Send error:', err));
}

function sendCard(psid, title, subtitle) {
  fetch(`https://graph.facebook.com/v2.6/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { id: psid },
      message: {
        attachment: {
          type: "template",
          payload: {
            template_type: "generic",
            elements: [{
              title: title,
              subtitle: subtitle,
              image_url: MY_PHOTO,
              buttons: [{
                type: "web_url",
                url: MY_WHATSAPP,
                title: "WHATSAPP 📞"
              }]
            }]
          }
        }
      }
    })
  })
  .then(r => r.json())
  .then(data => console.log('Card sent:', data))
  .catch(err => console.error('Card error:', err));
}

function saveFan(psid) {
  let fans = loadFans();
  if (!fans.includes(psid)) {
    fans.push(psid);
    fs.writeFileSync('fans.json', JSON.stringify(fans));
    console.log('New fan saved:', psid, '| Total:', fans.length);
  }
}

function loadFans() {
  try { return JSON.parse(fs.readFileSync('fans.json', 'utf8')); }
  catch { return []; }
}

// Daily broadcast at 7:30 AM
cron.schedule('30 7 * * *', () => {
  console.log('🔔 Running daily broadcast...');
  let fans = loadFans();
  let today = getTodaysMessage();
  console.log('Sending to', fans.length, 'fans');
  fans.forEach((psid, i) => {
    setTimeout(() => {
      sendMessage(psid, today.text);
      setTimeout(() => sendCard(psid, "Heyy darling ❤️", today.subtitle), 1500);
    }, i * 2000);
  });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  setupMessenger();
});
