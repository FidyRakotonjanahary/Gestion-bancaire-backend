const Permission = require('../models/Permission');
const logger = require('../utils/loggers');
const pool = require('../utils/db');

exports.getUserPermissions = async (req, res) => {
  const { user_id } = req.params;
  
  try {
    // Vérifier si l'utilisateur existe
    const userQuery = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [user_id]
    );
    
    if (userQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }
    
    // Récupérer les permissions avec le modèle
    const permissions = await Permission.getByUserId(user_id);
    
    res.status(200).json({
      success: true,
      data: permissions
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des permissions:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des permissions'
    });
  }
};

exports.updateUserPermissions = async (req, res) => {
  const { user_id } = req.params;
  const permissions = req.body.permissions; // Array of {permissionName, isGranted}
  
  try {
    // Vérifier si l'utilisateur existe
    const userQuery = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [user_id]
    );
    
    if (userQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }
    
    // Mettre à jour les permissions avec le modèle
    await Permission.updateUserPermissions(
      user_id,
      permissions,
      req.user.id // Current admin user making the change
    );
    
    // Récupérer toutes les permissions mises à jour pour le test
    const updatedPermissions = await Permission.getByUserId(user_id);
    
    res.status(200).json({
      success: true,
      message: 'Permissions mises à jour avec succès',
      data: updatedPermissions
    });
  } catch (error) {
    logger.error('Erreur lors de la mise à jour des permissions:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour des permissions'
    });
  }
};

exports.getPermissionHistory = async (req, res) => {
  const { user_id } = req.params;
  
  try {
    // Vérifier si l'utilisateur existe
    const userQuery = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [user_id]
    );
    
    if (userQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }
    
    // Récupérer l'historique des permissions
    const history = await Permission.getPermissionHistory(user_id);
    
    res.status(200).json({
      success: true,
      data: history
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération de l\'historique des permissions:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'historique des permissions'
    });
  }
};

exports.getAllPermissions = async (req, res) => {
  try {
    // Récupérer la liste des noms de permissions
    const permissionNames = await Permission.getAllPermissionNames();
    
    // Récupérer tous les utilisateurs 
    const usersQuery = await pool.query(
      `SELECT u.id, u.username, u.email, r.name as role_name
       FROM users u
       JOIN roles r ON u.role_id = r.id
       ORDER BY u.username`
    );
    
    // Pour chaque utilisateur, récupérer ses permissions
    const result = await Promise.all(usersQuery.rows.map(async (user) => {
      const userPermissions = await Permission.getByUserId(user.id);
      return {
        ...user,
        permissions: userPermissions,
        isAdmin: user.role_name === 'ADMIN'
      };
    }));
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération de toutes les permissions:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de toutes les permissions'
    });
  }
};

// Suppression des permissions d'un utilisateur
exports.resetUserPermissions = async (req, res) => {
  const { user_id } = req.params;
  
  try {
    // Vérifier si l'utilisateur existe
    const userQuery = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [user_id]
    );
    
    if (userQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }
    
    // Récupérer toutes les permissions actuelles
    const currentPermissions = await Permission.getByUserId(user_id);
    
    if (currentPermissions.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Aucune permission spécifique à réinitialiser'
      });
    }
    
    // Supprimer chaque permission et enregistrer l'historique
    const client = await pool.getClient();
    
    try {
      await client.query('BEGIN');
      
      for (const perm of currentPermissions) {
        // Supprimer la permission
        await client.query(
          'DELETE FROM user_permissions WHERE id = $1',
          [perm.id]
        );
        
        // Enregistrer l'historique
        await client.query(
          `INSERT INTO permission_history (user_id, permission_name, is_granted, changed_by, changed_at)
           VALUES ($1, $2, $3, $4, $5)`,
          [user_id, perm.permission_name, false, req.user.id, new Date()]
        );
      }
      
      await client.query('COMMIT');
      
      res.status(200).json({
        success: true,
        message: 'Permissions réinitialisées avec succès'
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Erreur lors de la réinitialisation des permissions:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la réinitialisation des permissions'
    });
  }
};

module.exports = exports;