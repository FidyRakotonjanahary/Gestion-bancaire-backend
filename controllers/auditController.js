const auditService = require('../services/auditService');
const logger = require('../utils/loggers');

exports.getAllAudits = async (req, res) => {
  try {
    const audits = await auditService.getAudits({ limit: 100 });
    
    res.status(200).json({
      success: true,
      data: audits.items
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des audits:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des audits'
    });
  }
};

exports.getAuditsByActionType = async (req, res) => {
  const { action_type } = req.params;
  
  try {
    const audits = await auditService.getAudits({ actionType: action_type, limit: 100 });
    
    res.status(200).json({
      success: true,
      data: audits.items
    });
  } catch (error) {
    logger.error(`Erreur lors de la récupération des audits de type ${action_type}:`, error);
    res.status(500).json({
      success: false,
      message: `Erreur lors de la récupération des audits de type ${action_type}`
    });
  }
};

exports.getAuditsByUser = async (req, res) => {
  const { user_id } = req.params;
  
  try {
    const audits = await auditService.getAudits({ userId: user_id, limit: 100 });
    
    res.status(200).json({
      success: true,
      data: audits.items
    });
  } catch (error) {
    logger.error(`Erreur lors de la récupération des audits de l'utilisateur ${user_id}:`, error);
    res.status(500).json({
      success: false,
      message: `Erreur lors de la récupération des audits de l'utilisateur`
    });
  }
};

exports.getAuditCounters = async (req, res) => {
  try {
    const stats = await auditService.getAuditStats();
    
    // Formater les statistiques pour correspondre à la structure attendue
    const counts = {
      insert: stats.action_types['INSERT'] || 0,
      update: stats.action_types['UPDATE'] || 0,
      delete: stats.action_types['DELETE'] || 0,
      total: stats.total || 0
    };
    
    res.status(200).json({
      success: true,
      counts
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des compteurs d\'audit:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des compteurs d\'audit'
    });
  }
};

exports.getRecentAudits = async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  
  try {
    const audits = await auditService.getAudits({ limit });
    
    res.status(200).json({
      success: true,
      data: audits.items
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des audits récents:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des audits récents'
    });
  }
};

exports.getAuditsByDateRange = async (req, res) => {
  const { start_date, end_date } = req.query;
  
  try {
    // Note: Le service auditService n'a pas de méthode spécifique pour le filtrage par date
    // Pour une implémentation complète, il faudrait ajouter cette fonctionnalité
    // Cette version utilise getAll() et filtrera côté serveur
    const allAudits = await auditService.getAudits({ limit: 1000 });
    
    // Filtrer par date
    const filteredAudits = allAudits.items.filter(audit => {
      const auditDate = new Date(audit.created_at);
      return auditDate >= new Date(start_date) && auditDate <= new Date(end_date);
    });
    
    res.status(200).json({
      success: true,
      data: filteredAudits
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des audits par plage de dates:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des audits par plage de dates'
    });
  }
};

exports.getAuditEntriesByClient = async (req, res) => {
  const { clientId } = req.params;
  
  try {
    const audits = await auditService.getAudits({ clientId: parseInt(clientId), limit: 100 });
    
    res.status(200).json({
      success: true,
      data: audits.items
    });
  } catch (error) {
    logger.error(`Erreur lors de la récupération des audits du client ${clientId}:`, error);
    res.status(500).json({
      success: false,
      message: `Erreur lors de la récupération des audits du client`
    });
  }
};

exports.getAuditEntriesByVersement = async (req, res) => {
  const { versementId } = req.params;
  
  try {
    const audits = await auditService.getAudits({ versementId: parseInt(versementId), limit: 100 });
    
    res.status(200).json({
      success: true,
      data: audits.items
    });
  } catch (error) {
    logger.error(`Erreur lors de la récupération des audits du versement ${versementId}:`, error);
    res.status(500).json({
      success: false,
      message: `Erreur lors de la récupération des audits du versement`
    });
  }
};

exports.getAuditById = async (req, res) => {
  const { id } = req.params;
  
  try {
    const audit = await auditService.getAuditById(parseInt(id));
    
    if (!audit) {
      return res.status(404).json({
        success: false,
        message: 'Audit non trouvé'
      });
    }
    
    res.status(200).json({
      success: true,
      data: audit
    });
  } catch (error) {
    logger.error(`Erreur lors de la récupération de l'audit ${id}:`, error);
    res.status(500).json({
      success: false,
      message: `Erreur lors de la récupération de l'audit`
    });
  }
};

exports.getClientBalanceHistory = async (req, res) => {
  const { clientId } = req.params;
  const limit = parseInt(req.query.limit) || 50;
  
  try {
    const history = await auditService.getClientBalanceHistory(parseInt(clientId), limit);
    
    res.status(200).json({
      success: true,
      data: history
    });
  } catch (error) {
    logger.error(`Erreur lors de la récupération de l'historique de solde du client ${clientId}:`, error);
    res.status(500).json({
      success: false,
      message: `Erreur lors de la récupération de l'historique de solde du client`
    });
  }
};

module.exports = exports;