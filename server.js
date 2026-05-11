
const path = require('path');
// Load environment variables from .env when present
require('dotenv').config();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');

// TODO: Insert your Cloudinary credentials below
// Configure Cloudinary from environment variables. Create a `.env` with the values below or
// set environment variables in your host before running the server.
// Configure Cloudinary from environment variables only. Do NOT commit secrets into source.
const cloudName = process.env.CLOUDINARY_CLOUD_NAME || '';
const cloudKey = process.env.CLOUDINARY_API_KEY || '';
const cloudSecret = process.env.CLOUDINARY_API_SECRET || '';
cloudinary.config({
  cloud_name: cloudName,
  api_key: cloudKey,
  api_secret: cloudSecret
});
// Optional migration secret (set in .env) - if present, POST /migrate_users must include this secret in header 'x-migration-secret'
const MIGRATION_SECRET = process.env.MIGRATION_SECRET || '';

// Helper to check Cloudinary configuration
function isCloudinaryConfigured() {
  try {
    const cfg = cloudinary.config();
    return cfg && cfg.cloud_name && cfg.api_key && cfg.api_secret;
  } catch (e) {
    return false;
  }
}

const upload = multer({ dest: 'uploads/' }); // temp storage
// --- All required modules at the top ---


// Product storage file
const PRODUCTS_FILE = path.join(__dirname, 'products.json');
const ORDERS_FILE = path.join(__dirname, 'orders.json');

// Helper to read orders
function readOrders() {
  if (!fs.existsSync(ORDERS_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(ORDERS_FILE)); } catch (e) { return []; }
}

// Helper to save orders
function saveOrders(orders) {
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
}

// Helper to read products
function readProducts() {
  if (!fs.existsSync(PRODUCTS_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(PRODUCTS_FILE)); } catch (e) { return []; }
}

// Helper to save product info
function saveProduct(product) {
  let products = [];
  if (fs.existsSync(PRODUCTS_FILE)) {
    try {
      products = JSON.parse(fs.readFileSync(PRODUCTS_FILE));
    } catch (e) {
      console.error('Failed to parse products.json, resetting to empty array:', e && e.message ? e.message : e);
      products = [];
    }
  }
  products.push(product);
  fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2));
}

function deleteProductByIdOrName({ id, name }) {
  const products = readProducts();
  const filtered = products.filter(p => {
    if (id) return p.id !== id;
    return p.name !== name;
  });
  if (filtered.length === products.length) return false;
  fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(filtered, null, 2));
  return true;
}

function getSessionUserId(req) {
  if (!req || !req.session) return null;
  return req.session.userId || (req.session.user && req.session.user.id) || null;
}

function getSessionUsername(req) {
  if (!req || !req.session) return null;
  return req.session.username || (req.session.user && req.session.user.username) || null;
}

// ...existing code...

// server.js for GlenHub
const express = require('express');
const rateLimit = require('express-rate-limit');
const xss = require('xss');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const session = require('express-session');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const app = express();
const PORT = 3000;

// Users storage file
const USERS_FILE = path.join(__dirname, 'users.json');

// Rate limiting for authentication endpoints (5 attempts per 15 minutes)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login/signup attempts. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    res.status(options.statusCode).json({
      success: false,
      message: options.message || 'Too many requests. Please try again later.'
    });
  }
});

function readUsers() {
  if (!fs.existsSync(USERS_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(USERS_FILE)); } catch (e) { return []; }
}

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// Enforce SESSION_SECRET; fail if not set (security requirement)
if (!process.env.SESSION_SECRET) {
  console.error('ERROR: SESSION_SECRET is not set in .env. Session cookies are insecure without a random secret.');
  console.error('Please set SESSION_SECRET=<random_string> in your .env file (at least 32 random characters).');
  process.exit(1);
}

// Session middleware (cookie-based)
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

// Parse JSON bodies for routes. Place this early so endpoints can read req.body.
app.use(bodyParser.json());

// Handle malformed JSON errors from body-parser gracefully.
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('Invalid JSON received:', err.message);
    return res.status(400).json({ success: false, message: 'Invalid JSON in request body' });
  }
  next(err);
});

// Endpoint to upload product (image + details)
async function handleProductUpload(req, res) {
  try {
    if (!isCloudinaryConfigured()) {
      return res.status(500).json({
        success: false,
        message: 'Cloudinary not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in your environment.'
      });
    }
    const { name, price, desc, merchant, category } = req.body;
    if (!req.file) return res.status(400).json({ success: false, message: 'No image uploaded' });
    const result = await cloudinary.uploader.upload(req.file.path, { folder: 'glenhub-products' });
    fs.unlinkSync(req.file.path);
    const product = {
      id: uuidv4(),
      name,
      price,
      desc,
      merchant,
      category: category || '',
      image: result.secure_url,
      createdAt: new Date().toISOString()
    };
    saveProduct(product);
    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Upload failed', error: err.message });
  }
}

app.post('/upload_product', upload.single('image'), handleProductUpload);
app.post('/api/upload_product', upload.single('image'), handleProductUpload);

// Video upload endpoint
app.post('/upload-video', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No video file uploaded' });
    }

    // Check if Cloudinary is configured for cloud storage, otherwise use local storage
    if (isCloudinaryConfigured()) {
      try {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'glenhub-videos',
          resource_type: 'video'
        });
        fs.unlinkSync(req.file.path);
        res.json({
          success: true,
          videoUrl: result.secure_url,
          filename: path.basename(result.secure_url)
        });
      } catch (cloudErr) {
        console.error('Cloudinary upload failed, falling back to local storage:', cloudErr.message);
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
        const filename = Date.now() + '_' + req.file.originalname;
        const destPath = path.join(uploadDir, filename);
        fs.renameSync(req.file.path, destPath);
        res.json({
          success: true,
          videoUrl: '/uploads/' + filename,
          filename: filename
        });
      }
    } else {
      // Local storage fallback
      const uploadDir = path.join(__dirname, 'uploads');
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
      const filename = Date.now() + '_' + req.file.originalname;
      const destPath = path.join(uploadDir, filename);
      fs.renameSync(req.file.path, destPath);
      res.json({
        success: true,
        videoUrl: '/uploads/' + filename,
        filename: filename
      });
    }
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ success: false, message: 'Video upload failed', error: err.message });
  }
});

// Endpoint to get all products
app.get('/products', (req, res) => {
  let products = [];
  if (fs.existsSync(PRODUCTS_FILE)) {
    try {
      products = JSON.parse(fs.readFileSync(PRODUCTS_FILE));
    } catch (e) {
      console.error('Failed to parse products.json when handling /products:', e && e.message ? e.message : e);
      products = [];
    }
  }
  res.json({ success: true, products });
});

// --- User auth endpoints (JSON file storage) ---
// Helper: validate password strength (min 8 chars, uppercase, lowercase, digit, special char)
function isStrongPassword(pwd) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/.test(pwd);
}

app.post('/api/signup', authLimiter, async (req, res) => {
  try {
    const { username, email, password, role, firstname, middlename, surname, nationality, category } = req.body || {};
    if (!username || !email || !password) return res.status(400).json({ success: false, message: 'Missing fields' });
    const sanitizedUsername = xss(username.trim());
    const sanitizedEmail = xss(email.trim().toLowerCase());
    if (!isStrongPassword(password)) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character' });
    }
    const users = readUsers();
    if (users.some(u => u.username.toLowerCase() === sanitizedUsername.toLowerCase() || u.email.toLowerCase() === sanitizedEmail.toLowerCase())) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }
    const hash = await bcrypt.hash(password, 10);
    const user = {
      id: uuidv4(),
      username: sanitizedUsername,
      email: sanitizedEmail,
      password: hash,
      role: role || 'customer',
      firstname: xss((firstname || '').trim()),
      middlename: xss((middlename || '').trim()),
      surname: xss((surname || '').trim()),
      nationality: xss((nationality || '').trim()),
      category: xss((category || '').trim()),
      createdAt: new Date().toISOString(),
      cart: [],
      notifications: []
    };
    users.push(user);
    saveUsers(users);
    const sessionUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      firstname: user.firstname,
      middlename: user.middlename,
      surname: user.surname,
      nationality: user.nationality,
      category: user.category,
      createdAt: user.createdAt
    };
    req.session.user = sessionUser;
    req.session.userId = user.id;
    req.session.username = user.username;
    res.json({ success: true, user: sessionUser });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/signin', authLimiter, async (req, res) => {
  try {
    console.log('[AUTH] signin request body:', { username: req.body && req.body.username, passwordLength: req.body && req.body.password ? req.body.password.length : 0 });
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ success: false, message: 'Missing credentials' });
    const users = readUsers();
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() || u.email.toLowerCase() === username.toLowerCase());
    console.log('[AUTH] signin matched user:', user ? { id: user.id, username: user.username, email: user.email, role: user.role } : null);
    if (!user) {
      console.warn(`[AUTH] Failed login attempt: user not found (username: ${xss(username)}) at ${new Date().toISOString()}`);
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }
    const ok = await bcrypt.compare(password, user.password);
    console.log('[AUTH] password compare result:', ok);
    if (!ok) {
      console.warn(`[AUTH] Failed login attempt: wrong password (username: ${xss(username)}) at ${new Date().toISOString()}`);
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }
    console.log(`[AUTH] signin success for ${user.username}`);
    const sessionUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      firstname: user.firstname,
      middlename: user.middlename,
      surname: user.surname,
      nationality: user.nationality,
      category: user.category,
      createdAt: user.createdAt
    };
    req.session.user = sessionUser;
    req.session.userId = user.id;
    req.session.username = user.username;
    res.json({ success: true, user: sessionUser });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/me', (req, res) => {
  if (req.session && req.session.user) return res.json({ success: true, user: req.session.user });
  res.json({ success: false, user: null });
});

app.post('/api/signout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ success: false });
    res.json({ success: true });
  });
});

// Return JSON for any unmatched API endpoint instead of static HTML.
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: 'API endpoint not found' });
});

// Store OTPs in memory (for demo)
let otpStore = {};

app.use(express.static(path.join(__dirname)));

// Serve index.html as default
app.get('/', (req, res) => {
  // Use Index.html which exists in the project root
  res.sendFile(path.join(__dirname, 'Index.html'));
});

// Configure nodemailer transporter using environment variables.
// For local development, create a `.env` file from `.env.example` and set the values.
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || ''
  }
});
// OTP send endpoint
app.post('/send_otp', async (req, res) => {
  try {
    const { email, name, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Missing email or otp' });
    }
    otpStore[email] = otp;
    console.log(`OTP for ${email}: ${otp}`);
    
    // Try to send email if configured
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      try {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: email,
          subject: 'GlenHub Email Verification - OTP',
          html: `
            <h2>Email Verification</h2>
            <p>Hello ${name},</p>
            <p>Your OTP code is: <strong>${otp}</strong></p>
            <p>This code will expire in 10 minutes.</p>
            <p>Do not share this code with anyone.</p>
            <p>Best regards,<br>GlenHub Team</p>
          `
        });
        console.log(`OTP email sent to ${email}`);
        return res.json({ success: true, message: 'OTP sent to your email' });
      } catch (emailErr) {
        console.error('Email send error:', emailErr.message);
        // Fall back to showing OTP in response if email fails
        return res.json({ success: true, message: 'OTP generated', otp: otp, emailFailed: true });
      }
    } else {
      // Email not configured, return OTP in response for demo
      console.log('Email not configured. Returning OTP in response for demo.');
      return res.json({ success: true, message: 'OTP generated (email not configured)', otp: otp });
    }
  } catch (err) {
    console.error('OTP send error:', err);
    res.status(500).json({ success: false, message: 'Failed to send OTP: ' + (err.message || err) });
  }
});

// OTP verify endpoint
app.post('/verify_otp', (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ success: false, message: 'Missing email or otp' });
  }
  
  // Convert both to strings for comparison
  const storedOtp = String(otpStore[email]);
  const enteredOtp = String(otp);
  
  console.log(`[OTP Verify] Email: ${email}, Stored: ${storedOtp}, Entered: ${enteredOtp}`);
  
  if (storedOtp === enteredOtp && storedOtp !== 'undefined') {
    delete otpStore[email];
    console.log(`[OTP Verify] OTP verified successfully for ${email}`);
    res.json({ success: true, message: 'OTP verified' });
  } else {
    console.log(`[OTP Verify] OTP verification failed for ${email}`);
    res.json({ success: false, message: 'Invalid or expired OTP code. Please try again.' });
  }
});

// Update profile endpoint
app.post('/api/update_profile', upload.single('profilePicture'), async (req, res) => {
  try {
    const sessionUserId = getSessionUserId(req);
    if (!sessionUserId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    const { username, email, currentPassword, newPassword, businessName } = req.body;
    const profilePicture = req.file;
    if (!username || !email || !currentPassword) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    let users = readUsers();
    const userIndex = users.findIndex(u => u.id === sessionUserId);
    if (userIndex === -1) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const user = users[userIndex];
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }
    const updateData = {
      username: xss(username.trim()),
      email: xss(email.trim().toLowerCase()),
      updatedAt: new Date().toISOString()
    };
    if (businessName) {
      updateData.businessName = xss(businessName.trim());
    }
    if (profilePicture) {
      try {
        const result = await cloudinary.uploader.upload(profilePicture.path, {
          folder: 'glenhub_profiles',
          public_id: `user_${sessionUserId}`,
          overwrite: true
        });
        updateData.profilePicture = result.secure_url;
        fs.unlinkSync(profilePicture.path);
      } catch (uploadErr) {
        console.error('Profile picture upload error:', uploadErr);
        return res.status(500).json({ success: false, message: 'Failed to upload profile picture' });
      }
    }
    if (newPassword) {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      updateData.password = hashedPassword;
    }
    Object.assign(user, updateData);
    saveUsers(users);
    const updatedSessionUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      firstname: user.firstname,
      middlename: user.middlename,
      surname: user.surname,
      nationality: user.nationality,
      category: user.category,
      createdAt: user.createdAt,
      profilePicture: user.profilePicture
    };
    req.session.user = updatedSessionUser;
    req.session.userId = user.id;
    req.session.username = user.username;
    res.json({
      success: true,
      message: 'Profile updated successfully',
      profilePicture: updateData.profilePicture
    });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ success: false, message: 'Failed to update profile: ' + (err.message || err) });
  }
});

// Client-side log endpoint (accepts error reports from the browser)
app.post('/client_log', (req, res) => {
  try {
    const { source, message, detail } = req.body || {};
    const time = new Date().toISOString();
    const line = `[client:${time}] ${source || 'browser'}: ${message || ''} ${detail ? JSON.stringify(detail) : ''}\n`;
    // Append to client.log and also write to console
    fs.appendFileSync(path.join(__dirname, 'client.log'), line);
    console.log(line);
    res.json({ ok: true });
  } catch (err) {
    console.error('Failed to write client log:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ---- Migration endpoint: accept an array of users and merge into users.json ----
app.post('/migrate_users', async (req, res) => {
  try {
    // Authorization: either provide MIGRATION_SECRET header or be authenticated as admin
    if (MIGRATION_SECRET) {
      const provided = req.get('x-migration-secret') || (req.body && req.body.secret) || '';
      if (!provided || provided !== MIGRATION_SECRET) {
        return res.status(403).json({ success: false, message: 'Migration secret required or incorrect' });
      }
    } else {
      // If no MIGRATION_SECRET configured, require admin session
      if (!req.session || !req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Admin session required' });
      }
    }

    const incoming = Array.isArray(req.body) ? req.body : (req.body.users || []);
    if (!Array.isArray(incoming) || incoming.length === 0) {
      return res.status(400).json({ success: false, message: 'Expected an array of users in request body' });
    }
    const users = readUsers();
    let added = 0;
    for (const u of incoming) {
      if (!u.username || !u.email || !u.password) continue;
      const exists = users.some(x => x.username.toLowerCase() === u.username.toLowerCase() || x.email.toLowerCase() === u.email.toLowerCase());
      if (exists) continue;
      let pass = u.password;
      // If password doesn't look like a bcrypt hash, hash it
      if (typeof pass === 'string' && !pass.startsWith('$2')) {
        pass = await bcrypt.hash(pass, 10);
      }
      const user = {
        id: uuidv4(),
        username: u.username,
        email: u.email,
        password: pass,
        role: u.role || 'customer',
        createdAt: new Date().toISOString(),
        cart: u.cart || [],
        notifications: u.notifications || []
      };
      users.push(user);
      added++;
    }
    saveUsers(users);
    res.json({ success: true, added });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin-only: list users without passwords
app.get('/api/users', (req, res) => {
  if (!req.session || !req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin session required' });
  }
  const users = readUsers();
  const safe = users.map(u => ({ id: u.id, username: u.username, email: u.email, role: u.role, createdAt: u.createdAt, cart: u.cart || [], notifications: u.notifications || [] }));
  res.json({ success: true, users: safe });
});

app.post('/api/delete_user', (req, res) => {
  if (!req.session || !req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin session required' });
  }
  const { username } = req.body || {};
  if (!username) return res.status(400).json({ success: false, message: 'Missing username' });
  const users = readUsers();
  const filtered = users.filter(u => u.username.toLowerCase() !== username.toLowerCase());
  if (filtered.length === users.length) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }
  saveUsers(filtered);
  res.json({ success: true });
});

// ---- Cart endpoints (per-user stored in users.json) ----
app.get('/api/cart', (req, res) => {
  if (!req.session || !req.session.user) return res.json({ success: false, cart: [] });
  const users = readUsers();
  const user = users.find(u => u.id === req.session.user.id);
  res.json({ success: true, cart: (user && user.cart) || [] });
});

app.post('/api/cart', (req, res) => {
  if (!req.session || !req.session.user) return res.status(401).json({ success: false, message: 'Not authenticated' });
  const cart = req.body && req.body.cart;
  if (!Array.isArray(cart)) return res.status(400).json({ success: false, message: 'Cart must be an array' });
  const users = readUsers();
  const user = users.find(u => u.id === req.session.user.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  user.cart = cart;
  saveUsers(users);
  res.json({ success: true });
});

// ---- Notifications endpoints (per-user) ----
app.get('/api/notifications', (req, res) => {
  if (!req.session || !req.session.user) return res.json({ success: false, notifications: [] });
  const users = readUsers();
  const user = users.find(u => u.id === req.session.user.id);
  res.json({ success: true, notifications: (user && user.notifications) || [] });
});

app.post('/api/notifications', (req, res) => {
  if (!req.session || !req.session.user) return res.status(401).json({ success: false, message: 'Not authenticated' });
  const notification = req.body && req.body.notification;
  if (!notification) return res.status(400).json({ success: false, message: 'Missing notification' });
  const users = readUsers();
  const user = users.find(u => u.id === req.session.user.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  user.notifications = user.notifications || [];
  user.notifications.push(notification);
  saveUsers(users);
  res.json({ success: true });
});

// ---- Merchant notification helper: append notification to a merchant by username ----
app.post('/api/merchant_notify', (req, res) => {
  const { merchant, message } = req.body || {};
  if (!merchant || !message) return res.status(400).json({ success: false, message: 'Missing merchant or message' });
  const users = readUsers();
  const m = users.find(u => u.username && u.username.toLowerCase() === merchant.toLowerCase());
  if (!m) return res.status(404).json({ success: false, message: 'Merchant not found' });
  m.notifications = m.notifications || [];
  m.notifications.push({ message, time: new Date().toISOString() });
  saveUsers(users);
  res.json({ success: true });
});

app.post('/api/care', (req, res) => {
  const { message } = req.body || {};
  if (!message) return res.status(400).json({ success: false, message: 'Missing message' });
  const sessionUserId = getSessionUserId(req);
  if (sessionUserId) {
    const users = readUsers();
    const user = users.find(u => u.id === sessionUserId);
    if (user) {
      user.careMessages = user.careMessages || [];
      user.careMessages.push({ message, time: new Date().toISOString() });
      saveUsers(users);
    }
  }
  console.log(`[CARE] ${sessionUserId || 'anonymous'}: ${message}`);
  res.json({ success: true, message: 'Message sent' });
});

function handleProductDelete(req, res) {
  const { id, name } = req.body || {};
  if (!id && !name) {
    return res.status(400).json({ success: false, message: 'Missing product id or name' });
  }
  const deleted = deleteProductByIdOrName({ id, name });
  if (!deleted) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }
  res.json({ success: true });
}

app.post('/delete_product', handleProductDelete);
app.post('/api/delete_product', handleProductDelete);

// ---- Order/Purchase endpoints ----
// Create a purchase/order
app.post('/api/create_order', async (req, res) => {
  try {
    const sessionUserId = getSessionUserId(req);
    if (!sessionUserId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    const { productId, quantity, totalPrice } = req.body;
    if (!productId || !quantity || !totalPrice) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    const products = readProducts();
    const product = products.find(p => p.id === productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    const order = {
      id: uuidv4(),
      userId: sessionUserId,
      username: getSessionUsername(req) || '',
      productId,
      productName: product.name,
      merchantUsername: product.merchant,
      quantity,
      totalPrice,
      status: 'Pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    let orders = readOrders();
    orders.push(order);
    saveOrders(orders);
    res.json({ success: true, message: 'Order created', order });
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ success: false, message: 'Failed to create order' });
  }
});

// Get customer's purchase history
app.get('/api/customer_purchases', (req, res) => {
  try {
    const sessionUserId = getSessionUserId(req);
    if (!sessionUserId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    const orders = readOrders();
    const customerOrders = orders.filter(o => o.userId === sessionUserId);
    res.json({ success: true, orders: customerOrders });
  } catch (err) {
    console.error('Get purchases error:', err);
    res.status(500).json({ success: false, message: 'Failed to get purchases' });
  }
});

// Get merchant's sales
app.get('/api/merchant_sales', (req, res) => {
  try {
    const sessionUserId = getSessionUserId(req);
    if (!sessionUserId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    const users = readUsers();
    const user = users.find(u => u.id === sessionUserId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const orders = readOrders();
    const merchantOrders = orders.filter(o => o.merchantUsername === user.username);
    const totalSales = merchantOrders.reduce((sum, o) => sum + o.totalPrice, 0);
    const totalOrders = merchantOrders.length;
    const totalCustomers = new Set(merchantOrders.map(o => o.userId)).size;
    res.json({
      success: true,
      stats: {
        totalSales,
        totalOrders,
        totalCustomers,
        orders: merchantOrders
      }
    });
  } catch (err) {
    console.error('Get sales error:', err);
    res.status(500).json({ success: false, message: 'Failed to get sales' });
  }
});

// Update order status (merchant)
app.post('/api/update_order_status', (req, res) => {
  try {
    const { orderId, status } = req.body;
    if (!orderId || !status) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    
    const orders = readOrders();
    const order = orders.find(o => o.id === orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    
    order.status = status;
    order.updatedAt = new Date().toISOString();
    saveOrders(orders);
    
    res.json({ success: true, message: 'Order updated', order });
  } catch (err) {
    console.error('Update order status error:', err);
    res.status(500).json({ success: false, message: 'Failed to update order' });
  }
});

async function seedDemoUsers() {
  if (process.env.NODE_ENV === 'production') return;
  const demoAccounts = [
    {
      username: 'merchant@example.com',
      email: 'merchant@example.com',
      role: 'merchant',
      firstname: 'Merchant',
      middlename: '',
      surname: 'Demo',
      nationality: 'DemoLand',
      category: 'Retail',
      password: 'Merchant123!'
    },
    {
      username: 'customer@example.com',
      email: 'customer@example.com',
      role: 'customer',
      firstname: 'Customer',
      middlename: '',
      surname: 'Demo',
      nationality: 'DemoLand',
      category: '',
      password: 'Customer123!'
    }
  ];
  const users = readUsers();
  let changed = false;
  for (const demo of demoAccounts) {
    const exists = users.some(u => u.email.toLowerCase() === demo.email.toLowerCase() || u.username.toLowerCase() === demo.username.toLowerCase());
    if (!exists) {
      const hash = await bcrypt.hash(demo.password, 10);
      users.push({
        id: uuidv4(),
        username: demo.username,
        email: demo.email,
        password: hash,
        role: demo.role,
        firstname: demo.firstname,
        middlename: demo.middlename,
        surname: demo.surname,
        nationality: demo.nationality,
        category: demo.category,
        createdAt: new Date().toISOString(),
        cart: [],
        notifications: []
      });
      console.log(`[AUTH] Created demo user: ${demo.email}`);
      changed = true;
    }
  }
  if (changed) saveUsers(users);
}

seedDemoUsers().catch(err => {
  console.error('Failed to seed demo users:', err);
});

app.use((err, req, res, next) => {
  console.error('[UNHANDLED ERROR]', err);
  if (req.path.startsWith('/api/') || req.get('accept')?.includes('application/json')) {
    return res.status(500).json({ success: false, message: err?.message || 'Unexpected server error' });
  }
  next(err);
});

app.listen(PORT, () => {
  console.log(`GlenHub server running at http://localhost:${PORT}`);
});

// Warn at startup when Cloudinary isn't configured
if (!isCloudinaryConfigured()) {
  console.warn('Warning: Cloudinary credentials are not fully configured. Image uploads will fail until CLOUDINARY_* env vars are set.');
}
