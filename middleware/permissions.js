const pool = require('../utils/db');
const logger = require('../utils/loggers');
const Permission = require('../models/Permission');

// Middleware pour vérifier les permissions d'un utilisateur
const checkPermission = (permissionType) => {
  return async (req, res, next) => {
    try {
      const userId = req.user.id;
      
      // Si c'est un admin, passez directement
      if (req.user.role === 'ADMIN' || req.user.role_id === 1) {
        return next();
      }
      
      // Utiliser la méthode du modèle pour vérifier la permission
      const hasPermission = await Permission.checkPermission(userId, permissionType);
      
      if (!hasPermission) {
        logger.info(`Accès refusé: Utilisateur ${userId} a tenté d'accéder à ${permissionType}`);
        return res.status(403).json({ 
          success: false, 
          message: `Permission refusée: ${permissionType}` 
        });
      }
      
      next();
    } catch (error) {
      logger.error('Erreur lors de la vérification des permissions:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erreur serveur lors de la vérification des permissions' 
      });
    }
  };
};

// Fonction pour vérifier le rôle d'un utilisateur
const checkRole = (requiredRole) => {
  return (req, res, next) => {
    try {
      // Vérifier si l'utilisateur est authentifié
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Non autorisé - Utilisateur non authentifié'
        });
      }

      // Vérification simplifiée du rôle
      let hasRequiredRole = false;
      
      // Vérification basée sur le nom du rôle
      if (req.user.role && req.user.role === requiredRole) {
        hasRequiredRole = true;
      }
      
      // Vérification basée sur l'ID du rôle
      if (req.user.role_id) {
        const roleMap = {
          'ADMIN': 1,
          'USER': 2
        };
        
        if (roleMap[requiredRole] === req.user.role_id) {
          hasRequiredRole = true;
        }
      }
      
      if (!hasRequiredRole) {
        logger.info(`Accès refusé: Utilisateur ${req.user.id} a tenté d'accéder à une route réservée à ${requiredRole}`);
        return res.status(403).json({
          success: false,
          message: `Accès refusé - Rôle ${requiredRole} requis`
        });
      }

      next();
    } catch (error) {
      logger.error(`Erreur lors de la vérification du rôle ${requiredRole}:`, error);
      res.status(500).json({
        success: false,
        message: 'Erreur serveur lors de la vérification du rôle'
      });
    }
  };
};

// Exporter toutes les fonctions
module.exports = {
  checkPermission,
  checkRole,
  // Permissions pour les clients
  checkAddClient: checkPermission('client_create'),
  checkModifyClient: checkPermission('client_update'),
  checkDeleteClient: checkPermission('client_delete'),
  // Permissions pour les versements
  checkAddVersement: checkPermission('versement_create'),
  checkModifyVersement: checkPermission('versement_update'),
  checkDeleteVersement: checkPermission('versement_delete'),
  // Permissions pour consulter les données
  checkViewClient: checkPermission('client_read'),
  checkViewVersement: checkPermission('versement_read')
};