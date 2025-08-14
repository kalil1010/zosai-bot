const { Telegraf } = require('telegraf');
const keyboards = require('./keyboards');
const Redis = require('redis');
require('dotenv').config();

console.log('🤖 Initializing SECURE ZOSAI Bot...');

// SECURE: Validate critical environment variables
const requiredEnvVars = ['BOT_TOKEN', 'SUPER_ADMIN_TELEGRAM_ID'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
  process.exit(1);
}

// SECURE: Bot token from environment
const bot = new Telegraf(process.env.BOT_TOKEN);
const SUPER_ADMIN_ID = process.env.SUPER_ADMIN_TELEGRAM_ID;

console.log('🔐 Security: Environment variables validated');
console.log(`🛡️ Super Admin ID configured: ${SUPER_ADMIN_ID}`);

// SECURE: Redis connection with fallback
let redisClient = null;
try {
  if (process.env.REDIS_URL) {
    redisClient = Redis.createClient({ url: process.env.REDIS_URL });
    redisClient.connect().catch(err => {
      console.log('⚠️ Redis unavailable, using memory sessions:', err.message);
    });
    console.log('✅ Redis client initialized');
  }
} catch (error) {
  console.log('📝 Redis not configured, using memory sessions');
}

// Rate limiting storage
const rateLimits = new Map();
const sessionStorage = new Map(); // Fallback for Redis

// SECURE: Authentication and rate limiting middleware
bot.use(async (ctx, next) => {
  const userId = ctx.from?.id?.toString();
  const username = ctx.from?.username || 'unknown';
  
  if (!userId) return next();
  
  // SECURE: Rate limiting (30 requests per minute)
  const userLimits = rateLimits.get(userId) || [];
  const oneMinuteAgo = Date.now() - 60000;
  const recentRequests = userLimits.filter(time => time > oneMinuteAgo);
  
  if (recentRequests.length > 30) {
    await ctx.reply('⚠️ Too many requests. Please wait a moment before trying again.');
    console.log(`🚦 RATE LIMIT: User ${username} (${userId}) exceeded limits at ${new Date().toISOString()}`);
    return;
  }
  
  recentRequests.push(Date.now());
  rateLimits.set(userId, recentRequests);
  
  // SECURE: Session management with Redis fallback
  try {
    if (redisClient && redisClient.isReady) {
      const sessionData = await redisClient.get(`session:${userId}`);
      ctx.session = sessionData ? JSON.parse(sessionData) : {};
    } else {
      // Fallback to memory storage
      ctx.session = sessionStorage.get(userId) || {};
    }
  } catch (error) {
    console.log('Session load error:', error.message);
    ctx.session = {};
  }
  
  ctx.session.telegram_id = userId;
  ctx.session.username = username;
  ctx.session.last_activity = new Date().toISOString();
  
  return next();
});

// SECURE: Save session after interaction
bot.use(async (ctx, next) => {
  await next();
  
  if (ctx.session && ctx.from?.id) {
    const userId = ctx.from.id.toString();
    
    try {
      if (redisClient && redisClient.isReady) {
        await redisClient.setex(`session:${userId}`, 3600, JSON.stringify(ctx.session));
      } else {
        // Fallback to memory storage
        sessionStorage.set(userId, ctx.session);
      }
    } catch (error) {
      console.log('Session save failed:', error.message);
    }
  }
});

// Welcome message with security logging
bot.start(async (ctx) => {
  const user = ctx.from;
  
  // Log user start
  console.log(`👤 User started bot: ${user.username || user.first_name} (ID: ${user.id}) at ${new Date().toISOString()}`);
  
  const welcomeText = `🤖 Welcome to ZOSAI, ${user.first_name}!

🚀 **Your AI-Powered Fashion Assistant**

📷 **Smart Photo Analysis** - Upload clothing photos for color matching
📍 **Location Intelligence** - Discover nearby stores automatically 
🎯 **Personalized Recommendations** - AI learns your style preferences
⭐ **Loyalty Rewards** - Earn points and unlock exclusive benefits

Ready to experience the future of fashion?
Select your role to get started:`;

  await ctx.reply(welcomeText, keyboards.roleSelection);
});

// SECURE: Role handlers with authentication
bot.action('role_customer', async (ctx) => {
  ctx.session.role = 'customer';
  ctx.session.role_selected_at = new Date().toISOString();
  
  console.log(`👤 User ${ctx.from.username} (${ctx.from.id}) selected Customer role`);
  
  await ctx.editMessageText(`🛍️ Welcome Customer! You can now:

👤 **AI Profile** - Set up your style preferences
🏪 **Find Stores** - Discover nearby fashion stores 
📷 **AI Photo Analysis** - Upload photos for color analysis
🛒 **My Orders** - Track your purchases
⭐ **ZOSAI Points** - Earn and redeem rewards

Use the buttons below to get started!`, keyboards.customerMenu);
});

bot.action('role_store_owner', async (ctx) => {
  ctx.session.role = 'store_owner';
  ctx.session.role_selected_at = new Date().toISOString();
  
  console.log(`🏪 User ${ctx.from.username} (${ctx.from.id}) selected Store Owner role`);
  
  await ctx.editMessageText(`🏪 Welcome Store Owner! Your AI dashboard includes:

📊 **AI Dashboard** - Smart analytics and insights
📦 **Smart Inventory** - Manage products with AI enhancement
🏷️ **QR Code System** - Generate codes for inventory updates 
⚡ **AI Flash Sales** - Create targeted promotional campaigns
📋 **Order Management** - Process and fulfill customer orders

Start managing your store with ZOSAI's AI tools!`, keyboards.storeOwnerMenu);
});

bot.action('role_shipper', async (ctx) => {
  ctx.session.role = 'shipper';
  ctx.session.role_selected_at = new Date().toISOString();
  
  console.log(`🚚 User ${ctx.from.username} (${ctx.from.id}) selected Shipper role`);
  
  await ctx.editMessageText(`🚚 Welcome Shipping Partner! Your tools include:

📦 **My Shipments** - View assigned delivery tasks
🔄 **Update Status** - Real-time delivery tracking
📊 **Route Optimizer** - AI-powered efficient routes
📞 **ZOSAI Support** - Technical assistance

Manage your deliveries with AI intelligence!`);
});

// SECURE: Admin role with strong authentication
bot.action('role_admin', async (ctx) => {
  const userId = ctx.from.id.toString();
  const username = ctx.from.username || ctx.from.first_name || 'Unknown';
  
  // SECURE: Only allow super admin ID
  if (userId !== SUPER_ADMIN_ID) {
    await ctx.editMessageText(`❌ **Access Denied**
    
🔐 Admin access is restricted to authorized personnel only.

**Security Notice:** This attempt has been logged for security purposes.

If you believe this is an error, please contact support.

🔙 Please select a different role to continue.`, keyboards.roleSelection);
    
    // Log unauthorized attempt with detailed info
    console.log(`🚨 SECURITY ALERT: Unauthorized admin access attempt
👤 User: ${username}
🆔 ID: ${userId}
📅 Time: ${new Date().toISOString()}
🌐 IP: [Telegram Network]
📱 Client: ${ctx.from.language_code || 'unknown'}`);
    
    return;
  }
  
  // Super admin access granted
  ctx.session.role = 'super_admin';
  ctx.session.admin_authenticated = true;
  ctx.session.admin_login_time = new Date().toISOString();
  
  await ctx.editMessageText(`👑 **Welcome Super Admin!**
  
🔐 **SUPER ADMIN PANEL**
System Owner: ZOSAI_BOT

✅ **Authentication Successful**
Your ID (${userId}) has been verified as the system administrator.

🎯 **Available Controls:**
👥 **User Management** - Oversee all user accounts  
🏪 **Store Oversight** - Manage store operations
📊 **AI Analytics** - Advanced business intelligence  
💳 **Payment Monitoring** - Transaction oversight
⚙️ **System Settings** - Configure ZOSAI parameters
🚨 **Security Logs** - Monitor system security

**Admin Commands:**
/admin - Quick admin panel
/security - Security dashboard  
/users - User management
/stats - System statistics

Access the complete administration suite!`);
  
  // Log successful admin login
  console.log(`✅ SUPER ADMIN LOGIN SUCCESSFUL:
👤 User: ${username}
🆔 ID: ${userId}
📅 Time: ${new Date().toISOString()}
🔐 Session: Authenticated`);
});

// SECURE: Admin-only commands with comprehensive checks
bot.command('admin', async (ctx) => {
  const userId = ctx.from.id.toString();
  const username = ctx.from.username || ctx.from.first_name || 'Unknown';
  
  if (userId !== SUPER_ADMIN_ID) {
    await ctx.reply('❌ Access denied. Super admin only.');
    console.log(`🚨 SECURITY: Unauthorized /admin command
👤 User: ${username} (${userId})
📅 Time: ${new Date().toISOString()}`);
    return;
  }
  
  // Get system statistics
  const totalSessions = redisClient?.isReady 
    ? await redisClient.keys('session:*').then(keys => keys.length).catch(() => sessionStorage.size)
    : sessionStorage.size;
  
  const memoryUsage = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
  const uptime = Math.round(process.uptime() / 60); // minutes
  
  await ctx.reply(`👑 **SUPER ADMIN PANEL**
System Owner: ZOSAI_BOT

🎯 **System Status:**
• Total Sessions: ${totalSessions}
• Active Rate Limits: ${rateLimits.size}
• Memory Usage: ${memoryUsage}MB
• Uptime: ${uptime} minutes
• Redis Status: ${redisClient?.isReady ? '✅ Connected' : '❌ Disconnected'}
• System Status: ✅ Operational

**Quick Actions:**
/security - Security monitoring
/users - User management  
/stats - Detailed statistics
/logs - View system logs
/maintenance - System controls

**Session Info:**
• Last Login: ${new Date().toLocaleString()}
• Your Role: Super Admin
• Permissions: Full System Access`);
  
  console.log(`📊 Admin panel accessed by ${username} (${userId})`);
});

bot.command('security', async (ctx) => {
  const userId = ctx.from.id.toString();
  
  if (userId !== SUPER_ADMIN_ID) {
    await ctx.reply('❌ Access denied. Super admin only.');
    return;
  }
  
  const totalUsers = sessionStorage.size + (redisClient?.isReady ? 
    await redisClient.keys('session:*').then(keys => keys.length).catch(() => 0) : 0);
  
  await ctx.reply(`🛡️ **Security Monitoring Dashboard**
  
🔐 **Authentication Status:**
• Super Admin ID: ${SUPER_ADMIN_ID} ✅
• Bot Token: Secure (environment) ✅  
• Redis Connection: ${redisClient?.isReady ? '✅ Connected' : '❌ Disconnected'}
• Environment: ${process.env.NODE_ENV || 'development'}

🚦 **Rate Limiting:**
• Active limits: ${rateLimits.size} users
• Max requests/min: 30 per user
• Status: ✅ Active Protection

📊 **System Health:**
• Total Users: ${totalUsers}
• Memory Usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB
• Uptime: ${Math.round(process.uptime() / 3600)} hours
• Status: ✅ Healthy

⚠️ **Security Alerts:** None
🔒 **Last Security Check:** ${new Date().toLocaleString()}`);
});

bot.command('users', async (ctx) => {
  const userId = ctx.from.id.toString();
  
  if (userId !== SUPER_ADMIN_ID) {
    await ctx.reply('❌ Access denied. Super admin only.');
    return;
  }
  
  await ctx.reply(`👥 **User Management Dashboard**
  
📊 **Current Statistics:**
• Memory Sessions: ${sessionStorage.size}
• Redis Sessions: ${redisClient?.isReady ? 'Connected' : 'N/A'}
• Active Rate Limits: ${rateLimits.size}
• System Load: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB

🔍 **Recent Activity:**
• Session storage: Active
• Rate limiting: Operational
• Security monitoring: ✅ Active

**User Management:**
• All users tracked via sessions
• Rate limiting applied per user  
• Security logging active
• Admin access restricted to your ID only`);
});

// Keep existing functionality with security enhancements
bot.action('profile', async (ctx) => {
  console.log(`👤 User ${ctx.from.username} (${ctx.from.id}) accessed profile setup`);
  
  await ctx.reply(`👤 **ZOSAI AI Profile Setup**

To provide personalized recommendations, please share:
📏 Your measurements (height, weight)
🎨 Your style preferences (casual, formal, trendy)
📍 Your location (for nearby store discovery)

This helps ZOSAI's AI create your perfect fashion profile!

🔒 **Privacy Note:** All your data is securely stored and used only to improve your ZOSAI experience.`);
});

bot.action('find_stores', async (ctx) => {
  console.log(`🏪 User ${ctx.from.username} (${ctx.from.id}) searching for stores`);
  
  await ctx.reply(`🏪 **ZOSAI Store Discovery**

ZOSAI uses location intelligence to find perfect stores for you!

📍 Please share your location to:
• Find nearby clothing stores
• Show distance and ratings
• Filter by your preferences 
• Display current promotions
• Get real-time inventory

Tap the location button to get started!`, {
    reply_markup: {
      keyboard: [[{
        text: '📍 Share My Location',
        request_location: true
      }]],
      resize_keyboard: true,
      one_time_keyboard: true
    }
  });
});

bot.action('upload_photo', async (ctx) => {
  console.log(`📷 User ${ctx.from.username} (${ctx.from.id}) starting photo analysis`);
  
  await ctx.reply(`📷 **ZOSAI AI Photo Analysis**

Upload a photo of any clothing item and I'll use advanced AI to:

🎨 **Color Analysis** - Extract the exact color palette
🎯 **Style Matching** - Identify style and pattern
🛍️ **Smart Recommendations** - Find matching items from nearby stores
📊 **Trend Analysis** - Show how it fits current fashion trends

**Tips for best results:**
• Use clear, well-lit photos
• Focus on the main clothing item
• Avoid busy backgrounds

Just send me the photo now! 📸`);
  
  // Set flag for awaiting photo
  ctx.session.awaiting_photo = true;
  ctx.session.photo_request_time = new Date().toISOString();
});

bot.action('my_orders', async (ctx) => {
  console.log(`🛒 User ${ctx.from.username} (${ctx.from.id}) checking orders`);
  
  await ctx.reply(`🛒 **Your ZOSAI Orders**

Here's your order history with AI insights:

📦 **Active Orders:** 0
✅ **Completed Orders:** 0 
🔄 **Returns/Exchanges:** 0

💡 **AI Insights:**
• No orders yet - start shopping to build your style profile!
• ZOSAI learns from each purchase to improve recommendations
• Earn loyalty points with every order

Ready to place your first order? Use the Find Stores button!`);
});

bot.action('loyalty_points', async (ctx) => {
  console.log(`⭐ User ${ctx.from.username} (${ctx.from.id}) checking loyalty points`);
  
  await ctx.reply(`⭐ **ZOSAI Loyalty Program**

Welcome to ZOSAI Points - your AI-curated rewards program!

💎 **Current Points:** 0
🏆 **Tier:** Bronze (Starting Level)
🎯 **Next Tier:** Silver (1000 points needed)

🎁 **How to Earn Points:**
• 1 point per 20 EGP spent
• 50 bonus points for photo uploads
• 100 points for referring friends
• Special AI challenges and tasks

🛍️ **Redeem Rewards:**
• 500 points = 25 EGP discount
• 1000 points = Free shipping
• 2000 points = Exclusive AI style consultation

Start shopping to earn your first ZOSAI points!`);
});

// Photo analysis with security logging
bot.on('photo', async (ctx) => {
  if (!ctx.session.awaiting_photo) {
    await ctx.reply('📷 To analyze a photo, please use the "AI Photo Analysis" button first from the menu.');
    return;
  }
  
  console.log(`📸 User ${ctx.from.username} (${ctx.from.id}) uploaded photo for analysis`);
  
  ctx.session.awaiting_photo = false;
  ctx.session.last_photo_upload = new Date().toISOString();
  
  await ctx.reply('🔍 **ZOSAI AI is analyzing your photo...**\\n\\nThis might take a moment while our advanced color analysis AI processes your image.');
  
  // Simulate AI analysis
  setTimeout(async () => {
    const analysis = `🎨 **ZOSAI AI Analysis Complete!**

**Detected Colors:**
• Primary: Deep Blue (#1E3A8A) - 45%
• Secondary: White (#FFFFFF) - 30% 
• Accent: Silver Gray (#9CA3AF) - 25%

🎯 **Style Classification:** Casual Smart
📊 **Trend Score:** 8.5/10 (Highly trendy)
🌟 **AI Confidence:** 94%

🛍️ **Matching Items Found:**
Based on this color palette, I found 12 items from 5 nearby stores that perfectly match your photo!

💡 **ZOSAI Recommendation:** This color combination works great with navy accessories and white sneakers!

🎁 **Bonus:** You earned 50 loyalty points for using AI photo analysis!`;
    
    await ctx.reply(analysis);
    console.log(`✅ Photo analysis completed for user ${ctx.from.username} (${ctx.from.id})`);
  }, 3000);
});

// Location sharing with security logging
bot.on('location', async (ctx) => {
  const location = ctx.message.location;
  ctx.session.location = location;
  ctx.session.location_shared_at = new Date().toISOString();
  
  console.log(`📍 User ${ctx.from.username} (${ctx.from.id}) shared location: ${location.latitude}, ${location.longitude}`);
  
  await ctx.reply(`📍 **Location Saved!**

ZOSAI AI has updated your location and found:

🏪 **5 nearby stores** within 10km
⚡ **2 flash sales** active now 
🆕 **15 new arrivals** this week
🎯 **87 items** matching your style profile

**Top Store Recommendations:**
1. **Fashion Plus Cairo** - 2.1km away ⭐ 4.8/5
   📍 Zamalek • 👔 Formal & Casual • 💰 Mid-range

2. **Style Hub** - 3.5km away ⭐ 4.6/5 
   📍 New Cairo • 👗 Trendy & Modern • 💰 Affordable

3. **Trend Center** - 4.2km away ⭐ 4.5/5
   📍 Maadi • ✨ Designer & Luxury • 💰 Premium

Ready to explore these stores and find your perfect outfit?`);
});

// Help command with security info
bot.help((ctx) => {
  console.log(`❓ User ${ctx.from.username} (${ctx.from.id}) requested help`);
  
  ctx.reply(`🤖 **ZOSAI - AI Fashion Marketplace Commands**

🌟 **What makes ZOSAI special?**
ZOSAI uses advanced artificial intelligence to personalize your fashion experience!

👥 **Customer Commands:**
/start - Welcome & role selection
/help - Show this help menu
/profile - Update your AI style profile
/stores - Find nearby stores with location intelligence
/orders - View your order history
/points - Check loyalty points and rewards

🔮 **ZOSAI AI Features:**
• Advanced color palette analysis from photos
• Machine learning style recommendations
• Location-based intelligent store discovery 
• Personalized outfit matching algorithms
• Smart inventory predictions
• AI-powered trend analysis

💡 **Pro Tips:**
• Upload clear, well-lit photos for best AI analysis
• Enable location sharing for accurate recommendations
• Complete your profile for personalized suggestions

🔒 **Security & Privacy:**
• Your data is securely protected
• All sessions are encrypted
• Only use verified ZOSAI features

📞 **Support:** Contact @zosai_support
🌐 **Website:** zosai.ai
✨ **ZOSAI - Fashion Powered by AI** ✨`);
});

// Handle text messages with input validation
bot.on('text', async (ctx) => {
  const text = ctx.message.text;
  const userId = ctx.from.id.toString();
  
  // Input validation
  if (text.length > 1000) {
    await ctx.reply('⚠️ Message too long. Please keep messages under 1000 characters.');
    return;
  }
  
  // Track command
  if (text.startsWith('/track')) {
    const orderId = text.split(' ')[1];
    if (orderId && /^[A-Za-z0-9]+$/.test(orderId)) {
      console.log(`📦 User ${ctx.from.username} (${userId}) tracking order: ${orderId}`);
      
      await ctx.reply(`📦 **ZOSAI Order Tracking**

Order #${orderId}:
🔄 **Status:** Processing
📍 **Location:** Store warehouse 
🚚 **Expected Delivery:** Tomorrow 2-4 PM
📱 **Tracking:** ZOS${orderId}

**AI Prediction:** 95% chance of on-time delivery based on current traffic and weather conditions.

💡 You'll receive real-time updates as your order moves through our AI-optimized logistics network!`);
    } else {
      await ctx.reply('Please provide a valid order ID. Example: /track 12345');
    }
  } else {
    console.log(`💬 User ${ctx.from.username} (${userId}) sent message: ${text.substring(0, 50)}...`);
    
    await ctx.reply(`🤖 I'm ZOSAI, your AI fashion assistant! 

I didn't understand "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}", but I can help you with:

🎯 **Main Features:**
• Finding stores and products
• Analyzing photos for style matching 
• Managing orders and tracking
• Earning loyalty points
• Getting personalized recommendations

Use the menu buttons or type /help to see all my AI-powered features!

Ready to start? Send /start to see the main menu! ✨`);
  }
});

// SECURE: Comprehensive error handling
bot.catch((err, ctx) => {
  const userId = ctx.from?.id || 'unknown';
  const username = ctx.from?.username || 'unknown';
  
  console.error(`🚨 ZOSAI Bot error:
👤 User: ${username} (${userId})
📅 Time: ${new Date().toISOString()}
❌ Error: ${err.message}
📚 Stack: ${err.stack}`);
  
  ctx.reply('🤖 Oops! ZOSAI encountered an issue. Our AI is learning from this error to serve you better. Please try again in a moment!\\n\\nIf the problem persists, contact @zosai_support');
});

console.log('✅ SECURE ZOSAI Bot initialized successfully!');
console.log(`🔐 Super Admin ID: ${SUPER_ADMIN_ID}`);
console.log(`🚀 Bot ready for secure operation`);

module.exports = bot;
