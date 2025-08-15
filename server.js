require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');

// Global error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

const bot = require('./src/bot/index');

if (!process.env.BOT_TOKEN) {
  console.error('❌ BOT_TOKEN is required. Set it in Railway Variables.');
  process.exit(1);
}

const app = express();
app.use(bodyParser.json());

// Health check route
app.get('/healthz', (_, res) => res.send('OK'));

// Telegram webhook - use Telegraf's built-in webhook callback
app.use(bot.webhookCallback('/webhook'));

// CRITICAL: bind to 0.0.0.0 for Railway
const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 ZOSAI Server listening on 0.0.0.0:${PORT}`);
});
