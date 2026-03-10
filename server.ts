import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const db = new Database("vitu.db");

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
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    description TEXT,
    image_url TEXT,
    gallery TEXT,
    custom_fields TEXT,
    business_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(business_id) REFERENCES businesses(id)
  );

  CREATE TABLE IF NOT EXISTS likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    item_id INTEGER,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(item_id) REFERENCES items(id)
  );

  CREATE TABLE IF NOT EXISTS analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER,
    user_id INTEGER,
    user_name TEXT,
    text TEXT,
    parent_id INTEGER DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(item_id) REFERENCES items(id),
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(parent_id) REFERENCES comments(id)
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
    is_approved INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(owner_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER,
    receiver_id INTEGER,
    text TEXT,
    attachment TEXT,
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
` );

// Helper to add columns if they don't exist
try { db.exec("ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active'"); } catch (e) {}
try { db.exec("ALTER TABLE items ADD COLUMN gallery TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE items ADD COLUMN custom_fields TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE items ADD COLUMN business_id INTEGER REFERENCES businesses(id)"); } catch (e) {}
try { db.exec("ALTER TABLE comments ADD COLUMN parent_id INTEGER REFERENCES comments(id) DEFAULT NULL"); } catch (e) {}
try { db.exec("ALTER TABLE businesses ADD COLUMN address TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE businesses ADD COLUMN contacts TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE businesses ADD COLUMN social_handles TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE businesses ADD COLUMN tel TEXT"); } catch (e) {}

// Seed Master Admin
const masterAdmin = db.prepare("SELECT * FROM users WHERE email = ?").get("vitu@gmail.com");
if (!masterAdmin) {
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

  // Auth Routes
  app.post("/api/auth/signup", (req, res) => {
    const { email, password, name } = req.body;
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

  // Business Routes
  app.post("/api/businesses", (req, res) => {
    const { ownerId, name, description, logo, address, contacts, social_handles, tel } = req.body;
    try {
      const info = db.prepare("INSERT INTO businesses (owner_id, name, description, logo, address, contacts, social_handles, tel) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(ownerId, name, description, logo, address, contacts, social_handles, tel);
      res.json({ id: info.lastInsertRowid, name });
    } catch (err) {
      res.status(400).json({ error: "User already has a business or name taken" });
    }
  });

  app.put("/api/businesses/:id", (req, res) => {
    const { name, description, logo, address, contacts, social_handles, tel } = req.body;
    try {
      db.prepare("UPDATE businesses SET name = ?, description = ?, logo = ?, address = ?, contacts = ?, social_handles = ?, tel = ? WHERE id = ?").run(name, description, logo, address, contacts, social_handles, tel, req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: "Failed to update business" });
    }
  });

  app.get("/api/businesses/my/:ownerId", (req, res) => {
    const business = db.prepare("SELECT * FROM businesses WHERE owner_id = ?").get(req.params.ownerId);
    res.json(business || null);
  });

  app.get("/api/businesses/:id", (req, res) => {
    const business = db.prepare("SELECT * FROM businesses WHERE id = ?").get(req.params.id);
    res.json(business);
  });

  app.put("/api/businesses/:id", (req, res) => {
    const { name, description, logo, address, contacts, social_handles, tel } = req.body;
    db.prepare(`
      UPDATE businesses 
      SET name = ?, description = ?, logo = ?, address = ?, contacts = ?, social_handles = ?, tel = ?
      WHERE id = ?
    `).run(name, description, logo, address, contacts, social_handles, tel, req.params.id);
    res.json({ success: true });
  });

  app.get("/api/businesses/:id/analytics", (req, res) => {
    const businessId = req.params.id;
    const totalItems = db.prepare("SELECT COUNT(*) as count FROM items WHERE business_id = ?").get(businessId).count;
    const totalLikes = db.prepare(`
      SELECT COUNT(*) as count FROM likes 
      JOIN items ON likes.item_id = items.id 
      WHERE items.business_id = ?
    `).get(businessId).count;
    
    res.json({ totalItems, totalLikes });
  });

  // Items Routes
  app.get("/api/items", (req, res) => {
    const items = db.prepare(`
      SELECT items.*, businesses.name as business_name, businesses.is_approved 
      FROM items 
      LEFT JOIN businesses ON items.business_id = businesses.id 
      ORDER BY created_at DESC
    `).all();
    res.json(items);
  });

  app.post("/api/items", (req, res) => {
    const { title, description, image_url, gallery, custom_fields, business_id } = req.body;
    const info = db.prepare("INSERT INTO items (title, description, image_url, gallery, custom_fields, business_id) VALUES (?, ?, ?, ?, ?, ?)").run(title, description, image_url, gallery || null, custom_fields || null, business_id || null);
    const newItem = db.prepare("SELECT * FROM items WHERE id = ?").get(info.lastInsertRowid);
    
    io.emit("notification", { 
      type: 'new_item', 
      title: 'New Item Posted!', 
      body: `${title} is now available.` 
    });
    
    res.json(newItem);
  });

  // Engagement Routes
  app.get("/api/items/:id/comments", (req, res) => {
    const comments = db.prepare("SELECT * FROM comments WHERE item_id = ? ORDER BY created_at DESC").all(req.params.id);
    res.json(comments);
  });

  app.post("/api/items/:id/comments", (req, res) => {
    const { userId, userName, text, parentId } = req.body;
    const itemId = req.params.id;
    const info = db.prepare("INSERT INTO comments (item_id, user_id, user_name, text, parent_id) VALUES (?, ?, ?, ?, ?)").run(itemId, userId, userName, text, parentId || null);
    const newComment = db.prepare("SELECT * FROM comments WHERE id = ?").get(info.lastInsertRowid);
    
    io.emit("engagement", { itemId, type: 'comment', comment: newComment });
    
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
    db.prepare("INSERT INTO likes (user_id, item_id) VALUES (?, ?)").run(userId, itemId);
    db.prepare("INSERT INTO analytics (event_type) VALUES ('like')").run();
    
    const likeCount = db.prepare("SELECT COUNT(*) as count FROM likes WHERE item_id = ?").get(itemId);
    io.emit("engagement", { itemId, type: 'like', count: likeCount.count });
    
    const item = db.prepare("SELECT title FROM items WHERE id = ?").get(itemId);
    io.emit("notification", {
      type: 'like',
      title: 'New Like!',
      body: `Someone liked your item: ${item.title}`
    });
    
    res.json({ success: true });
  });

  // Admin Routes
  app.get("/api/admin/users", (req, res) => {
    const users = db.prepare(`
      SELECT users.id, users.email, users.name, users.role, users.status, businesses.id as business_id, businesses.name as business_name
      FROM users
      LEFT JOIN businesses ON users.id = businesses.owner_id
    `).all();
    res.json(users);
  });

  app.get("/api/admin/businesses", (req, res) => {
    const businesses = db.prepare("SELECT * FROM businesses").all();
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
    const info = db.prepare("INSERT INTO messages (sender_id, receiver_id, text, attachment) VALUES (?, ?, ?, ?)").run(sender_id, receiver_id, text, attachment);
    const newMessage = db.prepare("SELECT * FROM messages WHERE id = ?").get(info.lastInsertRowid);
    io.emit("message", newMessage);
    res.json(newMessage);
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
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  const PORT = 3000;
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  io.on("connection", (socket) => {
    console.log("A user connected");
  });
}

startServer();
