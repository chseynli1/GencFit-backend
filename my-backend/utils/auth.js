const jwt = require('jsonwebtoken');

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRE || '24h',
      issuer: 'sports-platform',
      audience: 'sports-platform-users'
    }
  );
};

const { generateToken } = require('../utils/auth');

// Login və ya register sonrası
const token = generateToken(user._id);
res.json({
  success: true,
  token,
  user: user.toJSON()
});


// Verify JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid token');
  }
};

// Extract token from request
const extractToken = (req) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    return req.headers.authorization.split(' ')[1];
  }
  return null;
};

module.exports = {
  generateToken,
  verifyToken,
  extractToken
};