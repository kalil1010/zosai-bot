const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// ============================================
// 🔐 SECURITY VALIDATION
// ============================================
const requiredEnvVars = ['BOT_TOKEN', 'SUPER_ADMIN_TELEGRAM_ID', 'WEBHOOK_URL'];
const missingVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingVars.length) {
  console.error(`❌ CRITICAL ERROR: Missing environment variables: ${missingVars.join(', ')}`);
  process.exit(1);
}
console.log('🔐 Environment variables validated');
console.log(`🛡️ Super Admin ID: ${process.env.SUPER_ADMIN_TELEGRAM_ID}`);

const bot = require('./src/bot');
const apiRoutes = require('./src/api/routes');
const { connectDatabase } = require('./src/config/database');
const { errorHandler } = require('./src/api/middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

console.log('🤖 Starting SECURE ZOSAI Bot...');
console.log('🔒 Security Level: ENTERPRISE GRADE');

// ============================================
// 🛡️ SECURITY MIDDLEWARE
// ============================================
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  }
}));
app.use(cors({ origin: (o, cb) => cb(null, true), credentials: true }));
app.use(compression());
app.use(morgan('combined'));

// ============================================
// 🚦 RATE LIMITING
// ============================================
app.use(rateLimit({
  windowMs: 15*60*1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false
}));
app.use('/api', rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 900000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  skip: req => req.headers['x-admin-token'] === process.env.SUPER_ADMIN_TELEGRAM_ID
}));

// ============================================
// 🔧 PARSING & SECURITY HEADERS
// ============================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use((req, res, next) => {
  res.set({
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff'
  });
  next();
});
app.use('/uploads', (req, res, next) => {
  if (req.url.includes('..')) return res.status(403).json({ error: 'Invalid path' });
  next();
}, express.static('uploads'));

// ============================================
// 🌐 API ENDPOINTS
// ============================================
app.get('/', (req, res) => {
  res.json({ name:'ZOSAI', version:'1.0.0', timestamp:new Date().toISOString() });
});
app.get('/health', (req, res) => {
  res.json({ status:'healthy', uptime:process.uptime(), timestamp:new Date().toISOString() });
});
app.use('/api', apiRoutes);

// ============================================
// 🔗 WEBHOOK ENDPOINT
// ============================================
app.post(
  '/webhook',
  express.json(),
  rateLimit({ windowMs:60*1000, max:30 }),
  bot.webhookCallback('/webhook')
);

// ============================================
// 🚫 ERROR HANDLING
// ============================================
app.use((req, res) => res.status(404).json({ error:'Not found' }));
app.use(errorHandler);

// ============================================
// 🚀 SERVER STARTUP
// ============================================
async function start() {
  try {
    await connectDatabase();
    console.log('✅ Database connected');
    if (process.env.NODE_ENV === 'production') {
      console.log('🌐 Set webhook manually:');
      console.log(`curl -X POST "https://api.telegram.org/bot${process.env.BOT_TOKEN}/setWebhook?url=${process.env.WEBHOOK_URL}"`);
    } else {
      await bot.launch();
      console.log('✅ Bot started in polling mode');
    }
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  } catch (err) {
    console.error('❌ Startup error:', err);
    process.exit(1);
  }
}
['SIGINT','SIGTERM'].forEach(sig => process.once(sig, () => process.exit(0)));
start();
