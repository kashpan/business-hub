require("dotenv").config();
const express = require("express");
const sequelize = require("./database");
const Unit = require("./models/Unit");
const User = require("./models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const auth = require("./middleware/auth");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(express.json());
app.use(express.static("public"));

const cors = require("cors");
app.use(cors());

const PORT = process.env.PORT || 3500;

// --- MULTER CONFIGURATION ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "public", "uploads");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage: storage });

// --- DATABASE SYNC ---
sequelize
  .sync({ alter: true })
  .then(() => console.log("Database synced and secure!"))
  .catch((err) => console.error("Sync error:", err));

// --- VALIDATION MIDDLEWARE ---
const validateUnit = (req, res, next) => {
  const { name, location } = req.body;
  if (!name || !location) {
    return res.status(400).json({ error: "Name and Location are required!" });
  }
  next();
};

// --- AUTH ROUTES ---

app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, password } = req.body;
    const userExists = await User.findOne({ where: { username } });
    if (userExists)
      return res.status(400).json({ error: "User already exists" });

    const newUser = await User.create({ username, password });
    res.status(201).json({ message: "User registered!", userId: newUser.id });
  } catch (error) {
    res.status(500).json({ error: "Registration failed" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ where: { username } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );
    res.json({ message: "Login successful!", token });
  } catch (error) {
    res.status(500).json({ error: "Login failed" });
  }
});

app.get("/api/auth/me", auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ["username", "createdAt"],
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Profile error" });
  }
});

app.delete("/api/auth/delete-account", auth, async (req, res) => {
  try {
    await Unit.destroy({ where: { userId: req.user.id } });
    await User.destroy({ where: { id: req.user.id } });
    res.json({ message: "Account and data deleted." });
  } catch (error) {
    res.status(500).json({ error: "Delete failed" });
  }
});

// --- UNIT ROUTES ---

app.get("/api/units", auth, async (req, res) => {
  try {
    const units = await Unit.findAll({ where: { userId: req.user.id } });
    res.json(units);
  } catch (error) {
    res.status(500).json({ error: "Fetch failed" });
  }
});

app.post(
  "/api/units",
  auth,
  upload.single("image"),
  validateUnit,
  async (req, res) => {
    try {
      const { name, location, category, status } = req.body;
      const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
      const newUnit = await Unit.create({
        name,
        location,
        category: category || "Office",
        status: status || "Active",
        imageUrl,
        userId: req.user.id,
      });
      res.status(201).json(newUnit);
    } catch (error) {
      res.status(500).json({ error: "Create failed" });
    }
  },
);

app.put(
  "/api/units/:id",
  auth,
  upload.single("image"),
  validateUnit,
  async (req, res) => {
    try {
      const unit = await Unit.findOne({
        where: { id: req.params.id, userId: req.user.id },
      });
      if (!unit) return res.status(404).json({ error: "Access denied" });

      const { name, location, category, status } = req.body;

      // --- REFINEMENT: Delete old image if new one is uploaded ---
      if (req.file && unit.imageUrl) {
        const oldPath = path.join(__dirname, "public", unit.imageUrl);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        unit.imageUrl = `/uploads/${req.file.filename}`;
      } else if (req.file) {
        unit.imageUrl = `/uploads/${req.file.filename}`;
      }

      unit.name = name;
      unit.location = location;
      unit.category = category || unit.category;
      unit.status = status || unit.status;
      await unit.save();

      res.json({ message: "Updated!", unit });
    } catch (err) {
      res.status(500).json({ error: "Update failed" });
    }
  },
);

app.delete("/api/units/:id", auth, async (req, res) => {
  try {
    const unit = await Unit.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!unit) return res.status(404).json({ error: "Access denied" });

    if (unit.imageUrl) {
      const filePath = path.join(__dirname, "public", unit.imageUrl);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await unit.destroy();
    res.json({ message: "Unit deleted!" });
  } catch (error) {
    res.status(500).json({ error: "Delete failed" });
  }
});

app.listen(PORT, () => console.log(`Server live on port ${PORT}`));
