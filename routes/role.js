const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roleController');
const authMiddleware = require('../middleware/auth');
// const permissionMiddleware = require('../middleware/permissions');

// Middleware d'authentification et de permission à ajouter plus tard
router.get('/', 
  authMiddleware.verifyToken,
//   permissionMiddleware.checkPermission('read_roles'),
  roleController.getAllRoles
);

router.get('/:id', 
  authMiddleware.verifyToken,
//   permissionMiddleware.checkPermission('read_roles'),
  roleController.getRoleById
);

router.post('/', 
  authMiddleware.verifyToken,
//   permissionMiddleware.checkPermission('create_roles'),
  roleController.createRole
);

router.put('/:id', 
  authMiddleware.verifyToken,
//   permissionMiddleware.checkPermission('update_roles'),
  roleController.updateRole
);

router.delete('/:id', 
  authMiddleware.verifyToken,
//   permissionMiddleware.checkPermission('delete_roles'),
  roleController.deleteRole
);

module.exports = router;