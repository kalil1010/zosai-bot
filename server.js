const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const bot = require('./src/bot');
const apiRoutes = require('./src/api/routes');
const { connectDatabase } = require('./src/config/database');
const { errorHandler } = require('./src/api/middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

console.log('🤖 Starting ZOSAI - AI Fashion Marketplace Bot...');
console.log('🚀 Bot Username: @zosai_bot');
console.log('🎯 Brand: ZOSAI - Fashion Powered by AI');

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  }
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

app.use(compression());
app.use(morgan('combined'));

// Rate limiting for ZOSAI API
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: {
    error: 'Too many requests to ZOSAI API',
    message: 'Please try again later.',
    brand: 'ZOSAI - AI Fashion Marketplace'
  }
});
app.use('/api', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files for ZOSAI uploads
app.use('/uploads', express.static('uploads'));

// ZOSAI Brand info endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'ZOSAI - AI Fashion Marketplace',
    version: '1.0.0',
    description: 'AI-powered Telegram bot for fashion marketplace',
    bot: '@zosai_bot',
    website: 'https://zosai.ai',
    tagline: 'Fashion Powered by AI',
    features: [
      'AI Color Analysis',
      'Location-based Store Discovery',
      'Personalized Recommendations',
      'QR Code Inventory Management',
      'Loyalty Program',
      'Real-time Order Tracking'
    ],
    status: 'active',
    timestamp: new Date().toISOString()
  });
});

// Health check for ZOSAI
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ZOSAI is running perfectly! 🤖',
    bot: 'zosai_bot',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// ZOSAI bot webhook endpoint
app.use(bot.webhookCallback('/webhook'));

// ZOSAI API routes
app.use('/api', apiRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: 'This ZOSAI API endpoint does not exist',
    bot: '@zosai_bot',
    website: 'https://zosai.ai'
  });
});

// Error handling middleware
app.use(errorHandler);

// Start ZOSAI server
async function startZOSAI() {
  try {
    console.log('🔗 Connecting to ZOSAI database...');
    await connectDatabase();
    console.log('✅ ZOSAI database connected!');
    
    if (process.env.NODE_ENV === 'production') {
      console.log('🌐 Setting ZOSAI webhook...');
      await bot.telegram.setWebhook(`${process.env.WEBHOOK_URL}/webhook`);
      console.log('✅ ZOSAI webhook set successfully!');
    } else {
      console.log('🔄 Starting ZOSAI in polling mode...');
      await bot.launch();
      console.log('✅ ZOSAI bot started in development mode!');
    }
    
    app.listen(PORT, () => {
      console.log('🚀 ZOSAI server running on port', PORT);
      console.log('🤖 ZOSAI bot is now live and ready to serve customers!');
      console.log('📱 Users can start chatting with @zosai_bot');
      console.log('🌐 API available at:', process.env.WEBHOOK_URL || `http://localhost:${PORT}`);
      console.log('✨ ZOSAI - Fashion Powered by AI ✨');
    });
  } catch (error) {
    console.error('❌ Failed to start ZOSAI server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.once('SIGINT', () => {
  console.log('🛑 Shutting down ZOSAI gracefully...');
  bot.stop('SIGINT');
});

process.once('SIGTERM', () => {
  console.log('🛑 Shutting down ZOSAI gracefully...');
  bot.stop('SIGTERM');
});

startZOSAI();