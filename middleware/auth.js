const jwt = require("jsonwebtoken");

const protect = (req, res, next) => {
  // 1. Get the token from the header
  const token = req.header("Authorization")?.split(" ")[1];

  // 2. If no token, block access
  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  try {
    // 3. Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Add the user info to the request
    next(); // Move to the next step
  } catch (error) {
    res.status(400).json({ error: "Invalid token." });
  }
};

module.exports = protect;
