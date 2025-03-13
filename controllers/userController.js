const bcrypt = require('bcrypt');
const User = require('../models/User');
const logger = require('../utils/loggers');

exports.createUser = async (req, res) => {
  const { username, email, password, full_name, role_id } = req.body;
  
  try {
    // Vérifier si l'utilisateur existe déjà via le modèle
    const existingUser = await User.getByUsername(username);
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Cet utilisateur existe déjà'
      });
    }
    
    // Créer l'utilisateur via le modèle
    const userData = {
      username,
      email,
      password, // Le modèle User.create s'occupe du hashage
      full_name,
      role_id
    };
    
    const newUser = await User.create(userData);
    
    res.status(201).json({
      success: true,
      message: 'Utilisateur créé avec succès',
      data: newUser
    });
  } catch (error) {
    logger.error('Erreur lors de la création de l\'utilisateur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de l\'utilisateur'
    });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.getAll();
    
    res.status(200).json({
      success: true,
      data: users
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des utilisateurs:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des utilisateurs'
    });
  }
};

exports.getUserById = async (req, res) => {
  const { id } = req.params;
  
  try {
    const user = await User.getById(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }
    
    // Ne pas envoyer le mot de passe
    delete user.password;
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération de l\'utilisateur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'utilisateur'
    });
  }
};

exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const { username, email, full_name, role_id, is_active } = req.body;
  
  try {
    // Vérifier si l'utilisateur existe
    const user = await User.getById(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }
    
    // Mettre à jour l'utilisateur
    const userData = {
      username,
      email,
      full_name,
      role_id,
      is_active: is_active !== undefined ? is_active : user.is_active
    };
    
    const updatedUser = await User.update(id, userData);
    
    res.status(200).json({
      success: true,
      message: 'Utilisateur mis à jour avec succès',
      data: updatedUser
    });
  } catch (error) {
    logger.error('Erreur lors de la mise à jour de l\'utilisateur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de l\'utilisateur'
    });
  }
};

exports.updateUserPermissions = async (req, res) => {
  const { id } = req.params;
  const { permissions } = req.body; // Array of {permission_name, is_granted}
  
  try {
    // Vérifier si l'utilisateur existe
    const user = await User.getById(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }
    
    const permissionResults = [];
    
    // Mettre à jour chaque permission
    for (const perm of permissions) {
      if (perm.is_granted) {
        const result = await User.grantPermission(id, perm.permission_name, req.user.id);
        permissionResults.push(result);
      } else {
        const result = await User.revokePermission(id, perm.permission_name, req.user.id);
        permissionResults.push(result);
      }
    }
    
    res.status(200).json({
      success: true,
      message: 'Permissions mises à jour avec succès',
      data: permissionResults
    });
  } catch (error) {
    logger.error('Erreur lors de la mise à jour des permissions:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour des permissions'
    });
  }
};

exports.changePassword = async (req, res) => {
  const { current_password, new_password } = req.body;
  
  try {
    // Utiliser directement l'ID de l'utilisateur connecté
    const userId = req.user.id;
    
    // Récupérer l'utilisateur avec son mot de passe
    const user = await User.getByUsername((await User.getById(userId)).username);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }
    
    // Vérifier l'ancien mot de passe
    const isPasswordValid = await bcrypt.compare(current_password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Mot de passe actuel incorrect'
      });
    }
    
    // Mettre à jour le mot de passe
    await User.updatePassword(userId, new_password);
    
    res.status(200).json({
      success: true,
      message: 'Mot de passe modifié avec succès'
    });
  } catch (error) {
    logger.error('Erreur lors du changement de mot de passe:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du changement de mot de passe'
    });
  }
};

exports.deleteUser = async (req, res) => {
  const { id } = req.params;
  
  try {
    // Vérifier si l'utilisateur existe
    const user = await User.getById(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }
    
    // Supprimer l'utilisateur
    await User.delete(id);
    
    res.status(200).json({
      success: true,
      message: 'Utilisateur supprimé avec succès'
    });
  } catch (error) {
    logger.error('Erreur lors de la suppression de l\'utilisateur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de l\'utilisateur'
    });
  }
};

exports.getUserPermissions = async (req, res) => {
  const { id } = req.params;
  
  try {
    // Vérifier si l'utilisateur existe
    const user = await User.getById(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }
    
    // Récupérer les permissions
    const permissions = await User.getUserPermissions(id);
    
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

exports.updateUserStatus = async (req, res) => {
  const { id } = req.params;
  const { is_active } = req.body;
  
  try {
    // Vérifier si l'utilisateur existe
    const user = await User.getById(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }
    
    // Mettre à jour le statut
    const userData = {
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      role_id: user.role_id,
      is_active: is_active
    };
    
    const updatedUser = await User.update(id, userData);
    
    const statusMessage = is_active ? 'activé' : 'désactivé';
    
    res.status(200).json({
      success: true,
      message: `Utilisateur ${statusMessage} avec succès`,
      data: updatedUser
    });
  } catch (error) {
    logger.error('Erreur lors de la mise à jour du statut de l\'utilisateur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du statut de l\'utilisateur'
    });
  }
};

exports.getCurrentUserProfile = async (req, res) => {
  try {
    const user_id = req.user.id;
    
    const user = await User.getById(user_id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Profil utilisateur non trouvé'
      });
    }
    
    // Ne pas renvoyer le mot de passe
    delete user.password;
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération du profil utilisateur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du profil utilisateur'
    });
  }
};

exports.updateCurrentUserProfile = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { username, email, full_name } = req.body;
    
    // Récupérer les données actuelles de l'utilisateur
    const currentUser = await User.getById(user_id);
    
    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }
    
    // Vérifier si le nom d'utilisateur ou l'email est déjà utilisé par un autre utilisateur
    if (username !== currentUser.username) {
      const existingUsername = await User.getByUsername(username);
      if (existingUsername) {
        return res.status(400).json({
          success: false,
          message: 'Ce nom d\'utilisateur est déjà utilisé'
        });
      }
    }
    
    // Mettre à jour le profil
    const userData = {
      username: username || currentUser.username,
      email: email || currentUser.email,
      full_name: full_name || currentUser.full_name,
      role_id: currentUser.role_id,
      is_active: currentUser.is_active
    };
    
    const updatedUser = await User.update(user_id, userData);
    
    res.status(200).json({
      success: true,
      message: 'Profil mis à jour avec succès',
      data: updatedUser
    });
  } catch (error) {
    logger.error('Erreur lors de la mise à jour du profil:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du profil'
    });
  }
};

exports.getUserLoginHistory = async (req, res) => {
  const { id } = req.params;
  
  try {
    // Vérifier si l'utilisateur existe
    const user = await User.getById(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }
    
    // Récupérer l'historique des connexions
    const loginHistory = await User.getLoginHistory(id);
    
    res.status(200).json({
      success: true,
      data: loginHistory
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération de l\'historique des connexions:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'historique des connexions'
    });
  }
};

exports.getCurrentUserLoginHistory = async (req, res) => {
  try {
    const user_id = req.user.id;
    
    // Récupérer l'historique des connexions
    const loginHistory = await User.getLoginHistory(user_id);
    
    res.status(200).json({
      success: true,
      data: loginHistory
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération de l\'historique des connexions:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'historique des connexions'
    });
  }
};

exports.logUserActivity = async (req, res) => {
  try {
    const user_id = req.user.id;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const { action_type } = req.body;
    
    // Enregistrer l'activité
    await User.logLogin(user_id, ipAddress, userAgent, action_type);
    
    // Si c'est une déconnexion, mettre à jour last_logout
    if (action_type === 'logout') {
      await User.updateLogout(user_id);
    }
    
    res.status(200).json({
      success: true,
      message: 'Activité utilisateur enregistrée'
    });
  } catch (error) {
    logger.error('Erreur lors de l\'enregistrement de l\'activité:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'enregistrement de l\'activité'
    });
  }
};

exports.getPermissionHistory = async (req, res) => {
  const { id } = req.params;
  
  try {
    // Vérifier si l'utilisateur existe
    const user = await User.getById(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }
    
    // Récupérer l'historique des permissions
    const permissionHistory = await User.getPermissionHistory(id);
    
    res.status(200).json({
      success: true,
      data: permissionHistory
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération de l\'historique des permissions:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'historique des permissions'
    });
  }
};

exports.updateFailedLoginAttempts = async (req, res) => {
  const { id } = req.params;
  const { failed } = req.body;
  
  try {
    // Mettre à jour les tentatives de connexion échouées
    const result = await User.updateLoginAttempts(id, failed);
    
    res.status(200).json({
      success: true,
      message: 'Tentatives de connexion mises à jour avec succès',
      data: result
    });
  } catch (error) {
    logger.error('Erreur lors de la mise à jour des tentatives de connexion:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour des tentatives de connexion'
    });
  }
};