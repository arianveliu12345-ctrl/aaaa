const express = require('express');
const cron = require('node-cron');
const fetch = require('node-fetch');
const fs = require('fs');
const app = express();
app.use(express.json());

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'abc123';
const PORT = process.env.PORT || 3000;

// Test endpoint - visit this to confirm server is running
app.get('/', (req, res) => {
  res.send('Bot is running! ✅');
});

// Facebook webhook verification
app.get('/webhook', (req, res) => {
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  console.log('===== WEBHOOK VERIFY =====');
  console.log('Token received:', token);
  console.log('Token expected:', VERIFY_TOKEN);
  console.log('Match:', token === VERIFY_TOKEN);
  if (token === VERIFY_TOKEN) {
    console.log('Verification SUCCESS');
    res.status(200).send(challenge);
  } else {
    console.log('Verification FAILED');
    res.sendStatus(403);
  }
});

// Receive messages from Facebook
app.post('/webhook', (req, res) => {
  let body = req.body;
  console.log('Incoming webhook:', JSON.stringify(body));
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

// Save fan PSID to file
function saveFan(psid) {
  let fans = loadFans();
  if (!fans.includes(psid)) {
    fans.push(psid);
    fs.writeFileSync('fans.json', JSON.stringify(fans));
    console.log('New fan saved:', psid);
  }
}

// Load all fans from file
function loadFans() {
  try {
    return JSON.parse(fs.readFileSync('fans.json', 'utf8'));
  } catch {
    return [];
  }
}

// Send a message to a fan
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

// Daily broadcast at 7:30 AM every day
cron.schedule('30 7 * * *', () => {
  console.log('Running daily broadcast...');
  let fans = loadFans();
  console.log('Sending to', fans.length, 'fans');
  fans.forEach((psid, i) => {
    setTimeout(() => {
      sendMessage(psid, "Good morning! 💕 Thinking of you today...");
    }, i * 1000);
  });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`✅ VERIFY_TOKEN is: ${VERIFY_TOKEN}`);
});
