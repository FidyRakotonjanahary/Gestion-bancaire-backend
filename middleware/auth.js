// middleware/auth.js
const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');
require('dotenv').config();

module.exports = {
verifyToken : (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'Token non fourni' });
  }

  const result = jwtConfig.verifyToken(token);
  
  if (!result.valid) {
    if (result.reason === 'revoked') {
      return res.status(401).json({ message: 'Token révoqué' });
    }
    return res.status(401).json({ message: 'Token invalide' });
  }

  req.user = result.decoded;
  next();
},

  isAdmin: (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Non authentifié'
      });
    }
    
    if (req.user.role_id !== 1) {
      return res.status(403).json({
        success: false,
        message: 'Nécessite des privilèges administrateur'
      });
    }
    
    next();
  }
};