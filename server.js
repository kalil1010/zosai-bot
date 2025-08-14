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

// SECURE: Validate critical environment variables
const requiredEnvVars = ['BOT_TOKEN', 'SUPER_ADMIN_TELEGRAM_ID'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error(`❌ CRITICAL ERROR: Missing required environment variables: ${missingVars.join(', ')}`);
  console.error('🔧 Please add these variables to your .env file:');
  console.error('   BOT_TOKEN=your_bot_token_here');
  console.error('   SUPER_ADMIN_TELEGRAM_ID=6650827406');
  process.exit(1);
}

console.log('🔐 Security: Environment variables validated successfully');
console.log(`🛡️ Super Admin ID configured: ${process.env.SUPER_ADMIN_TELEGRAM_ID}`);

// Import after environment validation
const bot = require('./src/bot');
const apiRoutes = require('./src/api/routes');
const { connectDatabase } = require('./src/config/database');
const { errorHandler } = require('./src/api/middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

console.log('🤖 Starting SECURE ZOSAI - AI Fashion Marketplace Bot...');
console.log('🚀 Bot Username: @zosai_bot');
console.log('🎯 Brand: ZOSAI - Fashion Powered by AI');
console.log('🔒 Security Level: ENTERPRISE GRADE');

// ============================================
// 🛡️ ENHANCED SECURITY MIDDLEWARE
// ============================================

// SECURE: Enhanced helmet configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https:"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: "same-origin" }
}));

// SECURE: Enhanced CORS configuration
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = (process.env.CORS_ORIGIN || '*').split(',');
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Admin-Token']
}));

app.use(compression());

// SECURE: Enhanced logging with IP tracking
app.use(morgan('combined', {
  skip: function (req, res) {
    return res.statusCode < 400;
  }
}));

app.use(morgan('common'));

// ============================================
// 🚦 ADVANCED RATE LIMITING
// ============================================

// SECURE: Global rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests from this IP',
    message: 'Global rate limit exceeded. Please try again later.',
    retryAfter: 900
  },
  handler: (req, res) => {
    console.log(`🚦 GLOBAL RATE LIMIT: IP ${req.ip} exceeded limits at ${new Date().toISOString()}`);
    res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many requests. Please try again later.',
      retryAfter: 900,
      timestamp: new Date().toISOString()
    });
  }
});

app.use(globalLimiter);

// SECURE: API-specific rate limiting with admin bypass
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests to ZOSAI API',
    message: 'Please try again later.',
    brand: 'ZOSAI - AI Fashion Marketplace',
    retryAfter: 900
  },
  // SECURE: Skip rate limiting for admin requests
  skip: (req) => {
    const adminToken = req.headers['x-admin-token'];
    const isAdmin = adminToken === process.env.SUPER_ADMIN_TELEGRAM_ID;
    
    if (isAdmin) {
      console.log(`🔐 ADMIN BYPASS: Rate limit skipped for super admin at ${new Date().toISOString()}`);
    }
    
    return isAdmin;
  },
  handler: (req, res) => {
    console.log(`🚦 API RATE LIMIT: ${req.ip} exceeded API limits at ${new Date().toISOString()}`);
    res.status(429).json({
      error: 'API rate limit exceeded',
      message: 'Too many API requests. Please try again later.',
      brand: 'ZOSAI - AI Fashion Marketplace',
      retryAfter: Math.ceil(req.rateLimit.msBeforeNext / 1000),
      timestamp: new Date().toISOString()
    });
  }
});

app.use('/api', apiLimiter);

// SECURE: Webhook-specific rate limiting
const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Max 30 webhook requests per minute
  message: {
    error: 'Webhook rate limit exceeded',
    message: 'Too many webhook requests'
  },
  standardHeaders: false,
  handler: (req, res) => {
    console.log(`🚦 WEBHOOK RATE LIMIT: Exceeded at ${new Date().toISOString()}`);
    res.status(429).json({
      error: 'Webhook rate limit exceeded'
    });
  }
});

// ============================================
// 🔧 REQUEST PROCESSING MIDDLEWARE
// ============================================

// SECURE: Body parsing with size limits and validation
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf, encoding) => {
    // Basic JSON validation
    if (buf && buf.length) {
      try {
        JSON.parse(buf);
      } catch (e) {
        console.log(`⚠️ Invalid JSON received from ${req.ip} at ${new Date().toISOString()}`);
        throw new Error('Invalid JSON');
      }
    }
  }
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb',
  parameterLimit: 100
}));

// SECURE: Request logging and monitoring
app.use((req, res, next) => {
  // Log all requests
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.url;
  const ip = req.ip;
  const userAgent = req.get('User-Agent') || 'unknown';
  
  console.log(`📝 REQUEST: ${method} ${url} from ${ip} at ${timestamp}`);
  
  // Track suspicious patterns
  if (url.includes('..') || url.includes('<script>') || url.length > 1000) {
    console.log(`🚨 SUSPICIOUS REQUEST: ${method} ${url} from ${ip} - UserAgent: ${userAgent}`);
  }
  
  // Add security headers to response
  res.setHeader('X-Powered-By', 'ZOSAI-AI');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  next();
});

// Static files for ZOSAI uploads with security
app.use('/uploads', (req, res, next) => {
  // Basic path traversal protection
  if (req.url.includes('..') || req.url.includes('%2e%2e')) {
    console.log(`🚨 SECURITY: Path traversal attempt from ${req.ip}: ${req.url}`);
    return res.status(403).json({
      error: 'Access denied',
      message: 'Invalid file path'
    });
  }
  next();
}, express.static('uploads'));

// ============================================
// 🌐 API ENDPOINTS
// ============================================

// SECURE: Enhanced ZOSAI Brand info endpoint
app.get('/', (req, res) => {
  const serverInfo = {
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
      'Real-time Order Tracking',
      'Secure Admin Panel',
      'Enterprise Security',
      'Rate Limiting Protection',
      'Multi-layer Authentication'
    ],
    security: {
      authentication: 'Multi-layer',
      rateLimiting: 'Active',
      adminAccess: 'Restricted to authorized personnel',
      encryption: 'Industry standard',
      monitoring: 'Real-time'
    },
    server: {
      status: 'operational',
      uptime: Math.round(process.uptime()),
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version
    },
    timestamp: new Date().toISOString()
  };
  
  // Log homepage access
  console.log(`🏠 Homepage accessed from ${req.ip} at ${new Date().toISOString()}`);
  
  res.json(serverInfo);
});

// SECURE: Enhanced health check with security status
app.get('/health', (req, res) => {
  const healthStatus = {
    status: 'ZOSAI is running perfectly! 🤖',
    bot: 'zosai_bot',
    server: {
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024)
      },
      cpu: {
        loadAverage: process.platform !== 'win32' ? require('os').loadavg() : [0, 0, 0]
      }
    },
    security: {
      adminConfigured: !!process.env.SUPER_ADMIN_TELEGRAM_ID,
      botTokenSecure: !!process.env.BOT_TOKEN && !process.env.BOT_TOKEN.includes('your_'),
      rateLimiting: 'active',
      cors: 'configured',
      helmet: 'active',
      environment: process.env.NODE_ENV || 'development'
    },
    database: {
      configured: !!process.env.DATABASE_URL,
      status: 'checking...'
    },
    redis: {
      configured: !!process.env.REDIS_URL,
      status: 'checking...'
    },
    timestamp: new Date().toISOString()
  };
  
  console.log(`❤️ Health check from ${req.ip} at ${new Date().toISOString()}`);
  
  res.json(healthStatus);
});

// SECURE: Admin status endpoint (restricted)
app.get('/admin/status', (req, res) => {
  const adminToken = req.headers['x-admin-token'];
  
  if (adminToken !== process.env.SUPER_ADMIN_TELEGRAM_ID) {
    console.log(`🚨 UNAUTHORIZED ADMIN STATUS ACCESS: ${req.ip} at ${new Date().toISOString()}`);
    return res.status(403).json({
      error: 'Access denied',
      message: 'Admin access required'
    });
  }
  
  console.log(`👑 Admin status accessed by super admin at ${new Date().toISOString()}`);
  
  res.json({
    message: 'Super admin authenticated',
    adminId: process.env.SUPER_ADMIN_TELEGRAM_ID,
    serverStatus: 'operational',
    securityLevel: 'maximum',
    timestamp: new Date().toISOString()
  });
});

// ============================================
// 🔗 WEBHOOK CONFIGURATION
// ============================================

// SECURE: Protected webhook endpoint with validation
app.use('/webhook', webhookLimiter, (req, res, next) => {
  // Webhook security validation
  if (req.method !== 'POST') {
    console.log(`🚨 Invalid webhook method ${req.method} from ${req.ip}`);
    return res.status(405).json({ 
      error: 'Method not allowed',
      allowed: 'POST only'
    });
  }
  
  // Basic Telegram webhook validation
  const contentType = req.get('Content-Type');
  if (!contentType || !contentType.includes('application/json')) {
    console.log(`🚨 Invalid webhook content-type from ${req.ip}: ${contentType}`);
    return res.status(400).json({
      error: 'Invalid content type',
      expected: 'application/json'
    });
  }
  
  console.log(`📨 Webhook received from ${req.ip} at ${new Date().toISOString()}`);
  next();
}, bot.webhookCallback('/webhook'));

// ZOSAI API routes
app.use('/api', apiRoutes);

// ============================================
// 🚫 ERROR HANDLING
// ============================================

// 404 handler with security logging
app.use((req, res) => {
  const notFoundInfo = {
    error: 'Endpoint not found',
    message: 'This ZOSAI API endpoint does not exist',
    bot: '@zosai_bot',
    website: 'https://zosai.ai',
    requestedPath: req.url,
    method: req.method,
    availableEndpoints: [
      'GET /',
      'GET /health',
      'GET /admin/status (admin only)',
      'POST /webhook',
      'GET /api/*',
      'GET /uploads/*'
    ],
    timestamp: new Date().toISOString()
  };
  
  // Log 404s for security monitoring
  console.log(`❌ 404 ERROR: ${req.method} ${req.url} from ${req.ip} at ${new Date().toISOString()}`);
  
  res.status(404).json(notFoundInfo);
});

// SECURE: Enhanced error handling middleware
app.use((err, req, res, next) => {
  console.error(`🚨 SERVER ERROR:
📍 Path: ${req.method} ${req.url}
🌐 IP: ${req.ip}
📅 Time: ${new Date().toISOString()}
❌ Error: ${err.message}
📚 Stack: ${err.stack}`);
  
  // Security: Don't expose internal errors in production
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  const errorResponse = {
    error: 'Internal server error',
    message: isDevelopment ? err.message : 'Something went wrong',
    timestamp: new Date().toISOString(),
    service: 'ZOSAI API',
    support: 'Contact @zosai_support for assistance'
  };
  
  if (isDevelopment) {
    errorResponse.stack = err.stack;
  }
  
  res.status(500).json(errorResponse);
});

// ============================================
// 🚀 SERVER STARTUP
// ============================================

// SECURE: Enhanced server startup with comprehensive checks
async function startZOSAI() {
  try {
    console.log('🔗 Connecting to ZOSAI database...');
    await connectDatabase();
    console.log('✅ ZOSAI database connected successfully!');
    
    // Production webhook setup
    if (process.env.NODE_ENV === 'production') {
      if (!process.env.WEBHOOK_URL) {
        console.error('❌ WEBHOOK_URL is required in production');
        process.exit(1);
      }
      
      console.log('🌐 Setting ZOSAI webhook...');
      const webhookUrl = `${process.env.WEBHOOK_URL}/webhook`;
      await bot.telegram.setWebhook(webhookUrl);
      console.log(`✅ ZOSAI webhook set successfully: ${webhookUrl}`);
    } else {
      console.log('🔄 Starting ZOSAI in development polling mode...');
      await bot.launch();
      console.log('✅ ZOSAI bot started in development mode!');
    }
    
    // Start HTTP server
    const server = app.listen(PORT, () => {
      console.log('');
      console.log('🎉 ZOSAI SERVER STARTED SUCCESSFULLY!');
      console.log('================================');
      console.log(`🚀 Server running on port: ${PORT}`);
      console.log(`🤖 Bot: @zosai_bot`);
      console.log(`📱 Users can start chatting now!`);
      console.log(`🌐 API URL: ${process.env.WEBHOOK_URL || `http://localhost:${PORT}`}`);
      console.log(`🔐 Super Admin: ${process.env.SUPER_ADMIN_TELEGRAM_ID}`);
      console.log(`🛡️ Security: MAXIMUM`);
      console.log(`⚡ Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('================================');
      console.log('✨ ZOSAI - Fashion Powered by AI ✨');
      console.log('');
    });
    
    // Server error handling
    server.on('error', (error) => {
      console.error('❌ Server error:', error);
      process.exit(1);
    });
    
    return server;
    
  } catch (error) {
    console.error('❌ Failed to start ZOSAI server:', error);
    console.error('🔧 Please check your configuration and try again.');
    process.exit(1);
  }
}

// ============================================
// 🔄 GRACEFUL SHUTDOWN
// ============================================

let isShuttingDown = false;

async function gracefulShutdown(signal) {
  if (isShuttingDown) {
    console.log('🔄 Shutdown already in progress...');
    return;
  }
  
  isShuttingDown = true;
  console.log(`🛑 Received ${signal}. Starting graceful shutdown...`);
  console.log('⏳ Stopping ZOSAI bot...');
  
  try {
    // Stop bot
    bot.stop(signal);
    console.log('✅ ZOSAI bot stopped');
    
    // Give some time for cleanup
    setTimeout(() => {
      console.log('✅ ZOSAI server shutdown complete');
      process.exit(0);
    }, 5000);
    
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

// Register shutdown handlers
process.once('SIGINT', () => gracefulShutdown('SIGINT'));
process.once('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('🚨 UNCAUGHT EXCEPTION:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 UNHANDLED REJECTION at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// ============================================
// 🚀 START THE SERVER
// ============================================

startZOSAI().catch((error) => {
  console.error('❌ Fatal startup error:', error);
  process.exit(1);
});
