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
  clientController.getClientCount
);

router.get('/with-balance',
  authMiddleware.verifyToken,
  clientController.getClientsWithBalance
);

router.get('/search',
  authMiddleware.verifyToken,
  clientController.searchClients
);

router.get('/:id', 
  authMiddleware.verifyToken, 
  clientController.getClientById
);

router.get('/account/:account_number',
  authMiddleware.verifyToken,
  clientController.getClientByAccountNumber
);

router.get('/:id/transactions',
  authMiddleware.verifyToken,
  clientController.getClientVersements
);

router.get('/:id/history',
  authMiddleware.verifyToken,
  clientController.getClientBalanceHistory
);

router.get('/:id/balance', 
  authMiddleware.verifyToken, 
  clientController.getClientBalance
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

module.exports = router;