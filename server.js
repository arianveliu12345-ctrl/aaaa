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
const MY_NAME = "Altin";
const MY_WHATSAPP = "https://photos.theviralbox.info/archives/1441";
const MY_PHOTOS = [
  "https://i.imgur.com/2J3Jne9.png",
  "https://i.imgur.com/0gCjxrP.png",
  "https://i.imgur.com/aDQ1ScR.png",
  "https://i.imgur.com/MHT57vc.png",
];
// ============================================

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

function getTodaysPhoto() {
  const dayOfYear = Math.floor(
    (new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000
  );
  return MY_PHOTOS[dayOfYear % MY_PHOTOS.length];
}

function setupMessenger() {
  fetch(`https://graph.facebook.com/v2.6/me/messenger_profile?access_token=${PAGE_ACCESS_TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      "get_started": { "payload": "GET_STARTED" },
      "greeting": [{ "locale": "default", "text": `Hey gorgeous! 💕 Tap Get Started to chat with ${MY_NAME}!` }]
    })
  })
  .then(r => r.json())
  .then(data => console.log('Messenger setup:', data))
  .catch(err => console.error('Setup error:', err));
}

app.get('/', (req, res) => {
  let fans = loadFans();
  let today = getTodaysMessage();
  res.send(`
    <h2>✅ Bot is running!</h2>
    <h3>Total fans saved: ${fans.length}</h3>
    <h3>Today's message:</h3>
    <p>${today.text}</p>
    <p>${today.subtitle}</p>
    <h3>Today's photo:</h3>
    <img src="${getTodaysPhoto()}" style="max-width:300px"/>
  `);
});

app.get('/webhook', (req, res) => {
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (token === VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

app.post('/webhook', (req, res) => {
  let body = req.body;
  if (body.object === 'page') {
    body.entry.forEach(entry => {
      let event = entry.messaging[0];
      let psid = event.sender.id;

      const isNewFan = !isFanSaved(psid);
      saveFan(psid);

      if (event.postback && event.postback.payload === 'GET_STARTED') {
        sendMessage(psid, `Hey gorgeous! 💕 So happy you're here! ${MY_NAME}`);
        setTimeout(() => sendCard(psid, `Heyy darling 💕 ${MY_NAME}`, `I'm on WhatsApp... lets talk ${MY_NAME}`), 1000);

      } else if (event.message && isNewFan) {
        sendMessage(psid, `Hey beautiful! 💕 Message me on WhatsApp 👇`);
        setTimeout(() => sendCard(psid, `Heyy darling 💕 ${MY_NAME}`, `I'm on WhatsApp... lets talk ${MY_NAME}`), 1000);
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
              image_url: getTodaysPhoto(),
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

function isFanSaved(psid) {
  let fans = loadFans();
  return fans.includes(psid);
}

cron.schedule('30 7 * * *', () => {
  console.log('🔔 Running daily broadcast...');
  let fans = loadFans();
  let today = getTodaysMessage();
  console.log('Sending to', fans.length, 'fans');
  fans.forEach((psid, i) => {
    setTimeout(() => {
      sendMessage(psid, today.text);
      setTimeout(() => sendCard(psid, `Heyy darling 💕 ${MY_NAME}`, today.subtitle), 1500);
    }, i * 2000);
  });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  setupMessenger();
});
