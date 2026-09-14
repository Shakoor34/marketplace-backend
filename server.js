const express = require("express");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());

const {
FB_APP_ID,
FB_APP_SECRET,
FB_PAGE_ID,
FB_PAGE_ACCESS_TOKEN,
FB_VERIFY_TOKEN,
PORT = 3000,
} = process.env;

app.get("/ ", (req, res) => {
res.send("Marketplace backend is running.");
});
app.get("/-webhook", (req, res) => {
const mode = req.query["hub.mode"];
const token = req.query["hub.verify_token"];
const challenge = req.query["hub.challenge"];

if (mode === "subscribe" && token === FB_VERIFY_TOKEN) {
console.log("Webhook verified.");
res.status(200).send(challenge);
} else {
res.sendStatus(403);
}
});
app.post("/webhook", async (req, res) => {
  const body = req.body;

  if (body.object === "page") {
    for (const entry of body.entry || []) {
      for (const event of entry.messaging || []) {
        const senderId = event.sender?.id;
        const messageText = event.message?.text;
        if (senderId && messageText) {
          console.log(`Message from ${senderId}: ${messageText}`);
          const aiReply = generateAIReply(messageText);
          await sendMessage(senderId, aiReply);
        }
      }
    }
    res.status(200).send("EVENT_RECEIVED");
  } else {
    res.sendStatus(404);
  }
});
function generateAIReply(text) {
  const lower = text.toLowerCase();
  if (lower.includes("price") || lower.includes("kitne") || lower.includes("qeemat")) {
    return "Thanks for your interest! Please share the item name and I will confirm the price and availability right away.";
  }
  if (lower.includes("available") || lower.includes("stock")) {
    return "Yes, it is currently available. Would you like to arrange pickup or delivery?";
  }
  if (lower.includes("deliver") || lower.includes("shipping")) {
    return "We can arrange delivery within the city. Could you share your area/location?";
  }
  return "Thanks for reaching out! One of our team members will get back to you shortly with more details.";
}

async function sendMessage(recipientId, text) {
  const url = `https://graph.facebook.com/v19.0/me/messages?access_token=${FB_PAGE_ACCESS_TOKEN}`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text },
      }),
    });
    const data = await response.json();
    console.log("Send API response:", data);
  } catch (err) {
    console.error("Error sending message:", err);
  }
}
app.post("/publish-listing", async (req, res) => {
  const { title, price, description, imageUrl, category } = req.body;

  const url = `https://graph.facebook.com/v19.0/${FB_PAGE_ID}/commerce_products?access_token=${FB_PAGE_ACCESS_TOKEN}`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: title,
        price: `${price} PKR`,
        description,
        image_url: imageUrl,
        category,
        availability: "in stock",
      }),
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("Error publishing listing:", err);
    res.status(500).json({ error: "Failed to publish listing" });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening 24/7 on port ${PORT}`);
});
