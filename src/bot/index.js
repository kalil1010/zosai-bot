const { Telegraf } = require('telegraf');
const keyboards = require('./keyboards');
const Redis = require('redis');
require('dotenv').config();

// SECURE: Bot token from environment
const bot = new Telegraf(process.env.BOT_TOKEN);
const SUPER_ADMIN_ID = process.env.SUPER_ADMIN_TELEGRAM_ID;

// SECURE: Redis connection (optional, fallback to in-memory)
let redisClient = null;
try {
  if (process.env.REDIS_URL) {
    redisClient = Redis.createClient({ url: process.env.REDIS_URL });
    redisClient.connect().catch(err => {
      console.warn('⚠️ Redis unavailable, using memory sessions:', err.message);
    });
  }
} catch {
  console.warn('📝 Redis not configured, using memory sessions');
}

const rateLimits = new Map();
const sessionStorage = new Map();

// Rate limiting & session middleware
bot.use(async (ctx, next) => {
  const uid = ctx.from?.id?.toString();
  if (!uid) return next();

  // Rate limiting (30 req/min per user)
  const history = rateLimits.get(uid) || [];
  const cutoff = Date.now() - 60000;
  const recent = history.filter(ts => ts > cutoff);
  if (recent.length >= 30) {
    return ctx.reply('⚠️ Too many requests. Wait a bit.');
  }
  recent.push(Date.now());
  rateLimits.set(uid, recent);

  // Session load
  try {
    if (redisClient && redisClient.isReady) {
      const data = await redisClient.get(`session:${uid}`);
      ctx.session = data ? JSON.parse(data) : {};
    } else {
      ctx.session = sessionStorage.get(uid) || {};
    }
  } catch {
    ctx.session = {};
  }
  ctx.session.telegram_id = uid;
  ctx.session.username = ctx.from.username;

  await next();

  // Session save
  try {
    if (redisClient && redisClient.isReady) {
      await redisClient.setex(`session:${uid}`, 3600, JSON.stringify(ctx.session));
    } else {
      sessionStorage.set(uid, ctx.session);
    }
  } catch {}
});

// /start command
bot.start(ctx => ctx.reply('Bot is working!'));

// Role handlers
bot.action('role_customer', async ctx => {
  ctx.session.role = 'customer';
  await ctx.editMessageText('Welcome Customer!', keyboards.customerMenu);
});
bot.action('role_store_owner', async ctx => {
  ctx.session.role = 'store_owner';
  await ctx.editMessageText('Welcome Store Owner!', keyboards.storeOwnerMenu);
});
bot.action('role_shipper', async ctx => {
  ctx.session.role = 'shipper';
  await ctx.editMessageText('Welcome Shipper!', keyboards.shipperMenu);
});
bot.action('role_admin', async ctx => {
  const uid = ctx.from.id.toString();
  if (uid !== SUPER_ADMIN_ID) {
    return ctx.editMessageText('❌ Access denied. Super admin only.', keyboards.roleSelection);
  }
  ctx.session.role = 'super_admin';
  await ctx.editMessageText('👑 Welcome Super Admin!', keyboards.adminMenu);
});

// Webhook payload handler
bot.webhookCallback = bot.webhookCallback.bind(bot);

// Export bot instance
module.exports = bot;
