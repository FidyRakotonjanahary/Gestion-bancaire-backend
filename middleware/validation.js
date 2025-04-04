const validators = require('../utils/validators');

module.exports = {
  validateRegister: (req, res, next) => {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Tous les champs sont requis'
      });
    }
    
    if (!validators.isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Format d\'email invalide'
      });
    }
    
    if (!validators.isValidPassword(password)) {
      return res.status(400).json({
        success: false,
        message: 'Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre'
      });
    }
    
    // Sanitize inputs
    req.body.username = validators.sanitizeInput(username);
    req.body.email = validators.sanitizeInput(email);
    
    next();
  },
  
  // Ajouter cette fonction pour la validation de connexion
  validateLogin: (req, res, next) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Nom d\'utilisateur et mot de passe requis'
      });
    }
    
    // Sanitize inputs
    req.body.username = validators.sanitizeInput(username);
    
    next();
  },

  validateUserInput: (req, res, next) => {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Tous les champs sont requis'
      });
    }
    
    if (!validators.isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Format d\'email invalide'
      });
    }
    
    if (!validators.isValidPassword(password)) {
      return res.status(400).json({
        success: false,
        message: 'Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre'
      });
    }
    
    // Sanitize inputs
    req.body.username = validators.sanitizeInput(username);
    req.body.email = validators.sanitizeInput(email);
    
    next();
  },
  
  validateVersementInput: (req, res, next) => {
    const { client_id, amount } = req.body;  // Changé amount en amount
    
    if (!client_id || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Le numéro de compte client et le amount sont requis'
      });
    }
    
    if (!validators.isValidAmount(amount)) {  // Changé amount en amount
      return res.status(400).json({
        success: false,
        message: 'Le amount doit être un nombre positif'
      });
    }
    
    next();
  },
  
  validateClientData: (req, res, next) => {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Le nom du client est requis'
      });
    }
    
    // Sanitize input
    req.body.name = validators.sanitizeInput(name);
    
    next();
  },
  
  // Ajout de la validation pour la raison de rejet
  validateRejectReason: (req, res, next) => {
    const { reason } = req.body;
    
    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'La raison du rejet est requise'
      });
    }
    
    // Sanitize input
    req.body.reason = validators.sanitizeInput(reason);
    
    next();
  }
};