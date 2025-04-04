const bcrypt = require('bcrypt');
const db = require('../utils/db');
const jwtConfig = require('../config/jwt');
const { revokeToken } = require('../config/jwt'); 
const logger = require('../utils/loggers');



exports.login = async (req, res) => {
  const { username, password } = req.body;
  
  try {
    // Vérifier si l'utilisateur existe et joindre le nom du rôle
    const result = await db.query(
      `SELECT u.*, r.name as role_name 
       FROM users u 
       LEFT JOIN roles r ON u.role_id = r.id 
       WHERE u.username = $1`,
      [username]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Identifiants invalides'
      });
    }
    
    const user = result.rows[0];
    
    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Identifiants invalides'
      });
    }
    
    // Vérifier le statut de l'utilisateur
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Votre compte est désactivé. Veuillez contacter l\'administrateur.',
        status: 'inactive'
      });
    }
    
    // Mettre à jour l'historique de connexion
    await db.query(
      'INSERT INTO login_history (user_id, ip_address, user_agent, action_type) VALUES ($1, $2, $3, $4)',
      [user.id, req.ip || 'unknown', req.headers['user-agent'] || 'unknown', 'login']
    );
    
    // Génération du token
    const token = jwtConfig.generateToken(user);
    
    res.status(200).json({
      success: true,
      message: 'Connexion réussie',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role_id: user.role_id,
          role: user.role_name  
        },
      }
    });
  } catch (error) {
    logger.error('Erreur lors de la connexion:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la connexion'
    });
  }
};

exports.getCurrentUser = async (req, res) => {
  try {
    // L'ID de l'utilisateur est disponible via req.user.id (ajouté par le middleware verifyToken)
    const result = await db.query(
      `SELECT u.id, u.username, u.email, u.role_id, r.name as role
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.id = $1`,
      [req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        user: result.rows[0]
      }
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des données utilisateur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

exports.logout = async (req, res) => {
  try {
    // Récupérer le token depuis le header d'autorisation
    const token = req.headers['authorization']?.split(' ')[1];
    
    // Révoquer le token si présent
    if (token) {
      revokeToken(token);
    }

    // Option 2: Ajouter un enregistrement dans login_history avec un type "logout"
    await db.query(
      'INSERT INTO login_history (user_id, ip_address, user_agent, action_type) VALUES ($1, $2, $3, $4)',
      [req.user.id, req.ip || 'unknown', req.headers['user-agent'] || 'unknown', 'logout']
    );
    
    // Clear any server-side session or cookie if applicable
    res.clearCookie('token');
    
    res.status(200).json({
      success: true,
      message: 'Déconnexion réussie'
    });
  } catch (error) {
    logger.error('Erreur lors de la déconnexion:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la déconnexion'
    });
  }
};

exports.getLoginHistory = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT login_time, ip_address, user_agent
       FROM login_history
       WHERE user_id = $1
       ORDER BY login_time DESC
       LIMIT 10`,
      [req.user.id]
    );
    
    res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération de l\'historique des connexions:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'historique des connexions'
    });
  }
};
