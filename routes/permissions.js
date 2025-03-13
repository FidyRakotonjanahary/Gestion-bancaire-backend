const express = require('express');
const router = express.Router();
const permissionController = require('../controllers/permissionController');
const authMiddleware = require('../middleware/auth');
const permissionMiddleware = require('../middleware/permissions');

// Routes pour la gestion des permissions (accessible uniquement aux administrateurs)
router.get('/', 
  authMiddleware.verifyToken, 
  permissionMiddleware.checkRole('ADMIN'),
  permissionController.getAllPermissions
);

// Obtenir toutes les permissions d'un utilisateur
router.get('/user/:user_id', 
  authMiddleware.verifyToken, 
  permissionMiddleware.checkRole('ADMIN'),
  permissionController.getUserPermissions
);

// Mettre à jour les permissions d'un utilisateur
router.put('/user/:user_id', 
  authMiddleware.verifyToken, 
  permissionMiddleware.checkRole('ADMIN'),
  permissionController.updateUserPermissions
);

// Réinitialiser les permissions d'un utilisateur (revenir aux permissions par défaut du rôle)
router.delete('/user/:user_id', 
  authMiddleware.verifyToken, 
  permissionMiddleware.checkRole('ADMIN'),
  permissionController.resetUserPermissions
);

// Obtenir l'historique des changements de permission pour un utilisateur
router.get('/user/:user_id/history', 
  authMiddleware.verifyToken, 
  permissionMiddleware.checkRole('ADMIN'),
  permissionController.getPermissionHistory
);

module.exports = router;