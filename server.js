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
const requiredEnvVars = ['BOT_TOKEN', 'SUPER_ADMIN_TELEGRAM_ID', 'WEBHOOK_URL'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error(`❌ CRITICAL ERROR: Missing required environment variables: ${missingVars.join(', ')}`);
  console.error('🔧 Please add these variables to your .env file:');
  missingVars.forEach(v => {
    if (v === 'BOT_TOKEN') console.error('   BOT_TOKEN=your_bot_token_here');
    if (v === 'SUPER_ADMIN_TELEGRAM_ID') console.error('   SUPER_ADMIN_TELEGRAM_ID=6650827406');
    if (v === 'WEBHOOK_URL') console.error('   WEBHOOK_URL=https://your-app-name.railway.app/webhook');
  });
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
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: "same-origin" }
}));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const allowed = (process.env.CORS_ORIGIN||'*').split(',');
    return allowed.includes('*')||allowed.includes(origin)
      ? callback(null, true)
      : callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE'],
  allowedHeaders: ['Content-Type','Authorization','X-Admin-Token']
}));

app.use(compression());

// Enhanced logging
app.use(morgan('combined'));
app.use(morgan('common'));

// ============================================
// 🚦 RATE LIMITING
// ============================================

const globalLimiter = rateLimit({
  windowMs:15*60*1000, max:200,
  standardHeaders:true, legacyHeaders:false,
  message:{error:'Too many requests', retryAfter:900},
  handler:(req,res)=>res.status(429).json({error:'Rate limit exceeded', retryAfter:900})
});
app.use(globalLimiter);

const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW)||15*60*1000,
  max: parseInt(process.env.RATE_LIMIT_MAX)||100,
  standardHeaders:true, legacyHeaders:false,
  skip: req => req.headers['x-admin-token']===process.env.SUPER_ADMIN_TELEGRAM_ID,
  handler:(req,res)=>res.status(429).json({error:'API rate limit exceeded'})
});
app.use('/api', apiLimiter);

const webhookLimiter = rateLimit({
  windowMs:60*1000, max:30, message:{error:'Webhook rate limit exceeded'},
  handler:(req,res)=>res.status(429).json({error:'Webhook rate limit exceeded'})
});

// ============================================
// 🔧 REQUEST PARSING & SECURITY
// ============================================

app.use(express.json({
  limit:'10mb',
  verify:(req,res,buf)=>{ try{ JSON.parse(buf) }catch{ throw new Error('Invalid JSON') } }
}));
app.use(express.urlencoded({extended:true,limit:'10mb'}));

app.use((req,res,next)=>{
  console.log(`📝 ${req.method} ${req.url} from ${req.ip} at ${new Date().toISOString()}`);
  res.set({
    'X-Powered-By':'ZOSAI-AI',
    'X-Frame-Options':'DENY',
    'X-Content-Type-Options':'nosniff'
  });
  next();
});

// Secure static uploads
app.use('/uploads',(req,res,next)=>{
  if(req.url.includes('..'))return res.status(403).json({error:'Invalid file path'});
  next();
},express.static('uploads'));

// ============================================
// 🌐 API ENDPOINTS
// ============================================

app.get('/',(req,res)=>{
  res.json({name:'ZOSAI',version:'1.0.0',status:'active',timestamp:new Date().toISOString()});
});

app.get('/health',(req,res)=>{
  res.json({status:'healthy', uptime:process.uptime(), timestamp:new Date().toISOString()});
});

// Admin status (restricted)
app.get('/admin/status',(req,res)=>{
  if(req.headers['x-admin-token']!==process.env.SUPER_ADMIN_TELEGRAM_ID)
    return res.status(403).json({error:'Access denied'});
  res.json({message:'Super admin authenticated',timestamp:new Date().toISOString()});
});

// Webhook endpoint (protected)
app.use('/webhook',webhookLimiter,(req,res,next)=>{
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
  if(!req.is('application/json'))return res.status(400).json({error:'Invalid content type'});
  next();
},bot.webhookCallback('/webhook'));

app.use('/api',apiRoutes);

// 404 handler
app.use((req,res)=>{
  res.status(404).json({error:'Not found',path:req.url,method:req.method});
});

// Error handler
app.use((err,req,res,next)=>{
  console.error(err);
  const dev = process.env.NODE_ENV!=='production';
  res.status(500).json({error:'Internal error',message:dev?err.message:'',timestamp:new Date().toISOString()});
});

// ============================================
// 🚀 SERVER STARTUP
// ============================================

async function startZOSAI(){
  try{
    await connectDatabase();
    console.log('✅ Database connected');
    if(process.env.NODE_ENV==='production'){
      console.log('🌐 Deploy webhook MANUALLY:');
      console.log(`curl -X POST "https://api.telegram.org/bot${process.env.BOT_TOKEN}/setWebhook?url=${process.env.WEBHOOK_URL}"`);
    } else {
      await bot.launch();
      console.log('✅ Bot started in polling mode');
    }
    app.listen(PORT,()=>console.log(`🚀 Server running on port ${PORT}`));
  }catch(e){
    console.error('❌ Failed to start server:',e);
    process.exit(1);
  }
}

// Graceful shutdown
['SIGINT','SIGTERM'].forEach(sig=>{
  process.once(sig,()=>{console.log(`🛑 Received ${sig}`); process.exit(0)});
});

startZOSAI();
