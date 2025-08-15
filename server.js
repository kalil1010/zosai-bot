require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');

// Use the main bot logic from src/bot/index.js
const bot = require('./src/bot/index');

if (!process.env.BOT_TOKEN) {
  console.error('❌ BOT_TOKEN is required. Set it in Railway Variables.');
  process.exit(1);
}

const app = express();
app.use(bodyParser.json());

// Health check route
app.get('/healthz', (_, res) => res.send('OK'));

// Telegram webhook
app.post('/webhook', async (req, res) => {
  res.sendStatus(200);
  try {
    await bot.handleUpdate(req.body);
  } catch (err) {
    console.error('Error processing update:', err);
  }
});

// Optionally, expose your API routes if needed
// const apiRoutes = require('./src/api/routes');
// app.use('/api', apiRoutes);

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});