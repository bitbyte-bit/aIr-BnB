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
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import fileUpload from 'express-fileupload';

// Load environment variables
dotenv.config();

// Google OAuth2 client config (for server-side token verification)
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '847389374219-ukfm55dmakc3aiarg18723gor5mvj9sf.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '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';


// VAPID Keys for Web Push - using env vars or fallbacks for development
const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY || 'BJ3bPi4mRiJb9Ny8aYRP-5AhLrT-Smmmc-Y2vYw-iIyv6EVKsWlBFnQLrGQqmJXhGbhcnNumcWdjjG6Bni1CRco',
  privateKey: process.env.VAPID_PRIVATE_KEY || 'FryIYnW_-3FMCWIbLhEYOSKMF7Btj_m4vXdnmF-u0Bw'
};

// Configure web-push
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || ' ',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

console.log('Web Push VAPID public key:', vapidKeys.publicKey.substring(0, 20) + '...');

// Email Configuration
const emailConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: parseInt(process.env.SMTP_PORT || '587') === 465,
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || ''
  },
  from: process.env.SMTP_FROM || 'Vitu <noreply@vitu.app>'
};

// Create email transporter
let transporter = null;
if (emailConfig.auth.user && emailConfig.auth.pass) {
  transporter = nodemailer.createTransport({
    host: emailConfig.host,
    port: emailConfig.port,
    secure: emailConfig.secure,
    auth: {
      user: emailConfig.auth.user,
      pass: emailConfig.auth.pass
    }
  });
  console.log('Email transporter configured');
} else {
  console.log('Email not configured - verification emails will be logged only');
}

// Function to send verification email
async function sendVerificationEmail(email, name, token) {
  const appUrl = process.env.APP_URL || 'https://vitu.onrender.com';
  const verificationUrl = `${appUrl}/verify-email?token=${token}&email=${encodeURIComponent(email)}`;
  
  const mailOptions = {
    from: emailConfig.from,
    to: email,
    subject: 'Verify your Vitu account',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #059669;">Welcome to Vitu!</h2>
        <p>Hi ${name},</p>
        <p>Thank you for creating an account. Please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="background-color: #059669; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block;">Verify Email</a>
        </div>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #6b7280;">${verificationUrl}</p>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 30px;">If you didn't create an account, please ignore this email.</p>
      </div>
    `
  };

  if (transporter) {
    try {
      await transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Error sending verification email:', error);
      return false;
    }
  }
}

// Function to send password reset email
async function sendPasswordResetEmail(email, name, token) {
  const appUrl = process.env.APP_URL || 'https://vitu.onrender.com';
  const resetUrl = `${appUrl}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
  
  const mailOptions = {
    from: emailConfig.from,
    to: email,
    subject: 'Reset your Vitu password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #059669;">Reset Your Password</h2>
        <p>Hi ${name},</p>
        <p>We received a request to reset your password. Click the button below to create a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #059669; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block;">Reset Password</a>
        </div>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #6b7280;">${resetUrl}</p>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 30px;">This link will expire in 1 hour. If you didn't request a password reset, please ignore this email.</p>
      </div>
    `
  };

  if (transporter) {
    try {
      await transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Error sending password reset email:', error);
      return false;
    }
  }
}

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
try { db.exec("ALTER TABLE users ADD COLUMN is_verified INTEGER DEFAULT 0"); } catch (e) {}
try { db.exec("ALTER TABLE users ADD COLUMN verification_token TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE users ADD COLUMN verification_expires DATETIME"); } catch (e) {}
try { db.exec("ALTER TABLE users ADD COLUMN reset_token TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE users ADD COLUMN reset_expires DATETIME"); } catch (e) {}
try { db.exec("ALTER TABLE users ADD COLUMN temp_password TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE users ADD COLUMN temp_password_expires DATETIME"); } catch (e) {}
try { db.exec("ALTER TABLE items ADD COLUMN gallery TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE items ADD COLUMN custom_fields TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE items ADD COLUMN business_id INTEGER REFERENCES businesses(id)"); } catch (e) {}
try { db.exec("ALTER TABLE comments ADD COLUMN parent_id INTEGER REFERENCES comments(id) DEFAULT NULL"); } catch (e) {}
try { db.exec("ALTER TABLE businesses ADD COLUMN address TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE businesses ADD COLUMN contacts TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE businesses ADD COLUMN social_handles TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE businesses ADD COLUMN tel TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE businesses ADD COLUMN type TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE businesses ADD COLUMN national_id_front TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE businesses ADD COLUMN national_id_back TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE businesses ADD COLUMN nin_number TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE businesses ADD COLUMN owners_pic TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE businesses ADD COLUMN alternative_phone_number TEXT"); } catch (e) {}
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
  const saltRounds = 10;
  const systemUserHashedPassword = bcrypt.hashSync("system", saltRounds);
  const adminUserHashedPassword = bcrypt.hashSync("vituadmin123", saltRounds);
  
  db.prepare("INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)").run(
    "vitu@system.com",
    systemUserHashedPassword,
    "Vitu System",
    "user"
  );
  
  // Seed Master Admin with requested credentials
  db.prepare("INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)").run(
    "vitu@zionnent.com",
    adminUserHashedPassword,
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
   app.use(fileUpload({
     createParentPath: true,
     limits: { 
       fileSize: 50 * 1024 * 1024 // 50 MB max file size
     },
     abortOnLimit: true,
     responseOnLimit: 'File size limit exceeded'
   }));
   
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
    res.json({ status: "ok", env: "production" });
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
  app.post("/api/auth/signup", async (req, res) => {
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
      
      // Hash the password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      
      // Generate verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      const stmt = db.prepare(
        "INSERT INTO users (email, password, name, role, verification_token, verification_expires) VALUES (?, ?, ?, ?, ?, ?)"
      );
      const info = stmt.run(email, hashedPassword, name, role, verificationToken, verificationExpires.toISOString());
      
      // Send verification email
      await sendVerificationEmail(email, name, verificationToken);
      
      res.json({ 
        id: info.lastInsertRowid, 
        email, 
        name, 
        role, 
        status: 'pending',
        message: 'Please check your email to verify your account'
      });
    } catch (err) {
      res.status(400).json({ error: "Email already exists" });
    }
  });

   app.post("/api/auth/login", async (req, res) => {
     const { email, password, passcode } = req.body;
     const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
     
     if (!user) {
       return res.status(401).json({ error: "Invalid credentials" });
     }
     
     // Verify password
     const isValidPassword = await bcrypt.compare(password, user.password);
     
     if (!isValidPassword) {
       return res.status(401).json({ error: "Invalid credentials" });
     }
     
     // Check if user has a business and has a temporary passcode set
     const business = db.prepare("SELECT id FROM businesses WHERE owner_id = ?").get(user.id);
     if (business && user.temp_password) {
       // Check if temp_password is expired
       if (user.temp_password_expires && new Date(user.temp_password_expires) < new Date()) {
         // Expired, clear the temp_password and temp_password_expires
         db.prepare("UPDATE users SET temp_password = NULL, temp_password_expires = NULL WHERE id = ?").run(user.id);
         return res.status(400).json({ error: "Passcode has expired. Please request a new one from the admin." });
       }

       // Verify the passcode
       if (!passcode) {
         return res.status(400).json({ error: "Passcode is required", requiresPasscode: true });
       }

       const isValidPasscode = await bcrypt.compare(passcode, user.temp_password);
       if (!isValidPasscode) {
         return res.status(400).json({ error: "Invalid passcode" });
       }

       // Passcode is valid, clear it so it can't be used again
       db.prepare("UPDATE users SET temp_password = NULL, temp_password_expires = NULL WHERE id = ?").run(user.id);
     }
     
     // Check if email is verified
     if (!user.is_verified) {
       return res.status(403).json({ 
         error: "Please verify your email before logging in",
         needsVerification: true,
         email: user.email
       });
     }
     
     if (user.status === 'suspended' || user.status === 'banned') {
       return res.status(403).json({ error: `Your account is ${user.status}.` });
     }
     
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
   });

  app.post("/api/auth/google", async (req, res) => {
    const { id_token } = req.body;
    if (!id_token) {
      return res.status(400).json({ error: "Missing id_token" });
    }

    try {
      const tokenInfoResp = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(id_token)}`);
      if (!tokenInfoResp.ok) {
        return res.status(401).json({ error: "Invalid Google ID token" });
      }

      const tokenData = await tokenInfoResp.json();
      if (tokenData.aud !== GOOGLE_CLIENT_ID) {
        return res.status(401).json({ error: "Invalid Google client ID" });
      }

      if (!tokenData.email || (tokenData.email_verified !== 'true' && tokenData.email_verified !== true)) {
        return res.status(403).json({ error: "Google email must be verified" });
      }

      const email = tokenData.email;
      const name = tokenData.name || '';
      const profile_picture = tokenData.picture || null;

      let user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
      if (!user) {
        const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get().count;
        const role = userCount === 0 ? 'admin' : 'user';
        const randomPassword = crypto.randomBytes(32).toString('hex');
        const hashedPassword = await bcrypt.hash(randomPassword, 10);

        const insertInfo = db.prepare(
          "INSERT INTO users (email, password, name, role, is_verified, status, profile_picture) VALUES (?, ?, ?, ?, 1, 'active', ?)"
        ).run(email, hashedPassword, name, role, profile_picture);

        user = db.prepare("SELECT * FROM users WHERE id = ?").get(insertInfo.lastInsertRowid);
      } else {
        if (user.is_verified !== 1) {
          db.prepare("UPDATE users SET is_verified = 1 WHERE id = ?").run(user.id);
          user.is_verified = 1;
        }

        if (profile_picture && user.profile_picture !== profile_picture) {
          db.prepare("UPDATE users SET profile_picture = ? WHERE id = ?").run(profile_picture, user.id);
          user.profile_picture = profile_picture;
        }
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
    } catch (err) {
      console.error("Google auth error:", err);
      res.status(500).json({ error: "Google sign-in failed" });
    }
  });

  // Email verification endpoint
  app.post("/api/auth/verify-email", (req, res) => {
    const { token, email } = req.body;
    
    if (!token || !email) {
      return res.status(400).json({ error: "Missing token or email" });
    }
    
    try {
      const user = db.prepare(
        "SELECT * FROM users WHERE email = ? AND verification_token = ?"
      ).get(email, token);
      
      if (!user) {
        return res.status(400).json({ error: "Invalid verification token" });
      }
      
      // Check if token is expired
      if (user.verification_expires && new Date(user.verification_expires) < new Date()) {
        return res.status(400).json({ error: "Verification token has expired" });
      }
      
      // Check if already verified
      if (user.is_verified) {
        return res.json({ message: "Email already verified", success: true });
      }
      
      // Update user as verified
      db.prepare(
        "UPDATE users SET is_verified = 1, verification_token = NULL, verification_expires = NULL WHERE id = ?"
      ).run(user.id);
      
      res.json({ message: "Email verified successfully", success: true });
    } catch (err) {
      console.error("Verification error:", err);
      res.status(500).json({ error: "Verification failed" });
    }
  });

  // Resend verification email
  app.post("/api/auth/resend-verification", async (req, res) => {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }
    
    try {
      const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      if (user.is_verified) {
        return res.status(400).json({ error: "Email already verified" });
      }
      
      // Generate new verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      db.prepare(
        "UPDATE users SET verification_token = ?, verification_expires = ? WHERE id = ?"
      ).run(verificationToken, verificationExpires.toISOString(), user.id);
      
      // Send verification email
      await sendVerificationEmail(email, user.name, verificationToken);
      
      res.json({ message: "Verification email sent" });
    } catch (err) {
      console.error("Resend verification error:", err);
      res.status(500).json({ error: "Failed to resend verification email" });
    }
  });

  // Forgot password - send reset email
  app.post("/api/auth/forgot-password", async (req, res) => {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }
    
    try {
      const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
      
      // Always return success to prevent email enumeration
      if (!user) {
        return res.json({ message: "If an account exists with this email, a password reset link will be sent" });
      }
      
      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      
      db.prepare(
        "UPDATE users SET reset_token = ?, reset_expires = ? WHERE id = ?"
      ).run(resetToken, resetExpires.toISOString(), user.id);
      
      // Send password reset email
      await sendPasswordResetEmail(email, user.name, resetToken);
      
      res.json({ message: "If an account exists with this email, a password reset link will be sent" });
    } catch (err) {
      console.error("Forgot password error:", err);
      res.status(500).json({ error: "Failed to process request" });
    }
  });

  // Reset password with token
  app.post("/api/auth/reset-password", async (req, res) => {
    const { token, email, newPassword } = req.body;
    
    if (!token || !email || !newPassword) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    
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
      const user = db.prepare(
        "SELECT * FROM users WHERE email = ? AND reset_token = ?"
      ).get(email, token);
      
      if (!user) {
        return res.status(400).json({ error: "Invalid reset token" });
      }
      
      // Check if token is expired
      if (user.reset_expires && new Date(user.reset_expires) < new Date()) {
        return res.status(400).json({ error: "Reset token has expired" });
      }
      
      // Hash new password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
      
      // Update password and clear reset token
      db.prepare(
        "UPDATE users SET password = ?, reset_token = NULL, reset_expires = NULL WHERE id = ?"
      ).run(hashedPassword, user.id);
      
      res.json({ message: "Password reset successfully" });
    } catch (err) {
      console.error("Reset password error:", err);
      res.status(500).json({ error: "Failed to reset password" });
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

  app.put("/api/profile/:id/password", async (req, res) => {
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
      
      // Compare current password with stored hash
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      
      if (!isValidPassword) {
        return res.status(400).json({ error: "Current password is incorrect" });
      }
      
      // Hash new password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
      
      // Update password
      db.prepare("UPDATE users SET password = ? WHERE id = ?").run(hashedPassword, userId);
      
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
      FROM businesses WHERE id = ? AND is_approved = 1
    `).get(req.params.id);
    res.json(business || null);
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
       WHERE businesses.is_approved = 1
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
      // Check if business is approved
      const business = db.prepare("SELECT is_approved FROM businesses WHERE id = ?").get(req.params.id);
      if (!business || business.is_approved !== 1) {
        return res.status(403).json({ error: "Business is not approved" });
      }
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
    
    const item = db.prepare("SELECT title, user_id FROM items WHERE id = ?").get(itemId);
    // Send notification only to the item owner
    if (item && item.user_id) {
      io.to(`user_${item.user_id}`).emit("notification", {
        type: 'comment',
        title: 'New Comment!',
        body: `${userName} commented on ${item.title}`,
        receiver_id: item.user_id
      });
    }

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
      
      // Get item owner and send notification only to them
      const item = db.prepare("SELECT title, user_id FROM items WHERE id = ?").get(itemId);
      if (item && item.user_id) {
        io.to(`user_${item.user_id}`).emit("notification", {
          type: 'like',
          title: 'New Like!',
          body: `Someone liked your item: ${item.title}`,
          receiver_id: item.user_id
        });
      }
      
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
      
      // Emit notification only to the item owner
      const item = db.prepare("SELECT title, user_id FROM items WHERE id = ?").get(itemId);
      if (item && item.user_id) {
        io.to(`user_${item.user_id}`).emit("notification", {
          type: 'review',
          title: 'New Review!',
          body: `${userName} reviewed ${item.title}`,
          receiver_id: item.user_id
        });
      }
      
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

   // Admin register business with passcode generation
   app.post("/api/admin/register-business", async (req, res) => {
     const { adminUserId, owner, business } = req.body;
     
     // Validate admin user
     const admin = db.prepare("SELECT * FROM users WHERE id = ? AND role = 'admin'").get(adminUserId);
     if (!admin) {
       return res.status(403).json({ error: "Admin privileges required" });
     }
     
     // Validate owner
     if (!owner || !owner.email || !owner.password || !owner.name) {
       return res.status(400).json({ error: "Owner email, password, and name are required" });
     }
     
     // Validate business
     if (!business || !business.name) {
       return res.status(400).json({ error: "Business name is required" });
     }
     
     try {
       // Check if owner email already exists
       const existingUser = db.prepare("SELECT * FROM users WHERE email = ?").get(owner.email);
       if (existingUser) {
         return res.status(400).json({ error: "Email already exists" });
       }
       
       // Hash owner password
       const saltRounds = 10;
       const hashedPassword = await bcrypt.hash(owner.password, saltRounds);
       
       // Generate 6-digit passcode
       const passcode = Math.floor(100000 + Math.random() * 900000).toString();
       const passcodeHash = await bcrypt.hash(passcode, saltRounds);
       
       // Set passcode expiration (1 hour)
       const passcodeExpires = new Date(Date.now() + 60 * 60 * 1000);
       
       // Insert owner user
       const userStmt = db.prepare(`
         INSERT INTO users (email, password, name, role, is_verified, temp_password, temp_password_expires)
         VALUES (?, ?, ?, ?, ?, ?, ?)
       `);
       const userInfo = userStmt.run(
         owner.email,
         hashedPassword,
         owner.name,
         'user',
         1, // is_verified (no email verification required)
         passcodeHash,
         passcodeExpires.toISOString()
       );
       
       const ownerId = userInfo.lastInsertRowid;
       
       // Insert business
       const businessStmt = db.prepare(`
         INSERT INTO businesses (owner_id, name, description, type, logo, address, contacts, social_handles, tel)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       `);
       const businessInfo = businessStmt.run(
         ownerId,
         business.name,
         business.description || null,
         business.type || null,
         business.logo || null,
         business.address || null,
         business.contacts || null,
         business.social_handles || null,
         business.tel || null
       );
       
       const businessId = businessInfo.lastInsertRowid;
       
       res.json({
         success: true,
         message: "Business registered successfully",
         ownerId,
         businessId,
         passcode: passcode // Return plain passcode to admin (to be shown once)
       });
     } catch (err) {
       console.error("Error registering business:", err);
       res.status(500).json({ error: "Failed to register business" });
     }
   });

   // Admin endpoint to view pending business documents for approval
   app.get("/api/admin/pending-businesses", (req, res) => {
     try {
       const businesses = db.prepare(`
         SELECT b.id, b.name, b.description, b.logo, b.address, b.contacts, b.social_handles, b.tel, b.type,
                b.national_id_front, b.national_id_back, b.nin_number, b.owners_pic, b.alternative_phone_number,
                u.id as owner_id, u.email as owner_email, u.name as owner_name
         FROM businesses b
         JOIN users u ON b.owner_id = u.id
         WHERE b.is_approved = 0
         ORDER BY b.created_at DESC
       `).all();
       
       res.json(businesses);
     } catch (err) {
       console.error("Error fetching pending businesses:", err);
       res.status(500).json({ error: "Failed to fetch pending businesses" });
     }
   });

   // Admin endpoint to approve a business
   app.patch("/api/admin/approve-business/:id", (req, res) => {
     const { id } = req.params;
     
     try {
       const business = db.prepare("SELECT * FROM businesses WHERE id = ?").get(id);
       if (!business) {
         return res.status(404).json({ error: "Business not found" });
       }
       
       db.prepare("UPDATE businesses SET is_approved = 1 WHERE id = ?").run(id);
       
       res.json({
         success: true,
         message: "Business approved successfully"
       });
     } catch (err) {
       console.error("Error approving business:", err);
       res.status(500).json({ error: "Failed to approve business" });
     }
   });

   // Admin endpoint to reject a business
   app.patch("/api/admin/reject-business/:id", (req, res) => {
     const { id } = req.params;
     
     try {
       const business = db.prepare("SELECT * FROM businesses WHERE id = ?").get(id);
       if (!business) {
         return res.status(404).json({ error: "Business not found" });
       }
       
       // Optionally, you could delete the business or mark it as rejected
       // For now, we'll just leave it as unapproved (is_approved = 0)
       res.json({
         success: true,
         message: "Business rejected (left as unapproved)"
       });
     } catch (err) {
       console.error("Error rejecting business:", err);
       res.status(500).json({ error: "Failed to reject business" });
     }
   });

   // Business document upload endpoint (after login)
   app.post("/api/business/upload-documents", async (req, res) => {
     const { userId } = req.body;
     
     // Validate user
     const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
     if (!user) {
       return res.status(404).json({ error: "User not found" });
     }
     
     // Check if user has a business
     const business = db.prepare("SELECT * FROM businesses WHERE owner_id = ?").get(userId);
     if (!business) {
       return res.status(404).json({ error: "Business not found for this user" });
     }
     
     try {
       // Handle file uploads
       const files = req.files;
       if (!files) {
         return res.status(400).json({ error: "No files uploaded" });
       }
       
       // Define allowed file types
       const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
       
       // Process each document type
       const documentTypes = [
         'nationalIdFront',
         'nationalIdBack', 
         'ninNumber',
         'businessLogo',
         'location',
         'businessType',
         'ownersPic',
         'telephone',
         'alternativePhoneNumber'
       ];
       
       const uploadedDocuments = {};
       
       for (const docType of documentTypes) {
         if (files[docType]) {
           const file = files[docType];
           
           // Validate file type
           if (!allowedTypes.includes(file.mimetype)) {
             return res.status(400).json({ error: `Invalid file type for ${docType}. Only JPEG/PNG allowed.` });
           }
           
           // Create uploads directory if it doesn't exist
           const uploadDir = path.join(__dirname, 'uploads', 'business-documents');
           if (!fs.existsSync(uploadDir)) {
             fs.mkdirSync(uploadDir, { recursive: true });
           }
           
           // Generate unique filename
           const fileName = `${userId}_${docType}_${Date.now()}${path.extname(file.name)}`;
           const filePath = path.join(uploadDir, fileName);
           
           // Move file to uploads directory
           await file.mv(filePath);
           
           // Store relative path for database
           uploadedDocuments[docType] = `/uploads/business-documents/${fileName}`;
         }
       }
       
       // Update business with document paths
       const updateFields = [];
       const updateValues = [];
       
       for (const [key, value] of Object.entries(uploadedDocuments)) {
         // Map document types to database columns
         let dbColumn = key;
         if (key === 'nationalIdFront') dbColumn = 'national_id_front';
         else if (key === 'nationalIdBack') dbColumn = 'national_id_back';
         else if (key === 'ninNumber') dbColumn = 'nin_number';
         else if (key === 'businessLogo') dbColumn = 'logo';
         else if (key === 'location') dbColumn = 'address';
         else if (key === 'businessType') dbColumn = 'type';
         else if (key === 'ownersPic') dbColumn = 'owners_pic';
         else if (key === 'telephone') dbColumn = 'tel';
         else if (key === 'alternativePhoneNumber') dbColumn = 'alternative_phone_number';
         
         updateFields.push(`${dbColumn} = ?`);
         updateValues.push(value);
       }
       
       if (updateFields.length > 0) {
         updateValues.push(userId);
         const updateQuery = `UPDATE businesses SET ${updateFields.join(', ')} WHERE owner_id = ?`;
         db.prepare(updateQuery).run(...updateValues);
       }
       
       res.json({
         success: true,
         message: "Documents uploaded successfully",
         documents: uploadedDocuments
       });
     } catch (err) {
       console.error("Error uploading documents:", err);
       res.status(500).json({ error: "Failed to upload documents" });
     }
   });

  // Get all users (for inbox/chat)
  app.get("/api/users/all", (req, res) => {
    try {
      const users = db.prepare(`
        SELECT id, email, name, role, status, bio, profile_picture, created_at
        FROM users
        WHERE status = 'active'
        ORDER BY name ASC
      `).all();
      res.json(users);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
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
    
    // Send message only to the specific sender and receiver
    io.to(`user_${sender_id}`).emit("message", newMessage);
    io.to(`user_${receiver_id}`).emit("message", newMessage);
    
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
        // Send notification only to the business owner
        io.to(`user_${business.owner_id}`).emit('notification', { receiver_id: business.owner_id, text: notificationText, type: 'follow' });
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

  // Always run in production mode
  const isProduction = true;
  
  // Validate production mode has dist folder
  if (!fs.existsSync(path.join(__dirname, 'dist'))) {
    console.error("[ERROR] Production mode requires running 'npm run build' first!");
    console.error("[ERROR] Run 'npm run build' to create the dist folder, then try again.");
    process.exit(1);
  }

  // Serve static files from dist folder with proper MIME types
  if (isProduction) {
    const distPath = path.join(__dirname, "dist");
    
    // FIRST: Serve admin assets (BEFORE main app to prevent conflicts)
    const adminDistPath = path.join(__dirname, "dist-admin");
    if (fs.existsSync(adminDistPath)) {
      // Serve admin static files under /admin/assets
      app.use("/admin/assets", express.static(adminDistPath, {
        maxAge: '1y',
        etag: true,
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('.js') || filePath.endsWith('.mjs')) {
            res.setHeader('Content-Type', 'application/javascript');
          } else if (filePath.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
          } else if (filePath.endsWith('.json')) {
            res.setHeader('Content-Type', 'application/json');
          } else if (filePath.endsWith('.html')) {
            res.setHeader('Content-Type', 'text/html');
          }
          res.setHeader('X-Content-Type-Options', 'nosniff');
        }
      }));
      
      // Also serve admin assets at /assets path for admin index.html references
      app.use("/assets", express.static(adminDistPath, {
        maxAge: '1y',
        etag: true,
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('.js') || filePath.endsWith('.mjs')) {
            res.setHeader('Content-Type', 'application/javascript');
          } else if (filePath.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
          } else if (filePath.endsWith('.json')) {
            res.setHeader('Content-Type', 'application/json');
          } else if (filePath.endsWith('.png')) {
            res.setHeader('Content-Type', 'image/png');
          }
          res.setHeader('X-Content-Type-Options', 'nosniff');
        }
      }));
      
      // Admin SPA fallback - explicit routes plus wildcard
      app.get("/admin", (req, res) => {
        res.sendFile(path.join(adminDistPath, "index.html"));
      });
      app.get("/admin/", (req, res) => {
        res.sendFile(path.join(adminDistPath, "index.html"));
      });
      app.get("/admin/*", (req, res) => {
        res.sendFile(path.join(adminDistPath, "index.html"));
      });
    }

    // SECOND: Serve main app
    app.use(express.static(distPath, {
      maxAge: '1y',
      etag: true,
      setHeaders: (res, filePath) => {
        // Ensure proper MIME type and security headers for all files
        if (filePath.endsWith('.js') || filePath.endsWith('.mjs')) {
          res.setHeader('Content-Type', 'application/javascript');
        } else if (filePath.endsWith('.css')) {
          res.setHeader('Content-Type', 'text/css');
        } else if (filePath.endsWith('.json')) {
          res.setHeader('Content-Type', 'application/json');
        } else if (filePath.endsWith('.html')) {
          res.setHeader('Content-Type', 'text/html');
        } else if (filePath.endsWith('.wasm')) {
          res.setHeader('Content-Type', 'application/wasm');
        } else if (filePath.endsWith('.png')) {
          res.setHeader('Content-Type', 'image/png');
        } else if (filePath.endsWith('.svg')) {
          res.setHeader('Content-Type', 'image/svg+xml');
        }
        // Add security header to prevent MIME type sniffing
        res.setHeader('X-Content-Type-Options', 'nosniff');
      }
    }));

    // Main app SPA fallback - serve index.html for all routes
    app.get("/", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
    // Also handle other routes for SPA
    app.get("/*", (req, res) => {
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

  const PORT = process.env.PORT || 3000;
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT} in production mode`);
  });

  // Track connected users: Map<socketId, userId>
  const userSockets = new Map();
  
  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);
    
    // Handle user joining with their user ID
    socket.on("join", (userId) => {
      if (userId) {
        userSockets.set(socket.id, userId);
        socket.join(`user_${userId}`);
        console.log(`User ${userId} joined room: user_${userId}`);
      }
    });
    
    // Handle disconnect
    socket.on("disconnect", () => {
      const userId = userSockets.get(socket.id);
      if (userId) {
        console.log(`User ${userId} disconnected`);
        userSockets.delete(socket.id);
      }
      console.log("A user disconnected");
    });
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
});
