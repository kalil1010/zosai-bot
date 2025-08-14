const pg = require('pg');
const redis = require('redis');

// PostgreSQL connection for ZOSAI
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Redis connection for ZOSAI sessions and caching
let redisClient;
try {
  redisClient = redis.createClient({
    url: process.env.REDIS_URL
  });
} catch (error) {
  console.log('Redis not configured, using memory sessions');
  redisClient = null;
}

if (redisClient) {
  redisClient.on('error', (err) => {
    console.error('ZOSAI Redis error:', err);
  });

  redisClient.on('connect', () => {
    console.log('✅ ZOSAI connected to Redis');
  });
}

// Database connection function for ZOSAI
const connectDatabase = async () => {
  try {
    // Test PostgreSQL connection
    const client = await pool.connect();
    console.log('✅ ZOSAI connected to PostgreSQL');
    client.release();
    
    // Connect to Redis if available
    if (redisClient) {
      await redisClient.connect();
    }
    
    // Run ZOSAI database migrations
    await runZOSAIMigrations();
    
  } catch (error) {
    console.error('❌ ZOSAI database connection failed:', error);
    // Don't exit in development - allow bot to run without DB for testing
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

// Run database migrations for ZOSAI
const runZOSAIMigrations = async () => {
  const migrations = [
    // Create users table
    `CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      telegram_id BIGINT UNIQUE NOT NULL,
      username VARCHAR(255),
      first_name VARCHAR(255),
      last_name VARCHAR(255),
      phone_number VARCHAR(20),
      email VARCHAR(255),
      profile_photo_url TEXT,
      weight DECIMAL(5,2),
      height DECIMAL(5,2),
      style_preferences TEXT[],
      location_lat DECIMAL(10,8),
      location_lng DECIMAL(11,8),
      location_address TEXT,
      loyalty_points INTEGER DEFAULT 0,
      user_type VARCHAR(20) DEFAULT 'customer',
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Create stores table
    `CREATE TABLE IF NOT EXISTS stores (
      id SERIAL PRIMARY KEY,
      owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      store_name VARCHAR(255) NOT NULL,
      store_description TEXT,
      store_address TEXT NOT NULL,
      location_lat DECIMAL(10,8) NOT NULL,
      location_lng DECIMAL(11,8) NOT NULL,
      phone_number VARCHAR(20),
      email VARCHAR(255),
      store_logo_url TEXT,
      business_license VARCHAR(255),
      is_verified BOOLEAN DEFAULT false,
      is_active BOOLEAN DEFAULT true,
      operating_hours JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Create categories table
    `CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(255) UNIQUE NOT NULL,
      description TEXT,
      parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      icon_url TEXT,
      sort_order INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Create items table
    `CREATE TABLE IF NOT EXISTS items (
      id SERIAL PRIMARY KEY,
      store_id INTEGER REFERENCES stores(id) ON DELETE CASCADE,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      sku VARCHAR(100) UNIQUE NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      sale_price DECIMAL(10,2),
      color VARCHAR(50),
      size VARCHAR(50),
      brand VARCHAR(100),
      material VARCHAR(100),
      quantity_in_stock INTEGER NOT NULL DEFAULT 0,
      qr_code VARCHAR(255) UNIQUE,
      images TEXT[],
      ai_generated_images TEXT[],
      tags TEXT[],
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Create orders table
    `CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      order_number VARCHAR(50) UNIQUE NOT NULL,
      customer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      store_id INTEGER REFERENCES stores(id) ON DELETE CASCADE,
      status VARCHAR(20) DEFAULT 'pending',
      total_amount DECIMAL(10,2) NOT NULL,
      final_amount DECIMAL(10,2) NOT NULL,
      currency VARCHAR(3) DEFAULT 'EGP',
      payment_status VARCHAR(20) DEFAULT 'pending',
      delivery_type VARCHAR(20) NOT NULL,
      loyalty_points_earned INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Create color_analysis table for ZOSAI AI features
    `CREATE TABLE IF NOT EXISTS color_analysis (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      image_url TEXT NOT NULL,
      extracted_colors JSONB,
      color_palette TEXT[],
      recommended_items INTEGER[],
      ai_analysis_data JSONB,
      confidence_score DECIMAL(3,2),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Create loyalty_transactions table
    `CREATE TABLE IF NOT EXISTS loyalty_transactions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
      transaction_type VARCHAR(20) NOT NULL,
      points INTEGER NOT NULL,
      description TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Create indexes for performance
    `CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id)`,
    `CREATE INDEX IF NOT EXISTS idx_users_location ON users(location_lat, location_lng)`,
    `CREATE INDEX IF NOT EXISTS idx_stores_location ON stores(location_lat, location_lng)`,
    `CREATE INDEX IF NOT EXISTS idx_items_store ON items(store_id)`,
    `CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id)`,
    `CREATE INDEX IF NOT EXISTS idx_color_analysis_user ON color_analysis(user_id)`
  ];
  
  try {
    for (const migration of migrations) {
      await pool.query(migration);
    }
    console.log('✅ ZOSAI database migrations completed');
  } catch (error) {
    console.error('❌ ZOSAI migration failed:', error);
    // Don't throw in development
    if (process.env.NODE_ENV === 'production') {
      throw error;
    }
  }
};

// Insert initial data for ZOSAI
const insertInitialData = async () => {
  try {
    // Insert categories
    const categoriesQuery = `
      INSERT INTO categories (name, slug, icon_url) VALUES
      ('Shirts', 'shirts', '👔'),
      ('Pants', 'pants', '👖'),
      ('Dresses', 'dresses', '👗'),
      ('Shoes', 'shoes', '👟'),
      ('Accessories', 'accessories', '👜')
      ON CONFLICT (slug) DO NOTHING
    `;
    await pool.query(categoriesQuery);
    
    console.log('✅ ZOSAI initial data inserted');
  } catch (error) {
    console.error('❌ Error inserting ZOSAI initial data:', error);
  }
};

// Execute query with error handling
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('ZOSAI DB query executed', { text: text.substring(0, 50), duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('ZOSAI database query error:', error);
    throw error;
  }
};

// Get client from pool
const getClient = async () => {
  return await pool.connect();
};

// Cache operations for ZOSAI
const cache = {
  get: async (key) => {
    if (!redisClient) return null;
    try {
      const value = await redisClient.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('ZOSAI cache get error:', error);
      return null;
    }
  },
  
  set: async (key, value, ttl = 3600) => {
    if (!redisClient) return;
    try {
      await redisClient.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.error('ZOSAI cache set error:', error);
    }
  },
  
  del: async (key) => {
    if (!redisClient) return;
    try {
      await redisClient.del(key);
    } catch (error) {
      console.error('ZOSAI cache delete error:', error);
    }
  }
};

module.exports = {
  pool,
  redisClient,
  connectDatabase,
  runZOSAIMigrations,
  insertInitialData,
  query,
  getClient,
  cache
};