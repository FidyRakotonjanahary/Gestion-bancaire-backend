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

// Fonction de vérification utilitaire que vous pourrez utiliser plus tard si besoin
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

// Ajout d'une fonction pour nettoyer les tokens expirés
const cleanupExpiredTokens = () => {
  revokedTokens.forEach(token => {
    try {
      jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      // Si le token est expiré, on le retire de la liste
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