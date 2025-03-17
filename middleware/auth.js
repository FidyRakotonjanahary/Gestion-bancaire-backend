// middleware/auth.js
const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');
require('dotenv').config();

module.exports = {
  verifyToken: (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Aucun token fourni'
      });
    }
    
    // Utilisez la fonction depuis l'import
    const result = jwtConfig.verifyToken(token);
    
    if (result.valid) {
      req.user = result.decoded;
      next();
    } else {
      return res.status(401).json({
        success: false,
        message: result.reason === 'revoked' 
          ? 'Non autorisé, token révoqué' 
          : 'Non autorisé, token invalide'
      });
    }
  },
  
  isAdmin: (req, res, next) => {
    // Reste du code inchangé
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