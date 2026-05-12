const express = require('express');
const cron = require('node-cron');
const fetch = require('node-fetch');
const fs = require('fs');
const app = express();
app.use(express.json());

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const PORT = process.env.PORT || 3000;

app.get('/webhook', (req, res) => {
  if (req.query['hub.verify_token'] === VERIFY_TOKEN) {
    res.send(req.query['hub.challenge']);
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
      saveFan(psid);
      if (event.postback || event.message) {
        sendMessage(psid, "Hey gorgeous! 💕 Thanks for reaching out. Message me on WhatsApp 👇");
      }
    });
    res.status(200).send('EVENT_RECEIVED');
  } else {
    res.sendStatus(404);
  }
});

function saveFan(psid) {
  let fans = loadFans();
  if (!fans.includes(psid)) {
    fans.push(psid);
    fs.writeFileSync('fans.json', JSON.stringify(fans));
  }
}

function loadFans() {
  try { return JSON.parse(fs.readFileSync('fans.json', 'utf8')); }
  catch { return []; }
}

function sendMessage(psid, text) {
  fetch(`https://graph.facebook.com/v2.6/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipient: { id: psid }, message: { text } })
  });
}

cron.schedule('30 7 * * *', () => {
  let fans = loadFans();
  fans.forEach((psid, i) => {
    setTimeout(() => sendMessage(psid, "Good morning! 💕 Thinking of you today..."), i * 1000);
  });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
