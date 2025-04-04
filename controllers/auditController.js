const auditService = require('../services/auditService');
const logger = require('../utils/loggers');

exports.getAllAudits = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    
    const audits = await auditService.getAudits({ page, limit });
    
    res.status(200).json({
      success: true,
      data: audits.items,
      pagination: audits.pagination
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
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 100;
  
  try {
    const audits = await auditService.getAudits({ 
      actionType: action_type, 
      page,
      limit 
    });
    
    res.status(200).json({
      success: true,
      data: audits.items,
      pagination: audits.pagination
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
  // Attention: dans le nouveau schéma, utilisateur est un nom et non un ID
  const { username } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 100;
  
  try {
    const audits = await auditService.getAudits({ 
      userId: username, // Nous utilisons userId car c'est ce qu'attend le service
      page,
      limit 
    });
    
    res.status(200).json({
      success: true,
      data: audits.items,
      pagination: audits.pagination
    });
  } catch (error) {
    logger.error(`Erreur lors de la récupération des audits de l'utilisateur ${username}:`, error);
    res.status(500).json({
      success: false,
      message: `Erreur lors de la récupération des audits de l'utilisateur`
    });
  }
};

exports.getAuditCounters = async (req, res) => {
  try {
    // Utiliser la méthode dédiée pour récupérer les compteurs
    const counters = await auditService.getAuditCounters();
    
    res.status(200).json({
      success: true,
      counts: {
        insert: counters.inserts || 0,
        update: counters.updates || 0,
        delete: counters.deletes || 0,
        total: counters.total || 0,
        unique_users: counters.unique_users || 0,
        unique_clients: counters.unique_clients || 0
      }
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des compteurs d\'audit:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des compteurs d\'audit'
    });
  }
};

exports.getAuditStats = async (req, res) => {
  try {
    const stats = await auditService.getAuditStats();
    
    res.status(200).json({
      success: true,
      stats
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des statistiques d\'audit:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques d\'audit'
    });
  }
};

exports.getRecentAudits = async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const page = parseInt(req.query.page) || 1;
  
  try {
    const audits = await auditService.getAudits({ page, limit });
    
    res.status(200).json({
      success: true,
      data: audits.items,
      pagination: audits.pagination
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
  const limit = parseInt(req.query.limit) || 100;
  const page = parseInt(req.query.page) || 1;
  
  try {
    // Validation des dates
    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Les dates de début et de fin sont requises'
      });
    }
    
    const audits = await auditService.getAudits({ 
      startDate: start_date, 
      endDate: end_date,
      page, 
      limit 
    });
    
    res.status(200).json({
      success: true,
      data: audits.items,
      pagination: audits.pagination
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
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 100;
  
  try {
    const audits = await auditService.getAudits({ 
      clientId: parseInt(clientId),
      page, 
      limit 
    });
    
    res.status(200).json({
      success: true,
      data: audits.items,
      pagination: audits.pagination
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
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 100;
  
  try {
    const audits = await auditService.getAudits({ 
      versementId: parseInt(versementId),
      page, 
      limit 
    });
    
    res.status(200).json({
      success: true,
      data: audits.items,
      pagination: audits.pagination
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