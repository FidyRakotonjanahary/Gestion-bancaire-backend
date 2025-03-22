const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');
const authMiddleware = require('../middleware/auth');
const permissionMiddleware = require('../middleware/permissions');
const validationMiddleware = require('../middleware/validation');

// Routes pour les clients
router.get('/', 
  authMiddleware.verifyToken, 
  clientController.getAllClients
);

router.get('/count',
  authMiddleware.verifyToken,
  clientController.getClientCount  // Vous devrez créer cette fonction
);

router.get('/with-balance',
  authMiddleware.verifyToken,
  clientController.getClientsWithBalance
);

router.get('/:id', 
  authMiddleware.verifyToken, 
  clientController.getClientById
);

router.post('/', 
  authMiddleware.verifyToken, 
  permissionMiddleware.checkPermission('client_create'),
  validationMiddleware.validateClientData,
  clientController.createClient
);

router.put('/:id', 
  authMiddleware.verifyToken, 
  permissionMiddleware.checkPermission('client_update'),
  validationMiddleware.validateClientData,
  clientController.updateClient
);

router.delete('/:id', 
  authMiddleware.verifyToken, 
  permissionMiddleware.checkPermission('client_delete'),
  clientController.deleteClient
);

// Route pour consulter le solde d'un client
router.get('/:id/solde', 
  authMiddleware.verifyToken, 
  clientController.getClientBalance
);

module.exports = router;