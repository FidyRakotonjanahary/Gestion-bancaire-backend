const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const authMiddleware = require('../middleware/auth');
const permissionMiddleware = require('../middleware/permissions');

// Routes pour l'audit (accessibles uniquement aux administrateurs pour la plupart)
router.get('/', 
  authMiddleware.verifyToken, 
  auditController.getAllAudits
);

router.get('/stats', 
  authMiddleware.verifyToken, 
  auditController.getAuditCounters
);

// Obtenir les entrées d'audit pour un utilisateur spécifique
router.get('/user/:user_id', 
  authMiddleware.verifyToken, 
  permissionMiddleware.checkRole('ADMIN'),
  auditController.getAuditsByUser
);

// Obtenir les entrées d'audit pour un client spécifique
router.get('/client/:clientId', 
  authMiddleware.verifyToken, 
  auditController.getAuditEntriesByClient
);

// Obtenir les entrées d'audit pour un versement spécifique
router.get('/versement/:versementId', 
  authMiddleware.verifyToken, 
  auditController.getAuditEntriesByVersement
);

// Obtenir les entrées d'audit par type d'action
router.get('/type/:action_type', 
  authMiddleware.verifyToken, 
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
  auditController.getAuditsByDateRange
);

// Obtenir un audit spécifique par ID
router.get('/:id', 
  authMiddleware.verifyToken, 
  auditController.getAuditById
);

// Obtenir l'historique des changements de solde d'un client
router.get('/client/:clientId/balance-history', 
  authMiddleware.verifyToken, 
  auditController.getClientBalanceHistory
);

module.exports = router;