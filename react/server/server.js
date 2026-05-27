// server/server.js
// Assignment 7 — Express backend for PlateScout.
// Now backed by MongoDB Atlas (via Mongoose) with bcrypt-hashed passwords
// and JWT-based session tokens.

require("dotenv").config();
const express  = require("express");
const cors     = require("cors");
const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");
const jwt      = require("jsonwebtoken");

const app  = express();
const PORT = process.env.PORT || 3000;

// Middleware — mount BEFORE any route.
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://assignment7-csci-342.vercel.app",
    /\.vercel\.app$/,
  ],
  credentials: true,
}));
app.use(express.json());

// server.js — add anywhere in your routes section
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    time: new Date().toISOString(),
    mongo: mongoose.connection.readyState === 1,
  });
});

// TODO: Connect Mongoose to MongoDB Atlas.
//   - Use process.env.MONGO_URI (from your .env file).
//   - Chain .then(...).catch(...) so a successful connect logs "MongoDB connected."
//     and a failure logs the error object.
//   - Place this BEFORE the schema/model so the connection is open when routes run.
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected.");
  })
  .catch((error) => {
    console.error(error);
  });

// TODO: Define a User schema and compile the User model.
//   - username:  required, unique, trimmed, minlength 3
//   - email:     required, unique, lowercase, trimmed
//   - password:  required, minlength 8
//                (Mongoose validates AFTER we hash, so this checks the hash length —
//                 still fine because bcrypt hashes are well over 8 chars.)
//   - createdAt: { type: Date, default: Date.now }
//
//   Then compile the model:
//     const User = mongoose.model("User", userSchema);
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
  },
  email:{
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const User = mongoose.model("User", userSchema);

// Shared validator — same as A6 (plain-text rules applied BEFORE we hash).
function validateInputs({ username, email, password }) {
  if (!username || username.trim().length < 3) {
    return "Username must be at least 3 characters.";
  }
  if (email !== undefined) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return "Please enter a valid email address.";
    }
  }
  if (!password || password.length < 8) {
    return "Password must be at least 8 characters.";
  }
  return "";
}

// ============================================================
// POST /api/register
// ============================================================
app.post("/api/register", async (req, res) => {
  const { username, email, password } = req.body;

  const validationError = validateInputs({ username, email, password });
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    // TODO: Check whether a user with this username already exists.
    //   - Use  await User.findOne({ username })
    //   - If found, return status 409 with { error: "Username already taken." }
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(409).json({ error: "Username already taken." });
    }

    // TODO: Hash the password with bcrypt before saving.
    //   - Use  await bcrypt.hash(password, 10)
    //   - 10 = salt rounds. Industry default for 2026 hardware.
    //   - NEVER save the plaintext password to the database.
    const hash = await bcrypt.hash(password, 10);

    // TODO: Create the user in MongoDB.
    //   - Use  await User.create({ username, email, password: <the hash> })
    //   - Mongoose schema validation runs here. If username already exists in the DB
    //     (concurrent request slipped past your findOne check), Mongoose throws an
    //     E11000 duplicate-key error — your catch block below handles it.
    const newUser = await User.create({ username, email, password: hash });

    return res.status(201).json({
      message: "User registered successfully.",
      user: { username: newUser.username, email: newUser.email },   // never echo the password or the hash
    });
  } catch (error) {
    console.error("Register error:", error);
    // Mongoose duplicate-key error (race condition past the findOne check)
    if (error.code === 11000) {
      return res.status(409).json({ error: "Username or email already taken." });
    }
    return res.status(500).json({ error: "Server error." });
  }
});

// ============================================================
// POST /api/login
// ============================================================
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required." });
  }

  try {
    // TODO: Find the user by username.
    //   - Use  await User.findOne({ username })
    const user = await User.findOne({ username });

    // TODO: Verify the password.
    //   - Use  await bcrypt.compare(password, user.password)
    //   - If the user is missing OR bcrypt.compare returns false, return status 401
    //     with { error: "Invalid username or password." }
    //   - Use the SAME generic message for both cases — never reveal which field
    //     was wrong (username enumeration is a real attack).
    const passwordMatches = user && await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      return res.status(401).json({ error: "Invalid username or password." });
    }

    // TODO: Sign a JWT.
    //   - Use  jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" })
    //   - The payload is intentionally tiny — just the user's MongoDB _id.
    //     Don't put password or sensitive fields in the payload (JWTs are base64,
    //     not encrypted — anyone with the token can decode the payload).
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });

    return res.status(200).json({
      message: "Login successful.",
      user: { username: user.username, email: user.email },
      token,   // the JWT — the client saves this in localStorage
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Server error." });
  }
});

// ============================================================
// POST /api/logout
// ============================================================
app.post("/api/logout", (req, res) => {
  // TODO: Read the Authorization header.
  //   - req.headers.authorization  is a string like  "Bearer eyJhbGciOi..."
  //   - If missing OR it doesn't start with "Bearer ", return status 401
  //     with { error: "Missing or invalid token." }
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid token." });
  }

  //
  // Why bother for a stateless JWT? Two reasons:
  //   (1) it teaches the bearer-header pattern you'll use everywhere else
  //   (2) it gives us a hook for token blocklisting later (intermediate auth topic)
  //
  // TODO: (optional) verify the token signature.
  //   - Wrap  jwt.verify(token, process.env.JWT_SECRET)  in try/catch.
  //   - For logout we ACCEPT expired tokens — a user who can't log out
  //     because their token expired is a worse UX bug than letting them out.

  return res.status(200).json({ message: "Logged out." });
});

// 404 fallback — must come AFTER every route or it'll eat them.
app.use((req, res) => {
  return res.status(404).json({ error: "Route not found." });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
