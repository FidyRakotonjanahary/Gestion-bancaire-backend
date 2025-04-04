const express = require('express');
const router = express.Router();
const versementController = require('../controllers/versementController');
const authMiddleware = require('../middleware/auth');
const permissionMiddleware = require('../middleware/permissions');
const validationMiddleware = require('../middleware/validation');

// Routes pour les statistiques et recherches
router.get('/stats', 
  authMiddleware.verifyToken,
  versementController.getVersementCount
);

router.get('/date', 
  authMiddleware.verifyToken,
  versementController.getVersementsByDateRange
);

// Route pour obtenir les versements d'un client spécifique
// Attention: cette route doit être avant '/:id' pour éviter la confusion des paramètres
router.get('/client/:client_id', 
  authMiddleware.verifyToken, 
  versementController.getVersementsByClient
);

// Routes CRUD standards
router.get('/', 
  authMiddleware.verifyToken, 
  versementController.getAllVersements
);

router.get('/:id', 
  authMiddleware.verifyToken, 
  versementController.getVersementById
);

router.post('/', 
  authMiddleware.verifyToken, 
  permissionMiddleware.checkPermission('versement_create'),
  validationMiddleware.validateVersementInput,
  versementController.createVersement
);

router.put('/:id', 
  authMiddleware.verifyToken, 
  permissionMiddleware.checkPermission('versement_update'),
  validationMiddleware.validateVersementInput,
  versementController.updateVersement
);

router.delete('/:id', 
  authMiddleware.verifyToken, 
  permissionMiddleware.checkPermission('versement_delete'),
  versementController.deleteVersement
);
router.get('/:id/audit', 
  authMiddleware.verifyToken, 
  permissionMiddleware.checkPermission('versement_read'),
  versementController.getVersementAuditTrail
);
module.exports = router;