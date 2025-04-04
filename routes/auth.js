const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');
const { validateLogin, validateRegister } = require('../middleware/validation');

// Route publique pour la connexion
router.post('/login', validateLogin, authController.login);

// Route protégée pour obtenir l'utilisateur actuel
router.get('/me', authMiddleware.verifyToken, authController.getCurrentUser);

// Route pour la déconnexion
router.post('/logout', authMiddleware.verifyToken, authController.logout);

// Route pour obtenir l'historique des connexions (utilisateur lui-même ou admin)
router.get('/login-history', authMiddleware.verifyToken, authController.getLoginHistory);

module.exports = router;