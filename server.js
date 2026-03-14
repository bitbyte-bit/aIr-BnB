import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import crypto from "node:crypto";
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import webpush from 'web-push';

// Load environment variables
dotenv.config();

// VAPID Keys for Web Push - using env vars or fallbacks for development
const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY || 'BJ3bPi4mRiJb9Ny8aYRP-5AhLrT-Smmmc-Y2vYw-iIyv6EVKsWlBFnQLrGQqmJXhGbhcnNumcWdjjG6Bni1CRco',
  privateKey: process.env.VAPID_PRIVATE_KEY || 'FryIYnW_-3FMCWIbLhEYOSKMF7Btj_m4vXdnmF-u0Bw'
};

// Configure web-push
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:admin@vitu.app',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

console.log('Web Push VAPID public key:', vapidKeys.publicKey.substring(0, 20) + '...');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("Starting server initialization...");

const db = new Database("vitu.db");
console.log("Database connected.");

// Schema migration
try {
  const itemsInfo = db.prepare("PRAGMA table_info(items)").all();
  if (itemsInfo.length > 0 && itemsInfo.find(c => c.name === 'id')?.type === 'INTEGER') {
    db.exec("DROP TABLE IF EXISTS items");
    db.exec("DROP TABLE IF EXISTS likes"); 
    db.exec("DROP TABLE IF EXISTS comments");
  }

  const messagesInfo = db.prepare("PRAGMA table_info(messages)").all();
  if (messagesInfo.length > 0 && messagesInfo.find(c => c.name === 'id')?.type === 'INTEGER') {
    db.exec("DROP TABLE IF EXISTS messages");
  }
} catch (e) {
  console.error("Migration error:", e);
}

// Create billing_plans table if it doesn't exist
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS billing_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      monthly_price INTEGER NOT NULL DEFAULT 0,
      yearly_price INTEGER NOT NULL DEFAULT 0,
      lifetime_price INTEGER NOT NULL DEFAULT 0,
      features TEXT,
      monthly_payment_link TEXT,
      yearly_payment_link TEXT,
      lifetime_payment_link TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
} catch (e) {
  console.error("Error creating billing_plans table:", e);
}

// Add payment link columns to billing_plans if they don't exist
try {
  db.exec(`ALTER TABLE billing_plans ADD COLUMN monthly_payment_link TEXT`);
} catch (e) {}
try {
  db.exec(`ALTER TABLE billing_plans ADD COLUMN yearly_payment_link TEXT`);
} catch (e) {}
try {
  db.exec(`ALTER TABLE billing_plans ADD COLUMN lifetime_payment_link TEXT`);
} catch (e) {}

// Create business_subscriptions table if it doesn't exist
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS business_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER NOT NULL,
      plan_id INTEGER,
      status TEXT DEFAULT 'pending',
      start_date DATETIME,
      end_date DATETIME,
      payment_link TEXT,
      reference_code TEXT,
      payment_proof_image TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(business_id) REFERENCES businesses(id),
      FOREIGN KEY(plan_id) REFERENCES billing_plans(id)
    )
  `);
} catch (e) {
  console.error("Error creating business_subscriptions table:", e);
}

// Add payment_proof_image column to business_subscriptions if it doesn't exist
try {
  db.exec(`ALTER TABLE business_subscriptions ADD COLUMN payment_proof_image TEXT`);
} catch (e) {}

// Add is_active column to items table if it doesn't exist
try {
  db.exec(`ALTER TABLE items ADD COLUMN is_active INTEGER DEFAULT 1`);
} catch (e) {
  // Column may already exist, ignore error
}

// Create reviews table if it doesn't exist
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id TEXT,
      user_id INTEGER,
      user_name TEXT,
      rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
      text TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(item_id) REFERENCES items(id),
      FOREIGN KEY(user_id) REFERENCES users(id),
      UNIQUE(user_id, item_id)
    )
  `);
} catch (e) {
  console.error("Error creating reviews table:", e);
}

// Seed billing plans if they don't exist
try {
  const plansExist = db.prepare("SELECT COUNT(*) as count FROM billing_plans").get();
  if (!plansExist || plansExist.count === 0) {
    // Starter plan
    db.prepare(`
      INSERT INTO billing_plans (name, description, monthly_price, yearly_price, lifetime_price, features)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      'Starter',
      'Perfect for small businesses just getting started',
      10000,
      108000, // 10% discount: 120000 - 10% = 108000
      500000, // 5 months (5 * 10000 = 50000) - 40% discount
      JSON.stringify(['Up to 50 items', 'Basic analytics', 'Email support', 'Standard visibility'])
    );
    
    // Standard plan
    db.prepare(`
      INSERT INTO billing_plans (name, description, monthly_price, yearly_price, lifetime_price, features)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      'Standard',
      'Best for growing businesses with more needs',
      30000,
      288000, // 20% discount: 360000 - 20% = 288000
      1000000, // 5 months (5 * 30000 = 150000) - 40% discount
      JSON.stringify(['Unlimited items', 'Advanced analytics', 'Priority support', 'Top visibility', 'Custom branding'])
    );
    
    // Lifetime plan
    db.prepare(`
      INSERT INTO billing_plans (name, description, monthly_price, yearly_price, lifetime_price, features)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      'Lifetime',
      'Best value - pay once, enjoy forever',
      0,
      0,
      2000000,
      JSON.stringify(['Unlimited everything', 'Lifetime updates', '24/7 Premium support', 'Featured listings', 'White-label options', 'API access'])
    );
    
    console.log("Billing plans seeded successfully");
  }
} catch (e) {
  console.error("Error seeding billing plans:", e);
}

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password TEXT,
    name TEXT,
    bio TEXT,
    profile_picture TEXT,
    role TEXT DEFAULT 'user',
    status TEXT DEFAULT 'active'
  );

  CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    title TEXT,
    description TEXT,
    image_url TEXT,
    gallery TEXT,
    custom_fields TEXT,
    business_id INTEGER,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(business_id) REFERENCES businesses(id)
  );

  CREATE TABLE IF NOT EXISTS likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    item_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(item_id) REFERENCES items(id),
    UNIQUE(user_id, item_id)
  );

  CREATE TABLE IF NOT EXISTS analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id TEXT,
    user_id INTEGER,
    user_name TEXT,
    text TEXT,
    parent_id INTEGER DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(item_id) REFERENCES items(id),
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(parent_id) REFERENCES comments(id)
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id TEXT,
    user_id INTEGER,
    user_name TEXT,
    rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
    text TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(item_id) REFERENCES items(id),
    FOREIGN KEY(user_id) REFERENCES users(id),
    UNIQUE(user_id, item_id)
  );

  CREATE TABLE IF NOT EXISTS billing_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    monthly_price INTEGER NOT NULL DEFAULT 0,
    yearly_price INTEGER NOT NULL DEFAULT 0,
    lifetime_price INTEGER NOT NULL DEFAULT 0,
    features TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS business_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER NOT NULL,
    plan_id INTEGER,
    status TEXT DEFAULT 'inactive',
    start_date DATETIME,
    end_date DATETIME,
    payment_link TEXT,
    reference_code TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(business_id) REFERENCES businesses(id),
    FOREIGN KEY(plan_id) REFERENCES billing_plans(id)
  );

  CREATE TABLE IF NOT EXISTS businesses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id INTEGER UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    logo TEXT,
    address TEXT,
    contacts TEXT,
    social_handles TEXT,
    tel TEXT,
    type TEXT,
    is_approved INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(owner_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    sender_id INTEGER,
    receiver_id INTEGER,
    text TEXT,
    attachment TEXT,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(sender_id) REFERENCES users(id),
    FOREIGN KEY(receiver_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS follows (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    business_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(business_id) REFERENCES businesses(id),
    UNIQUE(user_id, business_id)
  );

  CREATE TABLE IF NOT EXISTS shares (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    item_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(item_id) REFERENCES items(id),
    UNIQUE(user_id, item_id)
  );
`);

// Add columns if they don't exist
try { db.exec("ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active'"); } catch (e) {}
try { db.exec("ALTER TABLE items ADD COLUMN gallery TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE items ADD COLUMN custom_fields TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE items ADD COLUMN business_id INTEGER REFERENCES businesses(id)"); } catch (e) {}
try { db.exec("ALTER TABLE comments ADD COLUMN parent_id INTEGER REFERENCES comments(id) DEFAULT NULL"); } catch (e) {}
try { db.exec("ALTER TABLE businesses ADD COLUMN address TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE businesses ADD COLUMN contacts TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE businesses ADD COLUMN social_handles TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE businesses ADD COLUMN tel TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE businesses ADD COLUMN type TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE messages ADD COLUMN is_read INTEGER DEFAULT 0"); } catch (e) {}
try { db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_likes_user_item ON likes(user_id, item_id)"); } catch (e) {}
try { db.exec("ALTER TABLE likes ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP"); } catch (e) {}
try { db.exec("ALTER TABLE comments ADD COLUMN attachment TEXT"); } catch (e) {}

// Create push_subscriptions table for Web Push notifications
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      endpoint TEXT NOT NULL,
      keys TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);
} catch (e) {
  console.error("Error creating push_subscriptions table:", e);
}

// Seed System User and Master Admin
const existingSystemUser = db.prepare("SELECT * FROM users WHERE email = ?").get("vitu@system.com");
if (!existingSystemUser) {
  db.prepare("INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)").run(
    "vitu@system.com",
    "system",
    "Vitu System",
    "user"
  );
  
  // Seed Master Admin
  db.prepare("INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)").run(
    "vitu@gmail.com",
    "vitu",
    "Master Admin",
    "admin"
  );
}

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  app.use(express.json({ limit: '50mb' }));

  // Request logger
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`${req.method} ${req.url} ${res.statusCode} ${duration}ms`);
    });
    next();
  });

  // Global error handler
  app.use((err, req, res, next) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", env: process.env.NODE_ENV });
  });

  // Push Notification Routes
  // Get VAPID public key for client to subscribe
  app.get("/api/push/vapid-key", (req, res) => {
    res.json({ publicKey: vapidKeys.publicKey });
  });

  // Subscribe to push notifications
  app.post("/api/push/subscribe", (req, res) => {
    const { userId, subscription } = req.body;
    
    if (!userId || !subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      // Delete any existing subscription for this user (one subscription per user)
      db.prepare("DELETE FROM push_subscriptions WHERE user_id = ?").run(userId);
      
      // Store new subscription
      db.prepare(
        "INSERT INTO push_subscriptions (user_id, endpoint, keys) VALUES (?, ?, ?)"
      ).run(userId, subscription.endpoint, JSON.stringify(subscription.keys));
      
      res.json({ success: true, message: "Push subscription saved" });
    } catch (err) {
      console.error("Error saving push subscription:", err);
      res.status(500).json({ error: "Failed to save subscription" });
    }
  });

  // Unsubscribe from push notifications
  app.post("/api/push/unsubscribe", (req, res) => {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }

    try {
      db.prepare("DELETE FROM push_subscriptions WHERE user_id = ?").run(userId);
      res.json({ success: true, message: "Push subscription removed" });
    } catch (err) {
      console.error("Error removing push subscription:", err);
      res.status(500).json({ error: "Failed to remove subscription" });
    }
  });

  // Auth Routes
  app.post("/api/auth/signup", (req, res) => {
    const { email, password, name } = req.body;
    
    // Validate password requirements
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }
    if (!/[A-Z]/.test(password)) {
      return res.status(400).json({ error: "Password must contain at least one uppercase letter" });
    }
    if (!/[a-z]/.test(password)) {
      return res.status(400).json({ error: "Password must contain at least one lowercase letter" });
    }
    if (!/[0-9]/.test(password)) {
      return res.status(400).json({ error: "Password must contain at least one numeric character" });
    }
    
    try {
      const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get().count;
      const role = userCount === 0 ? 'admin' : 'user';
      const stmt = db.prepare("INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)");
      const info = stmt.run(email, password, name, role);
      res.json({ id: info.lastInsertRowid, email, name, role, status: 'active' });
    } catch (err) {
      res.status(400).json({ error: "Email already exists" });
    }
  });

  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE email = ? AND password = ?").get(email, password);
    if (user) {
      if (user.status === 'suspended' || user.status === 'banned') {
        return res.status(403).json({ error: `Your account is ${user.status}.` });
      }
      const business = db.prepare("SELECT id FROM businesses WHERE owner_id = ?").get(user.id);
      res.json({ 
        id: user.id, 
        email: user.email, 
        name: user.name, 
        role: user.role, 
        bio: user.bio, 
        profile_picture: user.profile_picture,
        status: user.status,
        business_id: business?.id
      });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  // Profile Routes
  app.get("/api/profile/:id", (req, res) => {
    const user = db.prepare("SELECT id, email, name, bio, profile_picture, role, status FROM users WHERE id = ?").get(req.params.id);
    const business = db.prepare("SELECT id FROM businesses WHERE owner_id = ?").get(req.params.id);
    res.json({ ...user, business_id: business?.id });
  });

  app.put("/api/profile/:id", (req, res) => {
    const { name, bio, profile_picture } = req.body;
    db.prepare("UPDATE users SET name = ?, bio = ?, profile_picture = ? WHERE id = ?").run(name, bio, profile_picture, req.params.id);
    res.json({ success: true });
  });

  app.put("/api/profile/:id/password", (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = parseInt(req.params.id);
    
    // Validate password requirements
    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }
    if (!/[A-Z]/.test(newPassword)) {
      return res.status(400).json({ error: "Password must contain at least one uppercase letter" });
    }
    if (!/[a-z]/.test(newPassword)) {
      return res.status(400).json({ error: "Password must contain at least one lowercase letter" });
    }
    if (!/[0-9]/.test(newPassword)) {
      return res.status(400).json({ error: "Password must contain at least one numeric character" });
    }
    
    try {
      // Get current password hash
      const user = db.prepare("SELECT password FROM users WHERE id = ?").get(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // For simplicity, we're comparing directly. In production, use bcrypt
      if (user.password !== currentPassword) {
        return res.status(400).json({ error: "Current password is incorrect" });
      }
      
      // Update password
      db.prepare("UPDATE users SET password = ? WHERE id = ?").run(newPassword, userId);
      
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to change password" });
    }
  });

  // Business Routes
  app.post("/api/businesses", (req, res) => {
    const { ownerId, name, description, type, logo, address, contacts, social_handles, tel } = req.body;
    try {
      const info = db.prepare("INSERT INTO businesses (owner_id, name, description, type, logo, address, contacts, social_handles, tel) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run(ownerId, name, description, type, logo, address, contacts, social_handles, tel);
      res.json({ id: info.lastInsertRowid, name });
    } catch (err) {
      res.status(400).json({ error: "User already has a business or name taken" });
    }
  });

  app.put("/api/businesses/:id", (req, res) => {
    const { name, description, type, logo, address, contacts, social_handles, tel } = req.body;
    try {
      db.prepare("UPDATE businesses SET name = ?, description = ?, type = ?, logo = ?, address = ?, contacts = ?, social_handles = ?, tel = ? WHERE id = ?").run(name, description, type, logo, address, contacts, social_handles, tel, req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: "Failed to update business" });
    }
  });

  app.get("/api/businesses/my/:ownerId", (req, res) => {
    const business = db.prepare(`
      SELECT *, (SELECT COUNT(*) FROM follows WHERE business_id = businesses.id) as followers_count
      FROM businesses WHERE owner_id = ?
    `).get(req.params.ownerId);
    res.json(business || null);
  });

  app.get("/api/businesses/:id", (req, res) => {
    const business = db.prepare(`
      SELECT *, (SELECT COUNT(*) FROM follows WHERE business_id = businesses.id) as followers_count
      FROM businesses WHERE id = ?
    `).get(req.params.id);
    res.json(business);
  });

  app.get("/api/business-types", (req, res) => {
    const types = db.prepare("SELECT DISTINCT type FROM businesses WHERE type IS NOT NULL AND type != ''").all();
    const defaultTypes = ['Retailer', 'Motor Spare', 'Blocker', 'Repairer', 'Transporter', 'Food Deliverer'];
    const allTypes = Array.from(new Set([...defaultTypes, ...types.map(t => t.type)]));
    res.json(allTypes);
  });

  app.get("/api/businesses/:id/analytics", (req, res) => {
    const businessId = req.params.id;
    try {
      const totalItems = db.prepare("SELECT COUNT(*) as count FROM items WHERE business_id = ?").get(businessId).count;
      const totalLikes = db.prepare(`
        SELECT COUNT(*) as count FROM likes 
        JOIN items ON likes.item_id = items.id 
        WHERE items.business_id = ?
      `).get(businessId).count;
      const totalFollowers = db.prepare("SELECT COUNT(*) as count FROM follows WHERE business_id = ?").get(businessId).count;
      
      const likesByDay = db.prepare(`
        SELECT date(likes.created_at) as date, COUNT(*) as count 
        FROM likes 
        JOIN items ON likes.item_id = items.id 
        WHERE items.business_id = ? 
        GROUP BY date(likes.created_at) 
        ORDER BY date ASC 
        LIMIT 7
      `).all(businessId);

      res.json({ totalItems, totalLikes, totalFollowers, likesByDay });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  app.get("/api/admin/id", (req, res) => {
    const admin = db.prepare("SELECT id FROM users WHERE role = 'admin' ORDER BY id ASC LIMIT 1").get();
    res.json({ id: admin?.id });
  });

  // Items Routes
  app.get("/api/items", (req, res) => {
    const items = db.prepare(`
      SELECT items.*, businesses.name as business_name, businesses.is_approved,
      (SELECT COUNT(*) FROM likes WHERE item_id = items.id) as likes,
      (SELECT COUNT(*) FROM comments WHERE item_id = items.id) as comments_count,
      (SELECT COUNT(*) FROM shares WHERE item_id = items.id) as shares_count,
      (SELECT COUNT(*) FROM follows WHERE business_id = items.business_id) as followers_count,
      (SELECT bs.status FROM business_subscriptions bs WHERE bs.business_id = items.business_id AND bs.status = 'active' ORDER BY bs.created_at DESC LIMIT 1) as subscription_status,
      (SELECT bp.name FROM business_subscriptions bs JOIN billing_plans bp ON bs.plan_id = bp.id WHERE bs.business_id = items.business_id AND bs.status = 'active' ORDER BY bs.created_at DESC LIMIT 1) as subscription_plan
      FROM items 
      LEFT JOIN businesses ON items.business_id = businesses.id 
      ORDER BY created_at DESC
    `).all();
    res.json(items);
  });

  // Get single item by ID
  app.get("/api/items/:id", (req, res) => {
    try {
      const item = db.prepare(`
        SELECT items.*, businesses.name as business_name, businesses.is_approved,
        (SELECT COUNT(*) FROM likes WHERE item_id = items.id) as likes,
        (SELECT COUNT(*) FROM comments WHERE item_id = items.id) as comments_count,
        (SELECT COUNT(*) FROM shares WHERE item_id = items.id) as shares_count,
        (SELECT COUNT(*) FROM follows WHERE business_id = items.business_id) as followers_count,
        (SELECT AVG(rating) FROM reviews WHERE item_id = items.id) as average_rating,
        (SELECT COUNT(*) FROM reviews WHERE item_id = items.id) as reviews_count
        FROM items 
        LEFT JOIN businesses ON items.business_id = businesses.id 
        WHERE items.id = ?
      `).get(req.params.id);
      
      if (!item) {
        return res.status(404).json({ error: 'Item not found' });
      }
      res.json(item);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/items", (req, res) => {
    const { title, description, image_url, gallery, custom_fields, business_id } = req.body;
    
    const business = db.prepare("SELECT is_approved FROM businesses WHERE id = ?").get(business_id);
    if (!business || business.is_approved !== 1) {
      return res.status(403).json({ error: "Business must be approved by admin to post items." });
    }

    const id = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
    db.prepare("INSERT INTO items (id, title, description, image_url, gallery, custom_fields, business_id) VALUES (?, ?, ?, ?, ?, ?, ?)").run(id, title, description, image_url, gallery || null, custom_fields || null, business_id || null);
    const newItem = db.prepare("SELECT * FROM items WHERE id = ?").get(id);
    
    io.emit("notification", { 
      type: 'new_item', 
      title: 'New Item Posted!', 
      body: `${title} is now available.` 
    });
    
    // Send push notifications to all subscribed users (even when app is closed)
    const pushNotificationPayload = JSON.stringify({
      title: 'New Item Posted!',
      body: `${title} is now available.`,
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      tag: 'new-item-' + id,
      data: { itemId: id, type: 'new_item' }
    });
    
    // Get all push subscriptions
    const subscriptions = db.prepare("SELECT * FROM push_subscriptions").all();
    
    // Send push notification to each subscriber
    for (const sub of subscriptions) {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: JSON.parse(sub.keys)
      };
      
      webpush.sendNotification(pushSubscription, pushNotificationPayload)
        .then(() => console.log(`Push notification sent to user ${sub.user_id}`))
        .catch((err) => {
          if (err.statusCode === 410) {
            // Subscription expired, remove it
            db.prepare("DELETE FROM push_subscriptions WHERE id = ?").run(sub.id);
            console.log(`Removed expired push subscription for user ${sub.user_id}`);
          } else {
            console.error("Error sending push notification:", err);
          }
        });
    }
    
    res.json(newItem);
  });

  app.get("/api/businesses/:id/items", (req, res) => {
    try {
      const items = db.prepare("SELECT * FROM items WHERE business_id = ? ORDER BY created_at DESC").all(req.params.id);
      res.json(items);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch business items" });
    }
  });

  app.delete("/api/items/:id", (req, res) => {
    try {
      db.prepare("DELETE FROM likes WHERE item_id = ?").run(req.params.id);
      db.prepare("DELETE FROM comments WHERE item_id = ?").run(req.params.id);
      db.prepare("DELETE FROM items WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete item" });
    }
  });

  app.put("/api/items/:id", (req, res) => {
    const { title, description, image_url, gallery, custom_fields, is_active } = req.body;
    try {
      db.prepare(`
        UPDATE items 
        SET title = ?, description = ?, image_url = COALESCE(?, image_url), gallery = COALESCE(?, gallery), custom_fields = COALESCE(?, custom_fields), is_active = COALESCE(?, is_active)
        WHERE id = ?
      `).run(title, description, image_url, gallery, custom_fields, is_active, req.params.id);
      
      const updatedItem = db.prepare("SELECT * FROM items WHERE id = ?").get(req.params.id);
      res.json(updatedItem);
    } catch (err) {
      res.status(500).json({ error: "Failed to update item" });
    }
  });

  // Toggle item active status
  app.patch("/api/items/:id/status", (req, res) => {
    const { is_active } = req.body;
    try {
      db.prepare("UPDATE items SET is_active = ? WHERE id = ?").run(is_active ? 1 : 0, req.params.id);
      
      const updatedItem = db.prepare("SELECT * FROM items WHERE id = ?").get(req.params.id);
      res.json(updatedItem);
    } catch (err) {
      res.status(500).json({ error: "Failed to update item status" });
    }
  });

  // Engagement Routes
  app.get("/api/items/:id/comments", (req, res) => {
    const comments = db.prepare("SELECT * FROM comments WHERE item_id = ? ORDER BY created_at DESC").all(req.params.id);
    res.json(comments);
  });

  app.post("/api/items/:id/comments", (req, res) => {
    const { userId, userName, text, parentId, attachment } = req.body;
    const itemId = req.params.id;
    const info = db.prepare("INSERT INTO comments (item_id, user_id, user_name, text, parent_id, attachment) VALUES (?, ?, ?, ?, ?, ?)").run(itemId, userId, userName, text, parentId || null, attachment || null);
    const newComment = db.prepare("SELECT * FROM comments WHERE id = ?").get(info.lastInsertRowid);
    
    io.emit("engagement", { itemId, type: 'comment', comment: newComment, userName });
    
    const item = db.prepare("SELECT title FROM items WHERE id = ?").get(itemId);
    io.emit("notification", {
      type: 'comment',
      title: 'New Comment!',
      body: `${userName} commented on ${item.title}`
    });

    res.json(newComment);
  });

  app.put("/api/comments/:id", (req, res) => {
    const { text } = req.body;
    db.prepare("UPDATE comments SET text = ? WHERE id = ?").run(text, req.params.id);
    res.json({ success: true });
  });

  app.post("/api/items/:id/like", (req, res) => {
    const { userId } = req.body;
    const itemId = req.params.id;
    try {
      db.prepare("INSERT INTO likes (user_id, item_id) VALUES (?, ?)").run(userId, itemId);
      db.prepare("INSERT INTO analytics (event_type) VALUES ('like')").run();
      
      const user = db.prepare("SELECT name FROM users WHERE id = ?").get(userId);
      const likeCount = db.prepare("SELECT COUNT(*) as count FROM likes WHERE item_id = ?").get(itemId);
      io.emit("engagement", { itemId, type: 'like', count: likeCount.count, userName: user?.name || 'Someone' });
      
      const item = db.prepare("SELECT title FROM items WHERE id = ?").get(itemId);
      io.emit("notification", {
        type: 'like',
        title: 'New Like!',
        body: `Someone liked your item: ${item.title}`
      });
      
      res.json({ success: true });
    } catch (err) {
      res.json({ success: false, message: "Already liked" });
    }
  });

  // Share endpoint
  app.post("/api/items/:id/share", (req, res) => {
    const { userId } = req.body;
    const itemId = req.params.id;
    try {
      db.prepare("INSERT INTO shares (user_id, item_id) VALUES (?, ?)").run(userId, itemId);
      
      const shareCount = db.prepare("SELECT COUNT(*) as count FROM shares WHERE item_id = ?").get(itemId);
      io.emit("engagement", { itemId, type: 'share', count: shareCount.count });
      
      res.json({ success: true, shares_count: shareCount.count });
    } catch (err) {
      res.json({ success: false, message: "Already shared" });
    }
  });

  // Reviews Routes
  app.get("/api/items/:id/reviews", (req, res) => {
    try {
      const reviews = db.prepare(`
        SELECT reviews.*, users.profile_picture as user_avatar 
        FROM reviews 
        LEFT JOIN users ON reviews.user_id = users.id 
        WHERE item_id = ? 
        ORDER BY user_id = ? DESC, created_at DESC
      `).all(req.params.id, req.query.userId || null);
      
      // Get average rating
      const avgRating = db.prepare(
        "SELECT AVG(rating) as average_rating, COUNT(*) as total_reviews FROM reviews WHERE item_id = ?"
      ).get(req.params.id);
      
      res.json({ reviews, average_rating: avgRating?.average_rating || 0, total_reviews: avgRating?.total_reviews || 0 });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/items/:id/reviews", (req, res) => {
    const { userId, userName, rating, text } = req.body;
    const itemId = req.params.id;
    
    try {
      // Check if user already reviewed this item
      const existingReview = db.prepare(
        "SELECT id FROM reviews WHERE item_id = ? AND user_id = ?"
      ).get(itemId, userId);
      
      if (existingReview) {
        // Update existing review
        db.prepare(
          "UPDATE reviews SET rating = ?, text = ? WHERE item_id = ? AND user_id = ?"
        ).run(rating, text || null, itemId, userId);
        
        const updatedReview = db.prepare(
          "SELECT reviews.*, users.profile_picture as user_avatar FROM reviews LEFT JOIN users ON reviews.user_id = users.id WHERE item_id = ? AND user_id = ?"
        ).get(itemId, userId);
        
        return res.json(updatedReview);
      }
      
      const info = db.prepare(
        "INSERT INTO reviews (item_id, user_id, user_name, rating, text) VALUES (?, ?, ?, ?, ?)"
      ).run(itemId, userId, userName, rating, text || null);
      
      const newReview = db.prepare(
        "SELECT reviews.*, users.profile_picture as user_avatar FROM reviews LEFT JOIN users ON reviews.user_id = users.id WHERE reviews.id = ?"
      ).get(info.lastInsertRowid);
      
      // Emit notification
      const item = db.prepare("SELECT title FROM items WHERE id = ?").get(itemId);
      io.emit("notification", {
        type: 'review',
        title: 'New Review!',
        body: `${userName} reviewed ${item.title}`
      });
      
      res.json(newReview);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Billing Routes
  app.get("/api/billing/plans", (req, res) => {
    try {
      const plans = db.prepare("SELECT * FROM billing_plans ORDER BY monthly_price ASC").all();
      res.json(plans);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/businesses/:id/subscription", (req, res) => {
    try {
      const subscription = db.prepare(`
        SELECT bs.*, bp.name as plan_name, bp.monthly_price, bp.yearly_price, bp.lifetime_price, bp.features
        FROM business_subscriptions bs
        LEFT JOIN billing_plans bp ON bs.plan_id = bp.id
        WHERE bs.business_id = ?
        ORDER BY bs.created_at DESC
        LIMIT 1
      `).get(req.params.id);
      res.json(subscription || null);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/businesses/:id/subscription", (req, res) => {
    const { planId, duration } = req.body;
    const businessId = req.params.id;
    
    try {
      const plan = db.prepare("SELECT * FROM billing_plans WHERE id = ?").get(planId);
      if (!plan) {
        return res.status(404).json({ error: "Plan not found" });
      }
      
      let price = 0;
      let endDate = null;
      
      if (duration === 'monthly') {
        price = plan.monthly_price;
        endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 1);
      } else if (duration === 'yearly') {
        price = plan.yearly_price;
        endDate = new Date();
        endDate.setFullYear(endDate.getFullYear() + 1);
      } else if (duration === 'lifetime') {
        price = plan.lifetime_price;
        endDate = new Date('2099-12-31');
      }
      
      // Generate reference code
      const refCode = `VITU-SUB-${businessId}-${Date.now()}`;
      
      const info = db.prepare(`
        INSERT INTO business_subscriptions (business_id, plan_id, status, start_date, end_date, reference_code)
        VALUES (?, ?, 'pending', datetime('now'), ?, ?)
      `).run(businessId, planId, endDate ? endDate.toISOString() : null, refCode);
      
      const subscription = db.prepare("SELECT * FROM business_subscriptions WHERE id = ?").get(info.lastInsertRowid);
      res.json({ ...subscription, price });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Upload payment proof image
  app.patch("/api/subscriptions/:id/payment-proof", (req, res) => {
    const { payment_proof_image } = req.body;
    try {
      db.prepare("UPDATE business_subscriptions SET payment_proof_image = ? WHERE id = ?").run(payment_proof_image, req.params.id);
      const subscription = db.prepare("SELECT * FROM business_subscriptions WHERE id = ?").get(req.params.id);
      res.json(subscription);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Approve or reject subscription (admin)
  app.patch("/api/admin/subscriptions/:id/approve", (req, res) => {
    const { status } = req.body; // 'approved' or 'rejected'
    try {
      if (status === 'approved') {
        db.prepare("UPDATE business_subscriptions SET status = 'approved' WHERE id = ?").run(req.params.id);
      } else if (status === 'rejected') {
        db.prepare("UPDATE business_subscriptions SET status = 'rejected' WHERE id = ?").run(req.params.id);
      }
      const subscription = db.prepare(`
        SELECT bs.*, bp.name as plan_name, b.name as business_name
        FROM business_subscriptions bs
        LEFT JOIN billing_plans bp ON bs.plan_id = bp.id
        LEFT JOIN businesses b ON bs.business_id = b.id
        WHERE bs.id = ?
      `).get(req.params.id);
      res.json(subscription);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get pending subscriptions (admin)
  app.get("/api/admin/subscriptions/pending", (req, res) => {
    try {
      const subscriptions = db.prepare(`
        SELECT bs.*, bp.name as plan_name, b.name as business_name, b.owner_id
        FROM business_subscriptions bs
        LEFT JOIN billing_plans bp ON bs.plan_id = bp.id
        LEFT JOIN businesses b ON bs.business_id = b.id
        WHERE bs.status = 'pending'
        ORDER BY bs.created_at DESC
      `).all();
      res.json(subscriptions);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/businesses/:id/billing-status", (req, res) => {
    try {
      const businessId = req.params.id;
      
      // Get item count and total likes
      const stats = db.prepare(`
        SELECT 
          COUNT(DISTINCT i.id) as item_count,
          COALESCE(SUM(likes.like_count), 0) as total_likes
        FROM items i
        LEFT JOIN (
          SELECT item_id, COUNT(*) as like_count 
          FROM likes 
          GROUP BY item_id
        ) likes ON i.id = likes.item_id
        WHERE i.business_id = ?
      `).get(businessId);
      
      // Get current subscription
      const subscription = db.prepare(`
        SELECT bs.*, bp.name as plan_name
        FROM business_subscriptions bs
        LEFT JOIN billing_plans bp ON bs.plan_id = bp.id
        WHERE bs.business_id = ? AND bs.status = 'active'
        ORDER BY bs.created_at DESC
        LIMIT 1
      `).get(businessId);
      
      const needsBilling = stats.item_count >= 10 && stats.total_likes >= 20 && !subscription;
      
      res.json({
        itemCount: stats.item_count,
        totalLikes: stats.total_likes,
        needsBilling,
        subscription
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin billing settings
  app.get("/api/admin/billing-settings", (req, res) => {
    try {
      const plans = db.prepare("SELECT * FROM billing_plans").all();
      res.json(plans);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/admin/billing-plans/:id", (req, res) => {
    const { name, description, monthly_price, yearly_price, lifetime_price, features, monthly_payment_link, yearly_payment_link, lifetime_payment_link } = req.body;
    try {
      db.prepare(`
        UPDATE billing_plans 
        SET name = ?, description = ?, monthly_price = ?, yearly_price = ?, lifetime_price = ?, features = ?, monthly_payment_link = ?, yearly_payment_link = ?, lifetime_payment_link = ?
        WHERE id = ?
      `).run(name, description, monthly_price, yearly_price, lifetime_price, features, monthly_payment_link, yearly_payment_link, lifetime_payment_link, req.params.id);
      
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/admin/billing-plans", (req, res) => {
    const { name, description, monthly_price, yearly_price, lifetime_price, features } = req.body;
    try {
      const info = db.prepare(`
        INSERT INTO billing_plans (name, description, monthly_price, yearly_price, lifetime_price, features)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(name, description, monthly_price, yearly_price, lifetime_price, features);
      
      res.json({ id: info.lastInsertRowid, success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin Routes
  app.get("/api/admin/users", (req, res) => {
    const users = db.prepare(`
      SELECT users.id, users.email, users.name, users.role, users.status, users.bio, users.profile_picture, businesses.id as business_id, businesses.name as business_name
      FROM users
      LEFT JOIN businesses ON users.id = businesses.owner_id
    `).all();
    res.json(users);
  });

  // Get detailed user information for admin
  app.get("/api/admin/users/:id/details", (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Get user basic info
      const user = db.prepare(`
        SELECT users.id, users.email, users.name, users.role, users.status, users.bio, users.profile_picture, users.created_at,
        businesses.id as business_id, businesses.name as business_name, businesses.description as business_description, businesses.phone as business_phone
        FROM users
        LEFT JOIN businesses ON users.id = businesses.owner_id
        WHERE users.id = ?
      `).get(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Get user's items count
      const itemsCount = db.prepare(`
        SELECT COUNT(*) as count FROM items WHERE business_id = ?
      `).get(user.business_id || 0);
      
      // Get user's total likes across all items
      const likesCount = db.prepare(`
        SELECT COUNT(*) as count FROM likes 
        JOIN items ON likes.item_id = items.id 
        WHERE items.business_id = ?
      `).get(user.business_id || 0);
      
      // Get user's total comments
      const commentsCount = db.prepare(`
        SELECT COUNT(*) as count FROM comments 
        JOIN items ON comments.item_id = items.id 
        WHERE items.business_id = ?
      `).get(user.business_id || 0);
      
      // Get user's businesses
      const businesses = db.prepare(`
        SELECT * FROM businesses WHERE owner_id = ?
      `).all(userId);
      
      // Get recent items
      const recentItems = db.prepare(`
        SELECT items.*, 
        (SELECT COUNT(*) FROM likes WHERE item_id = items.id) as likes,
        (SELECT COUNT(*) FROM comments WHERE item_id = items.id) as comments
        FROM items 
        WHERE business_id = ?
        ORDER BY items.created_at DESC 
        LIMIT 10
      `).all(user.business_id || 0);
      
      res.json({
        ...user,
        performance: {
          itemsCount: itemsCount?.count || 0,
          likesCount: likesCount?.count || 0,
          commentsCount: commentsCount?.count || 0,
          businessesCount: businesses.length
        },
        businesses,
        recentItems
      });
    } catch (err) {
      console.error("Error fetching user details:", err);
      res.status(500).json({ error: "Failed to fetch user details" });
    }
  });

  app.get("/api/admin/businesses", (req, res) => {
    const businesses = db.prepare(`
      SELECT businesses.*, 
      (SELECT COUNT(*) FROM items WHERE business_id = businesses.id) as item_count,
      (SELECT COUNT(*) FROM follows WHERE business_id = businesses.id) as follower_count,
      (SELECT COUNT(*) FROM likes JOIN items ON likes.item_id = items.id WHERE items.business_id = businesses.id) as like_count
      FROM businesses
    `).all();
    res.json(businesses);
  });

  app.put("/api/admin/users/:id/status", (req, res) => {
    const { status } = req.body;
    db.prepare("UPDATE users SET status = ? WHERE id = ?").run(status, req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/admin/users/:id", (req, res) => {
    db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.put("/api/admin/businesses/:id/approve", (req, res) => {
    const { is_approved } = req.body;
    db.prepare("UPDATE businesses SET is_approved = ? WHERE id = ?").run(is_approved ? 1 : 0, req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/admin/businesses/:id", (req, res) => {
    db.prepare("DELETE FROM businesses WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Messaging Routes
  app.post("/api/messages", (req, res) => {
    const { sender_id, receiver_id, text, attachment } = req.body;
    const id = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
    db.prepare("INSERT INTO messages (id, sender_id, receiver_id, text, attachment) VALUES (?, ?, ?, ?, ?)").run(id, sender_id, receiver_id, text, attachment);
    const newMessage = db.prepare("SELECT * FROM messages WHERE id = ?").get(id);
    io.emit("message", newMessage);
    res.json(newMessage);
  });

  app.get("/api/messages/business/:businessId", (req, res) => {
    const business = db.prepare("SELECT owner_id FROM businesses WHERE id = ?").get(req.params.businessId);
    if (!business) return res.status(404).json({ error: "Business not found" });
    
    const messages = db.prepare(`
      SELECT messages.*, users.name as sender_name, users.profile_picture as sender_avatar
      FROM messages 
      JOIN users ON messages.sender_id = users.id
      WHERE receiver_id = ? 
      ORDER BY created_at DESC
    `).all(business.owner_id);
    res.json(messages);
  });

  app.put("/api/messages/:id/read", (req, res) => {
    db.prepare("UPDATE messages SET is_read = 1 WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/messages/:userId/:otherId", (req, res) => {
    const { userId, otherId } = req.params;
    const messages = db.prepare(`
      SELECT * FROM messages 
      WHERE (sender_id = ? AND receiver_id = ?) 
      OR (sender_id = ? AND receiver_id = ?)
      ORDER BY created_at ASC
    `).all(userId, otherId, otherId, userId);
    res.json(messages);
  });

  // Follow Routes
  app.post("/api/businesses/:id/follow", (req, res) => {
    const { userId } = req.body;
    try {
      db.prepare("INSERT INTO follows (user_id, business_id) VALUES (?, ?)").run(userId, req.params.id);
      
      const business = db.prepare("SELECT owner_id, name FROM businesses WHERE id = ?").get(req.params.id);
      const vitu = db.prepare("SELECT id FROM users WHERE email = 'vitu@system.com'").get();
      if (business && vitu) {
        const msgId = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
        const notificationText = `New follower! A user has started following ${business.name}.`;
        db.prepare("INSERT INTO messages (id, sender_id, receiver_id, text) VALUES (?, ?, ?, ?)").run(msgId, vitu.id, business.owner_id, notificationText);
        io.emit('notification', { receiver_id: business.owner_id, text: notificationText, type: 'follow' });
      }

      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: "Already following" });
    }
  });

  app.delete("/api/businesses/:id/follow/:userId", (req, res) => {
    db.prepare("DELETE FROM follows WHERE user_id = ? AND business_id = ?").run(req.params.userId, req.params.id);
    res.json({ success: true });
  });

  app.get("/api/businesses/:id/follow-status/:userId", (req, res) => {
    const follow = db.prepare("SELECT * FROM follows WHERE user_id = ? AND business_id = ?").get(req.params.userId, req.params.id);
    res.json({ isFollowing: !!follow });
  });

  // Analytics Routes
  app.get("/api/admin/analytics", (req, res) => {
    try {
      const likesByDay = db.prepare(`
        SELECT DATE(timestamp) as date, COUNT(*) as count 
        FROM analytics 
        WHERE event_type = 'like' 
        GROUP BY DATE(timestamp)
        LIMIT 7
      `).all();
      
      const totalUsers = db.prepare("SELECT COUNT(*) as count FROM users").get().count;
      const totalItems = db.prepare("SELECT COUNT(*) as count FROM items").get().count;
      const totalLikes = db.prepare("SELECT COUNT(*) as count FROM likes").get().count;

      res.json({ likesByDay, totalUsers, totalItems, totalLikes });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch admin analytics" });
    }
  });

  // Search Route
  app.get("/api/search", (req, res) => {
    const { q } = req.query;
    if (!q) return res.json({ items: [], businesses: [] });
    
    const searchTerm = `%${q}%`;
    
    try {
      const items = db.prepare(`
        SELECT items.*, businesses.name as business_name,
        (SELECT COUNT(*) FROM likes WHERE item_id = items.id) as likes,
        (SELECT COUNT(*) FROM follows WHERE business_id = items.business_id) as followers_count
        FROM items 
        LEFT JOIN businesses ON items.business_id = businesses.id 
        WHERE items.title LIKE ? OR items.description LIKE ?
        ORDER BY items.created_at DESC
      `).all(searchTerm, searchTerm);
      
      const businesses = db.prepare(`
        SELECT *,
        (SELECT COUNT(*) FROM follows WHERE business_id = businesses.id) as followers_count
        FROM businesses 
        WHERE name LIKE ? OR description LIKE ? OR type LIKE ?
        ORDER BY created_at DESC
      `).all(searchTerm, searchTerm, searchTerm);
      
      res.json({ items, businesses });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Search failed" });
    }
  });

  // Check if running in production mode
  const isProduction = process.env.NODE_ENV === 'production' || fs.existsSync(path.join(__dirname, 'dist'));
  
  // Validate production mode has dist folder
  if (isProduction && !fs.existsSync(path.join(__dirname, 'dist'))) {
    console.error("[ERROR] Production mode requires running 'npm run build' first!");
    console.error("[ERROR] Run 'npm run build' to create the dist folder, then try again.");
    process.exit(1);
  }

  // Serve static files from dist folder with explicit MIME types
  if (isProduction) {
    app.use(express.static(path.join(__dirname, "dist"), {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.js') || filePath.endsWith('.mjs')) {
          res.setHeader('Content-Type', 'text/javascript');
        } else if (filePath.endsWith('.css')) {
          res.setHeader('Content-Type', 'text/css');
        } else if (filePath.endsWith('.json')) {
          res.setHeader('Content-Type', 'application/json');
        } else if (filePath.endsWith('.html')) {
          res.setHeader('Content-Type', 'text/html');
        } else if (filePath.endsWith('.wasm')) {
          res.setHeader('Content-Type', 'application/wasm');
        }
      }
    }));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  } else {
    // Development mode: use Vite middleware
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0' },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  const PORT = 3000;
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });

  io.on("connection", (socket) => {
    console.log("A user connected");
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
});
