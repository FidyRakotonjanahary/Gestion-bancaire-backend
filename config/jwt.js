const jwt = require('jsonwebtoken');
require('dotenv').config();

const revokedTokens = new Set();

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, username: user.username, role_id: user.role_id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRATION }
  );
};

const verifyToken = (token) => {
  try {
    if (isTokenRevoked(token)) {
      return { valid: false, reason: 'revoked' };
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return { valid: true, decoded };
  } catch (error) {
    return { valid: false, reason: error.message };
  }
};

const revokeToken = (token) => {
  revokedTokens.add(token);
};

const isTokenRevoked = (token) => {
  return revokedTokens.has(token);
};

const cleanupExpiredTokens = () => {
  revokedTokens.forEach(token => {
    try {
      jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        revokedTokens.delete(token);
      }
    }
  });
};

const clearRevokedTokens = () => {
  revokedTokens.clear();
};

// Nettoyage automatique une fois par jour
setInterval(cleanupExpiredTokens, 24 * 60 * 60 * 1000);

module.exports = {
  generateToken,
  verifyToken,
  revokeToken,
  isTokenRevoked,
  clearRevokedTokens
};