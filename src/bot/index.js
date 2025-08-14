const { Telegraf, Markup } = require('telegraf');
const session = require('telegraf/session');
const keyboards = require('./keyboards');

// Initialize ZOSAI bot with your actual token
const bot = new Telegraf('8472455459:AAESlRVmWsuzsam9K6PYkz7Yw9-xpiPev_4');

console.log('🤖 Initializing ZOSAI Bot...');

// Middleware
bot.use(session());

// Simple logging middleware
bot.use((ctx, next) => {
  console.log(`📱 ZOSAI: ${ctx.updateType} from ${ctx.from?.username || ctx.from?.first_name}`);
  return next();
});

// ZOSAI Start command - Role selection
bot.start(async (ctx) => {
  const user = ctx.from;
  
  // Store basic user info in session
  ctx.session = ctx.session || {};
  ctx.session.telegram_id = user.id;
  ctx.session.username = user.username;
  ctx.session.first_name = user.first_name;
  ctx.session.last_name = user.last_name;

  const welcomeText = `🤖 Welcome to ZOSAI, ${user.first_name}!

🚀 **Your AI-Powered Fashion Assistant**

I use artificial intelligence to revolutionize your shopping experience:

📷 **Smart Photo Analysis** - Upload any clothing photo and I'll find matching outfits using advanced color analysis
📍 **Location Intelligence** - Discover nearby stores based on your exact location  
🎯 **Personalized Recommendations** - AI learns your style preferences for perfect matches
⭐ **Loyalty Rewards** - Earn points and unlock exclusive benefits
🛍️ **Seamless Shopping** - From discovery to delivery, all in one chat

**Ready to experience the future of fashion?**
Select your role to get started:`;

  await ctx.reply(welcomeText, keyboards.roleSelection);
});

// Role selection handlers for ZOSAI
bot.action('role_customer', async (ctx) => {
  ctx.session.role = 'customer';
  
  const welcomeText = `🛍️ Welcome, ${ctx.session.first_name}!

You're now set up as a **ZOSAI Customer**. Here's what you can do:

👤 **AI Profile** - Set your measurements and style preferences for personalized AI recommendations
🏪 **Find Stores** - Discover nearby clothing stores using location intelligence  
📷 **AI Photo Analysis** - Upload photos for color-matched outfit recommendations
🛒 **My Orders** - View and track your purchases with real-time updates
⭐ **ZOSAI Points** - Check your rewards and redeem AI-curated benefits

Let's start by setting up your AI profile for personalized recommendations!`;

  await ctx.editMessageText(welcomeText, keyboards.customerMenu);
});

bot.action('role_store_owner', async (ctx) => {
  ctx.session.role = 'store_owner';
  
  const welcomeText = `🏪 Welcome, ${ctx.session.first_name}!

You're now set up as a **ZOSAI Store Owner**. Your AI-powered dashboard includes:

📊 **AI Dashboard** - Smart analytics and insights about your store performance
📦 **Smart Inventory** - Manage your items with AI-enhanced product photos
➕ **Add Items** - Upload products with automatic AI image optimization
🏷️ **QR Codes** - Generate smart QR codes for instant inventory updates
⚡ **AI Flash Sales** - Create targeted promotional campaigns with AI audience selection
📋 **Orders** - Process customer orders with intelligent fulfillment suggestions

Start managing your store with ZOSAI's AI tools!`;

  await ctx.editMessageText(welcomeText, keyboards.storeOwnerMenu);
});

bot.action('role_shipper', async (ctx) => {
  ctx.session.role = 'shipper';
  
  const welcomeText = `🚚 Welcome, ${ctx.session.first_name}!

You're now set up as a **ZOSAI Shipping Partner**. Your AI-powered tools include:

📦 **My Shipments** - View assigned delivery tasks with AI route optimization
🔄 **Update Status** - Update delivery progress with real-time tracking
📊 **AI Route Optimizer** - Get the most efficient delivery routes powered by AI
📞 **ZOSAI Support** - Contact our technical support team

Start managing your shipments with AI intelligence!`;

  await ctx.editMessageText(welcomeText, keyboards.shipperMenu);
});

bot.action('role_admin', async (ctx) => {
  ctx.session.role = 'admin';
  
  const welcomeText = `⚙️ Welcome, ${ctx.session.first_name}!

You're now in **ZOSAI Admin Mode**. Your AI-powered administration tools include:

👥 **Users** - Manage all users with AI behavior insights
🏪 **Stores** - Oversee store operations with performance analytics
📊 **AI Analytics** - Advanced business intelligence and trend analysis
💳 **Payments** - Monitor transactions and payment gateway integration
⚙️ **ZOSAI Settings** - Configure system parameters and AI algorithms
🔔 **Notifications** - Manage system alerts and user communications

Access the complete ZOSAI administration suite!`;

  await ctx.editMessageText(welcomeText, keyboards.adminMenu);
});

// Customer features
bot.action('profile', async (ctx) => {
  await ctx.reply(`👤 **ZOSAI AI Profile Setup**

To provide you with the best AI-powered recommendations, I need to learn about your style preferences.

Please share:
📏 Your measurements (height, weight)
🎨 Your style preferences (casual, formal, trendy, etc.)
📍 Your location (for nearby store discovery)

This helps ZOSAI's AI create a personalized fashion profile just for you!`);
});

bot.action('find_stores', async (ctx) => {
  await ctx.reply(`🏪 **ZOSAI Store Discovery**

ZOSAI uses location intelligence to find the perfect stores for you!

📍 Please share your location so I can:
• Find nearby clothing stores
• Show distance and ratings
• Filter by your style preferences  
• Display current promotions
• Get real-time inventory updates

Tap the location button below to get started!`, keyboards.shareLocation);
});

bot.action('upload_photo', async (ctx) => {
  ctx.session.awaiting_photo = true;
  await ctx.reply(`📷 **ZOSAI AI Photo Analysis**

Upload a photo of any clothing item and I'll use advanced AI to:

🎨 **Color Analysis** - Extract the exact color palette
🎯 **Style Matching** - Identify the style and pattern
🛍️ **Smart Recommendations** - Find matching items from nearby stores
📊 **Trend Analysis** - Show how it fits current fashion trends

**Tips for best results:**
• Use clear, well-lit photos
• Focus on the main clothing item
• Avoid busy backgrounds

Just send me the photo now! 📸`);
});

bot.action('my_orders', async (ctx) => {
  await ctx.reply(`🛒 **Your ZOSAI Orders**

Here's your order history with AI-powered insights:

📦 **Active Orders:** 0
✅ **Completed Orders:** 0  
🔄 **Returns/Exchanges:** 0

💡 **AI Insights:**
• No orders yet - start shopping to build your style profile!
• ZOSAI learns from each purchase to improve recommendations
• Earn loyalty points with every order

Ready to place your first order? Use /stores to find nearby shops!`);
});

bot.action('loyalty_points', async (ctx) => {
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

Start shopping to earn your first ZOSAI points!`, keyboards.loyaltyRewards);
});

// Handle photo uploads
bot.on('photo', async (ctx) => {
  if (!ctx.session.awaiting_photo) {
    await ctx.reply('📷 To analyze a photo, please use the "AI Photo Analysis" button first.');
    return;
  }
  
  ctx.session.awaiting_photo = false;
  
  await ctx.reply('🔍 **ZOSAI AI is analyzing your photo...**\n\nThis might take a moment while our advanced color analysis AI processes your image.');
  
  // Simulate AI analysis delay
  setTimeout(async () => {
    const analysisText = `🎨 **ZOSAI AI Analysis Complete!**

**Detected Colors:**
• Primary: Deep Blue (#1E3A8A) - 45%
• Secondary: White (#FFFFFF) - 30%  
• Accent: Silver Gray (#9CA3AF) - 25%

🎯 **Style Classification:** Casual Smart
📊 **Trend Score:** 8.5/10 (Highly trendy)
🌟 **AI Confidence:** 94%

🛍️ **Matching Items Found:**
Based on this color palette, I found 12 items from 5 nearby stores that perfectly match your photo!

Would you like to see the AI recommendations?`;

    await ctx.reply(analysisText, keyboards.colorAnalysisResults([
      { name: 'Deep Blue', hex: '#1E3A8A', confidence: 94 },
      { name: 'Pure White', hex: '#FFFFFF', confidence: 92 },
      { name: 'Silver Gray', hex: '#9CA3AF', confidence: 89 }
    ]));
  }, 3000);
});

// Handle location sharing
bot.on('location', async (ctx) => {
  const location = ctx.message.location;
  ctx.session.location = location;
  
  await ctx.reply(`📍 **Location Saved!**

ZOSAI AI has updated your location and found:

🏪 **5 nearby stores** within 10km
⚡ **2 flash sales** active now  
🆕 **15 new arrivals** this week
🎯 **87 items** matching your style profile

**Top Store Recommendations:**
1. **Fashion Plus** - 2.1km away ⭐ 4.8
2. **Style Hub** - 3.5km away ⭐ 4.6  
3. **Trend Center** - 4.2km away ⭐ 4.5

Ready to explore these stores?`, keyboards.storeFilters);
});

// Handle text messages
bot.on('text', async (ctx) => {
  const text = ctx.message.text;
  
  if (text.startsWith('/track')) {
    const orderId = text.split(' ')[1];
    if (orderId) {
      await ctx.reply(`📦 **ZOSAI Order Tracking**

Order #${orderId}:
🔄 Status: Processing
📍 Location: Store warehouse  
🚚 Expected delivery: Tomorrow 2-4 PM
📱 Tracking: ZOS${orderId}

**AI Prediction:** 95% chance of on-time delivery based on current traffic and weather conditions.`);
    } else {
      await ctx.reply('Please provide an order ID. Example: /track 12345');
    }
  } else {
    await ctx.reply(`🤖 I'm ZOSAI, your AI fashion assistant! 

I didn't understand "${text}", but I can help you with:
• Finding stores and products
• Analyzing photos for style matching  
• Managing orders and tracking
• Earning loyalty points

Use the menu buttons or type /help to see all my AI-powered features!`, keyboards.customerMenu);
  }
});

// ZOSAI Help command
bot.help((ctx) => {
  const helpText = `🤖 **ZOSAI - AI Fashion Marketplace Commands**

🌟 **What makes ZOSAI special?**
ZOSAI uses advanced artificial intelligence to personalize your fashion experience like never before!

👥 **Customer Commands:**
/profile - Update your AI style profile for better recommendations
/stores - Find nearby stores using location intelligence
/upload - Upload photo for AI color and style analysis
/orders - View your order history and tracking
/points - Check loyalty points and redeem AI-curated rewards
/track <order_id> - Real-time delivery tracking with AI predictions

🏪 **Store Owner Commands:**
/dashboard - AI-powered store analytics dashboard
/inventory - Smart inventory management with AI insights
/additem - Add new item with AI image enhancement
/qrcode - Generate smart QR codes for instant updates
/flashsale - Create AI-targeted promotional campaigns

🚚 **Shipping Partner Commands:**
/shipments - View AI-optimized delivery routes
/update - Update delivery status with GPS tracking

⚙️ **Admin Commands:**
/admin - System administration with AI analytics
/users - User management with behavior insights
/analytics - Advanced AI-powered business intelligence

🔮 **ZOSAI AI Features:**
• Advanced color palette analysis from any photo
• Machine learning style preference system
• Location-based intelligent recommendations  
• Personalized outfit matching algorithms
• Smart inventory predictions for store owners
• Dynamic pricing insights and trend analysis
• AI-powered customer behavior analytics

💡 **Pro Tips:**
• Upload clear, well-lit photos for best AI analysis
• Enable location sharing for accurate store recommendations
• Complete your profile for personalized AI suggestions
• Use /track to get AI-predicted delivery times

📞 **Support:** Contact @zosai_support for assistance
🌐 **Website:** Visit zosai.ai for more AI-powered features
✨ **ZOSAI - Fashion Powered by AI** ✨`;

  ctx.reply(helpText);
});

// Error handling for ZOSAI
bot.catch((err, ctx) => {
  console.error('🚨 ZOSAI Bot error:', err);
  ctx.reply('🤖 Oops! ZOSAI encountered an issue. Our AI is learning from this error to serve you better. Please try again in a moment!');
});

console.log('✅ ZOSAI Bot initialized successfully!');

module.exports = bot;