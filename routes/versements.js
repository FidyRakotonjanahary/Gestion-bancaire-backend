const express = require('express');
const router = express.Router();
const versementController = require('../controllers/versementController');
const authMiddleware = require('../middleware/auth');
const permissionMiddleware = require('../middleware/permissions');
const validationMiddleware = require('../middleware/validation');
const auditMiddleware = require('../middleware/audit');

// Routes pour les versements
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
  auditMiddleware.logAudit('insert'),
  versementController.createVersement
);

router.put('/:id', 
  authMiddleware.verifyToken, 
  permissionMiddleware.checkPermission('versement_update'),
  validationMiddleware.validateVersementInput,
  auditMiddleware.logAudit('update'),
  versementController.updateVersement
);

router.delete('/:id', 
  authMiddleware.verifyToken, 
  permissionMiddleware.checkPermission('versement_delete'),
  auditMiddleware.logAudit('delete'),
  versementController.deleteVersement
);

// Route pour obtenir les versements d'un client spécifique
router.get('/client/:clientId', 
  authMiddleware.verifyToken, 
  versementController.getVersementsByClient
);

module.exports = router;