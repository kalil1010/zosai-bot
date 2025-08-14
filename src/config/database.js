const pg = require('pg');

// PostgreSQL setup with error handling
let pool = null;
if (process.env.DATABASE_URL) {
  pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
}

// Redis setup with error handling
let redisClient = null;
try {
  if (process.env.REDIS_URL) {
    const redis = require('redis');
    redisClient = redis.createClient({
      url: process.env.REDIS_URL
    });
    
    redisClient.on('error', (err) => {
      console.log('⚠️ Redis connection issue, continuing without Redis:', err.message);
    });
  }
} catch (error) {
  console.log('📝 Redis not configured, using memory sessions');
}

// Database connection function for ZOSAI
const connectDatabase = async () => {
  try {
    // Skip database if not configured
    if (!process.env.DATABASE_URL && !process.env.REDIS_URL) {
      console.log('📝 ZOSAI running in basic mode (no databases configured)');
      return;
    }

    // Test PostgreSQL connection
    if (pool && process.env.DATABASE_URL) {
      try {
        const client = await pool.connect();
        console.log('✅ ZOSAI connected to PostgreSQL');
        client.release();
        await createTables();
      } catch (error) {
        console.log('⚠️ PostgreSQL unavailable, continuing without it:', error.message);
      }
    }
    
    // Test Redis connection
    if (redisClient && process.env.REDIS_URL) {
      try {
        await redisClient.connect();
        console.log('✅ ZOSAI connected to Redis');
      } catch (error) {
        console.log('⚠️ Redis unavailable, continuing without it:', error.message);
      }
    }
    
  } catch (error) {
    console.log('⚠️ Database connections skipped, ZOSAI running in basic mode');
  }
};

// Create tables with error handling
const createTables = async () => {
  if (!pool) return;
  
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT UNIQUE NOT NULL,
        username VARCHAR(255),
        first_name VARCHAR(255),
        user_type VARCHAR(20) DEFAULT 'customer',
        loyalty_points INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('✅ ZOSAI database tables ready');
  } catch (error) {
    console.log('⚠️ Database table creation skipped');
  }
};

// Safe query function
const query = async (text, params) => {
  if (!pool) {
    console.log('📝 Database query skipped (no connection)');
    return null;
  }
  
  try {
    const res = await pool.query(text, params);
    return res;
  } catch (error) {
    console.error('Database query error:', error.message);
    return null;
  }
};

// Cache operations (fallback to memory if no Redis)
const cache = {
  memoryCache: new Map(),
  
  get: async (key) => {
    if (redisClient) {
      try {
        const value = await redisClient.get(key);
        return value ? JSON.parse(value) : null;
      } catch (error) {
        return this.memoryCache.get(key) || null;
      }
    }
    return this.memoryCache.get(key) || null;
  },
  
  set: async (key, value, ttl = 3600) => {
    if (redisClient) {
      try {
        await redisClient.setex(key, ttl, JSON.stringify(value));
      } catch (error) {
        this.memoryCache.set(key, value);
      }
    } else {
      this.memoryCache.set(key, value);
    }
  }
};

module.exports = {
  pool,
  redisClient,
  connectDatabase,
  query,
  cache
};
