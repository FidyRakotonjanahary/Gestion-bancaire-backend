const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');
const permissionMiddleware = require('../middleware/permissions');


// Routes accessibles uniquement aux administrateurs
router.get('/', authMiddleware.verifyToken, authMiddleware.isAdmin, userController.getAllUsers);
router.post('/', authMiddleware.verifyToken, authMiddleware.isAdmin, userController.createUser);
router.get('/:id', authMiddleware.verifyToken, authMiddleware.isAdmin, userController.getUserById);
router.put('/:id', authMiddleware.verifyToken, authMiddleware.isAdmin, userController.updateUser);
router.delete('/:id', authMiddleware.verifyToken, authMiddleware.isAdmin, userController.deleteUser);

// Routes pour la gestion des permissions
router.get('/:id/permissions', authMiddleware.verifyToken, userController.getUserPermissions);
router.put('/:id/permissions', authMiddleware.verifyToken, authMiddleware.isAdmin, userController.updateUserPermissions);
router.get('/:id/permission-history', authMiddleware.verifyToken, authMiddleware.isAdmin, userController.getPermissionHistory);

// Route pour désactiver/réactiver un utilisateur
router.patch('/:id/status', authMiddleware.verifyToken, authMiddleware.isAdmin, userController.updateUserStatus);

// Route pour que l'utilisateur actuel puisse gérer son propre profil
router.get('/profile/me', authMiddleware.verifyToken, userController.getCurrentUserProfile);
router.put('/profile/me', authMiddleware.verifyToken, userController.updateCurrentUserProfile);
router.put('/profile/me/password', authMiddleware.verifyToken, userController.changePassword);

// Route pour l'historique des connexions
router.get('/:id/login-history', authMiddleware.verifyToken, authMiddleware.isAdmin, userController.getUserLoginHistory);
router.get('/profile/me/login-history', authMiddleware.verifyToken, userController.getCurrentUserLoginHistory);

module.exports = router;