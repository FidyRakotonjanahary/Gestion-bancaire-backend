const jwt = require('jsonwebtoken');
require('dotenv').config();

// Simple storage for revoked tokens (use Redis or database in production)
const revokedTokens = new Set();

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, username: user.username, role_id: user.role_id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRATION }
  );
};

const revokeToken = (token) => {
  revokedTokens.add(token);
};

const isTokenRevoked = (token) => {
  return revokedTokens.has(token);
};


const clearRevokedTokens = () => {
  revokedTokens.clear();
};

module.exports = {
  generateToken,
  revokeToken,
  isTokenRevoked,
  clearRevokedTokens
};