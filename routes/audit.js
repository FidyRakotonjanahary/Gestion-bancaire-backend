const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const authMiddleware = require('../middleware/auth');
const permissionMiddleware = require('../middleware/permissions');

// Routes pour l'audit (accessibles uniquement aux administrateurs pour la plupart)
router.get('/', 
  authMiddleware.verifyToken, 
  permissionMiddleware.checkRole('ADMIN'),
  auditController.getAllAudits
);

// Obtenir les compteurs d'audit
router.get('/counters', 
  authMiddleware.verifyToken, 
  permissionMiddleware.checkRole('ADMIN'),
  auditController.getAuditCounters
);

// Obtenir les statistiques détaillées d'audit
router.get('/stats', 
  authMiddleware.verifyToken, 
  permissionMiddleware.checkRole('ADMIN'),
  auditController.getAuditStats
);


router.get('/user/:user_id', 
  authMiddleware.verifyToken, 
  permissionMiddleware.checkRole('ADMIN'),
  auditController.getAuditsByUser
);


router.get('/client/:clientId', 
  authMiddleware.verifyToken, 
  permissionMiddleware.checkRole('ADMIN'),
  auditController.getAuditEntriesByClient
);

// Obtenir l'historique des changements de solde d'un client
router.get('/client/:clientId/balance-history', 
  authMiddleware.verifyToken, 
  permissionMiddleware.checkRole('ADMIN'),
  auditController.getClientBalanceHistory
);

// Obtenir les entrées d'audit pour un versement spécifique
router.get('/versement/:versementId', 
  authMiddleware.verifyToken, 
  auditController.getAuditEntriesByVersement
);

// Obtenir les entrées d'audit par type d'action
router.get('/type/:action_type', 
  authMiddleware.verifyToken, 
  permissionMiddleware.checkRole('ADMIN'),
  auditController.getAuditsByActionType
);

// Obtenir les audits récents
router.get('/recent', 
  authMiddleware.verifyToken, 
  auditController.getRecentAudits
);

// Obtenir les audits par plage de dates
router.get('/date-range', 
  authMiddleware.verifyToken, 
  permissionMiddleware.checkRole('ADMIN'),
  auditController.getAuditsByDateRange
);


router.get('/:id', 
  authMiddleware.verifyToken, 
  auditController.getAuditById
);

module.exports = router;