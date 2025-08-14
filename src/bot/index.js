const { Telegraf } = require('telegraf');
const keyboards = require('./keyboards');

const bot = new Telegraf('8472455459:AAESlRVmWsuzsam9K6PYkz7Yw9-xpiPev_4');

console.log('🤖 Initializing ZOSAI Bot...');

// Simple in-memory session storage (for basic functionality)
const sessions = new Map();

// Simple middleware for session handling
bot.use((ctx, next) => {
  const userId = ctx.from?.id;
  if (userId) {
    if (!sessions.has(userId)) {
      sessions.set(userId, {});
    }
    ctx.session = sessions.get(userId);
  }
  return next();
});

bot.start(async (ctx) => {
  const user = ctx.from;
  
  // Store basic user info in session
  ctx.session = ctx.session || {};
  ctx.session.telegram_id = user.id;
  ctx.session.username = user.username;
  ctx.session.first_name = user.first_name;

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

// Role handlers
bot.action('role_customer', async (ctx) => {
  ctx.session.role = 'customer';
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
  await ctx.editMessageText(`🚚 Welcome Shipping Partner! Your tools include:

📦 **My Shipments** - View assigned delivery tasks
🔄 **Update Status** - Real-time delivery tracking
📊 **Route Optimizer** - AI-powered efficient routes
📞 **ZOSAI Support** - Technical assistance

Manage your deliveries with AI intelligence!`);
});

bot.action('role_admin', async (ctx) => {
  ctx.session.role = 'admin';
  await ctx.editMessageText(`⚙️ Welcome Admin! System management tools:

👥 **User Management** - Oversee all user accounts
🏪 **Store Oversight** - Manage store operations
📊 **AI Analytics** - Advanced business intelligence
💳 **Payment Monitoring** - Transaction oversight
⚙️ **System Settings** - Configure ZOSAI parameters

Access the complete administration suite!`);
});

// Handle button clicks
bot.action('profile', async (ctx) => {
  await ctx.reply(`👤 **ZOSAI AI Profile Setup**

To provide personalized recommendations, please share:
📏 Your measurements (height, weight)
🎨 Your style preferences (casual, formal, trendy)
📍 Your location (for nearby store discovery)

This helps ZOSAI's AI create your perfect fashion profile!`);
});

bot.action('find_stores', async (ctx) => {
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
});

bot.action('my_orders', async (ctx) => {
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

// Photo analysis
bot.on('photo', async (ctx) => {
  if (!ctx.session.awaiting_photo) {
    await ctx.reply('📷 To analyze a photo, please use the "AI Photo Analysis" button first from the menu.');
    return;
  }
  
  ctx.session.awaiting_photo = false;
  
  await ctx.reply('🔍 **ZOSAI AI is analyzing your photo...**\n\nThis might take a moment while our advanced color analysis AI processes your image.');
  
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
  }, 3000);
});

// Location sharing
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
1. **Fashion Plus Cairo** - 2.1km away ⭐ 4.8/5
   📍 Zamalek • 👔 Formal & Casual • 💰 Mid-range

2. **Style Hub** - 3.5km away ⭐ 4.6/5  
   📍 New Cairo • 👗 Trendy & Modern • 💰 Affordable

3. **Trend Center** - 4.2km away ⭐ 4.5/5
   📍 Maadi • ✨ Designer & Luxury • 💰 Premium

Ready to explore these stores and find your perfect outfit?`);
});

// Help command
bot.help((ctx) => {
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

📞 **Support:** Contact @zosai_support
🌐 **Website:** zosai.ai
✨ **ZOSAI - Fashion Powered by AI** ✨`);
});

// Handle text messages
bot.on('text', async (ctx) => {
  const text = ctx.message.text;
  
  if (text.startsWith('/track')) {
    const orderId = text.split(' ')[1];
    if (orderId) {
      await ctx.reply(`📦 **ZOSAI Order Tracking**

Order #${orderId}:
🔄 **Status:** Processing
📍 **Location:** Store warehouse  
🚚 **Expected Delivery:** Tomorrow 2-4 PM
📱 **Tracking:** ZOS${orderId}

**AI Prediction:** 95% chance of on-time delivery based on current traffic and weather conditions.

💡 You'll receive real-time updates as your order moves through our AI-optimized logistics network!`);
    } else {
      await ctx.reply('Please provide an order ID. Example: /track 12345');
    }
  } else {
    await ctx.reply(`🤖 I'm ZOSAI, your AI fashion assistant! 

I didn't understand "${text}", but I can help you with:

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

// Error handling
bot.catch((err, ctx) => {
  console.error('🚨 ZOSAI Bot error:', err);
  ctx.reply('🤖 Oops! ZOSAI encountered an issue. Our AI is learning from this error to serve you better. Please try again in a moment!\n\nIf the problem persists, contact @zosai_support');
});

console.log('✅ ZOSAI Bot initialized successfully!');

module.exports = bot;
