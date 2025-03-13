const jwt = require('jsonwebtoken');
const { isTokenRevoked } = require('../config/jwt');
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
    
    try {
      // Vérifier si le token a été révoqué
      if (isTokenRevoked(token)) {
        return res.status(401).json({
          success: false,
          message: 'Non autorisé, token révoqué'
        });
      }
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Non autorisé, token invalide'
      });
    }
  },
  
  isAdmin: (req, res, next) => {
    // D'abord vérifier si l'utilisateur est authentifié
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Non authentifié'
      });
    }
    
    // Ensuite vérifier si l'utilisateur a les droits d'admin
    if (req.user.role_id !== 1) {
      return res.status(403).json({
        success: false,
        message: 'Nécessite des privilèges administrateur'
      });
    }
    
    next();
  }
};