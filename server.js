const express = require('express');
const cron = require('node-cron');
const fetch = require('node-fetch');
const fs = require('fs');
const app = express();
app.use(express.json());

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'abc123';
const PORT = process.env.PORT || 3000;

// Set up Get Started button + greeting when server starts
function setupMessenger() {
  fetch(`https://graph.facebook.com/v2.6/me/messenger_profile?access_token=${PAGE_ACCESS_TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      "get_started": { "payload": "GET_STARTED" },
      "greeting": [
        {
          "locale": "default",
          "text": "Hey gorgeous! 💕 Tap Get Started to chat with us!"
        }
      ]
    })
  })
  .then(r => r.json())
  .then(data => console.log('Messenger setup:', data))
  .catch(err => console.error('Setup error:', err));
}

// Test endpoint
app.get('/', (req, res) => {
  res.send('Bot is running! ✅');
});

// Facebook webhook verification
app.get('/webhook', (req, res) => {
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  console.log('Token received:', token);
  console.log('Token expected:', VERIFY_TOKEN);
  if (token === VERIFY_TOKEN) {
    console.log('Verification SUCCESS ✅');
    res.status(200).send(challenge);
  } else {
    console.log('Verification FAILED ❌');
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

      // Fan tapped Get Started
      if (event.postback && event.postback.payload === 'GET_STARTED') {
        sendMessage(psid, "Hey gorgeous! 💕 So happy you're here!");
        setTimeout(() => {
          sendCard(psid);
        }, 1000);

      // Fan sent a message
      } else if (event.message) {
        sendMessage(psid, "Hey beautiful! 💕 Message me on WhatsApp 👇");
        setTimeout(() => {
          sendCard(psid);
        }, 1000);
      }
    });
    res.status(200).send('EVENT_RECEIVED');
  } else {
    res.sendStatus(404);
  }
});

// Send plain text message
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

// Send image card with WhatsApp button
function sendCard(psid) {
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
            elements: [
              {
                title: "Heyy darling 💕",
                subtitle: "I'm on WhatsApp... lets talk",
                image_url: "https://i.imgur.com/your-image.jpg",
                buttons: [
                  {
                    type: "web_url",
                    url: "https://wa.me/YOUR_WHATSAPP_NUMBER",
                    title: "WHATSAPP 📞"
                  }
                ]
              }
            ]
          }
        }
      }
    })
  })
  .then(r => r.json())
  .then(data => console.log('Card sent:', data))
  .catch(err => console.error('Card error:', err));
}

// Save fan PSID
function saveFan(psid) {
  let fans = loadFans();
  if (!fans.includes(psid)) {
    fans.push(psid);
    fs.writeFileSync('fans.json', JSON.stringify(fans));
    console.log('New fan saved:', psid, '| Total:', fans.length);
  }
}

// Load fans
function loadFans() {
  try {
    return JSON.parse(fs.readFileSync('fans.json', 'utf8'));
  } catch {
    return [];
  }
}

// Daily broadcast at 7:30 AM
cron.schedule('30 7 * * *', () => {
  console.log('🔔 Running daily broadcast...');
  let fans = loadFans();
  console.log('Sending to', fans.length, 'fans');
  fans.forEach((psid, i) => {
    setTimeout(() => {
      sendMessage(psid, "Good morning! 💕 Thinking of you today...");
      setTimeout(() => sendCard(psid), 1000);
    }, i * 2000);
  });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  setupMessenger(); // Sets up Get Started button automatically
});
