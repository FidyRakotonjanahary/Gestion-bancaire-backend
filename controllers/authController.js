const bcrypt = require('bcrypt');
const db = require('../utils/db');
const jwtConfig = require('../config/jwt');
const { revokeToken } = require('../config/jwt'); 
const logger = require('../utils/loggers');

exports.register = async (req, res) => {
  const { username, email, password, role_id } = req.body;
  
  try {
    // Vérifier si l'utilisateur existe déjà
    const userCheck = await db.query(
      'SELECT * FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );
    
    if (userCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Nom d\'utilisateur ou email déjà utilisé'
      });
    }
    
    // Hasher le mot de passe
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Utiliser role_id au lieu de role
    // Valeur amountaut 2 si non spécifié (rôle utilisateur standard)
    const defaultRoleId = role_id || 2;
    
    const result = await db.query(
      `INSERT INTO users (username, email, password, role_id) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, username, email, role_id`,
      [username, email, hashedPassword, defaultRoleId]
    );
    
    // Créer les permissions par défaut pour l'utilisateur
    const basicPermissions = ['client_read', 'versement_read']; // Liste des permissions de base

    // Utiliser Promise.all pour exécuter toutes les insertions en parallèle
    await Promise.all(
      basicPermissions.map(permission => 
        db.query(
          `INSERT INTO user_permissions (user_id, permission_name, is_granted) 
           VALUES ($1, $2, true)`,
          [result.rows[0].id, permission]
        )
      )
    );
    
    // Récupérer le nom du rôle pour l'inclure dans la réponse
    const roleResult = await db.query(
      'SELECT name FROM roles WHERE id = $1',
      [result.rows[0].role_id]
    );
    
    const roleName = roleResult.rows.length > 0 ? roleResult.rows[0].name : 'unknown';
    
    // Générer un token JWT
    const token = jwtConfig.generateToken(result.rows[0]);
    // Après l'insertion de l'utilisateur
console.log('Utilisateur créé avec role_id:', result.rows[0].role_id);
    res.status(201).json({
      success: true,
      message: 'Utilisateur enregistré avec succès',
      data: {
        user: {
          id: result.rows[0].id,
          username: result.rows[0].username,
          email: result.rows[0].email,
          role_id: result.rows[0].role_id,
          role: roleName  // Inclure le nom du rôle pour la compatibilité avec le code existant
        },
        token
      }
    });
  } catch (error) {
    logger.error('Erreur lors de l\'enregistrement:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'enregistrement'
    });
  }
};

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
    
    // Mettre à jour l'historique de connexion
await db.query(
  'INSERT INTO login_history (user_id, ip_address, user_agent, action_type) VALUES ($1, $2, $3, $4)',
  [user.id, req.ip || 'unknown', req.headers['user-agent'] || 'unknown', 'login']
);
    
    // Générer un token JWT
    const token = jwtConfig.generateToken(user);
    
    res.status(200).json({
      success: true,
      message: 'Connexion réussie',
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role_id: user.role_id,
          role: user.role_name  // Utiliser le nom du rôle de la jointure
        },
        token
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