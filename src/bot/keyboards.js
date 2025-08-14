const { Markup } = require('telegraf');

// ZOSAI Role selection keyboard
const roleSelection = Markup.inlineKeyboard([
  [Markup.button.callback('🛍️ Customer', 'role_customer')],
  [Markup.button.callback('🏪 Store Owner', 'role_store_owner')],
  [Markup.button.callback('🚚 Shipping Partner', 'role_shipper')],
  [Markup.button.callback('⚙️ Admin', 'role_admin')]
]);

// ZOSAI Customer main menu
const customerMenu = Markup.inlineKeyboard([
  [
    Markup.button.callback('👤 AI Profile', 'profile'),
    Markup.button.callback('🏪 Find Stores', 'find_stores')
  ],
  [
    Markup.button.callback('📷 AI Photo Analysis', 'upload_photo'),
    Markup.button.callback('🛒 My Orders', 'my_orders')
  ],
  [
    Markup.button.callback('⭐ ZOSAI Points', 'loyalty_points'),
    Markup.button.callback('📦 Track Order', 'track_order')
  ],
  [Markup.button.callback('🔄 Change Role', 'change_role')]
]);

// ZOSAI Store owner main menu
const storeOwnerMenu = Markup.inlineKeyboard([
  [
    Markup.button.callback('📊 AI Dashboard', 'store_dashboard'),
    Markup.button.callback('📦 Smart Inventory', 'inventory')
  ],
  [
    Markup.button.callback('➕ Add Item', 'add_item'),
    Markup.button.callback('🏷️ QR Codes', 'qr_codes')
  ],
  [
    Markup.button.callback('⚡ AI Flash Sale', 'flash_sale'),
    Markup.button.callback('📋 Orders', 'store_orders')
  ],
  [Markup.button.callback('🔄 Change Role', 'change_role')]
]);

// ZOSAI Shipper main menu
const shipperMenu = Markup.inlineKeyboard([
  [
    Markup.button.callback('📦 My Shipments', 'my_shipments'),
    Markup.button.callback('🔄 Update Status', 'update_status')
  ],
  [
    Markup.button.callback('📊 AI Route Optimizer', 'route_optimizer'),
    Markup.button.callback('📞 ZOSAI Support', 'support')
  ],
  [Markup.button.callback('🔄 Change Role', 'change_role')]
]);

// ZOSAI Admin main menu
const adminMenu = Markup.inlineKeyboard([
  [
    Markup.button.callback('👥 Users', 'admin_users'),
    Markup.button.callback('🏪 Stores', 'admin_stores')
  ],
  [
    Markup.button.callback('📊 AI Analytics', 'admin_analytics'),
    Markup.button.callback('💳 Payments', 'admin_payments')
  ],
  [
    Markup.button.callback('⚙️ ZOSAI Settings', 'admin_settings'),
    Markup.button.callback('🔔 Notifications', 'admin_notifications')
  ],
  [Markup.button.callback('🔄 Change Role', 'change_role')]
]);

// ZOSAI Color analysis results keyboard
const colorAnalysisResults = (colors) => {
  const buttons = colors.map(color => 
    [Markup.button.callback(`🎨 ${color.name} (${color.confidence}%)`, `color_${color.hex}`)]
  );
  buttons.push([Markup.button.callback('🤖 View AI Recommendations', 'view_recommendations')]);
  buttons.push([Markup.button.callback('📷 Analyze Another Photo', 'upload_photo')]);
  buttons.push([Markup.button.callback('🔙 Back to ZOSAI Menu', 'back_to_menu')]);
  return Markup.inlineKeyboard(buttons);
};

// ZOSAI Share location keyboard
const shareLocation = Markup.keyboard([
  [Markup.button.locationRequest('📍 Share My Location for AI Store Discovery')]
]).resize().oneTime();

// ZOSAI Store filters keyboard
const storeFilters = Markup.inlineKeyboard([
  [
    Markup.button.callback('📍 By Distance', 'filter_distance'),
    Markup.button.callback('⭐ By Rating', 'filter_rating')
  ],
  [
    Markup.button.callback('👔 By Category', 'filter_category'),
    Markup.button.callback('💰 By Price', 'filter_price')
  ],
  [
    Markup.button.callback('🤖 AI Recommended', 'filter_ai_recommended'),
    Markup.button.callback('⚡ Flash Sales Only', 'filter_flash_sales')
  ],
  [Markup.button.callback('🛍️ Browse All Stores', 'browse_all_stores')]
]);

// ZOSAI Loyalty rewards keyboard
const loyaltyRewards = Markup.inlineKeyboard([
  [
    Markup.button.callback('🎁 Redeem Points', 'redeem_points'),
    Markup.button.callback('⭐ View Available Rewards', 'view_rewards')
  ],
  [
    Markup.button.callback('📊 Points History', 'points_history'),
    Markup.button.callback('🏆 Tier Benefits', 'tier_benefits')
  ],
  [
    Markup.button.callback('🤖 AI Reward Suggestions', 'ai_reward_suggestions'),
    Markup.button.callback('🎯 How to Earn More', 'earn_points_guide')
  ],
  [Markup.button.callback('🔙 Back to Menu', 'back_to_menu')]
]);

// ZOSAI Back to menu keyboard
const backToMenu = Markup.inlineKeyboard([
  [Markup.button.callback('🔙 Back to ZOSAI Menu', 'back_to_menu')]
]);

module.exports = {
  roleSelection,
  customerMenu,
  storeOwnerMenu,
  shipperMenu,
  adminMenu,
  colorAnalysisResults,
  shareLocation,
  storeFilters,
  loyaltyRewards,
  backToMenu
};