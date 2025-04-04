const Audit = require('../models/Audit');
const socketIO = require('../config/socket');
const logger = require('../utils/loggers');

const auditService = {
  
  /**
   * Récupère un audit par son ID
   * @param {number} id - ID de l'audit à récupérer
   * @returns {Object} - L'entrée d'audit récupérée
   */
  getAuditById: async (id) => {
    try {
      return await Audit.getById(id);
    } catch (error) {
      logger.error(`Erreur lors de la récupération de l'audit ID ${id}:`, error);
      throw error;
    }
  },
  
  /**
   * Récupère les audits avec pagination et filtrage avancé
   * @param {Object} options - Options de filtrage et pagination
   * @returns {Object} - Résultat paginé des audits
   */
  getAudits: async (options = {}) => {
    try {
      const {
        userId, // Ceci sera maintenant un nom d'utilisateur (username) et non un ID
        clientId,
        entityType, // Non utilisé dans la nouvelle structure
        entityId,   // Non utilisé dans la nouvelle structure
        action,
        actionType,
        versementId,
        startDate,
        endDate,
        limit = 50,
        page = 1
      } = options;
      
      let results;
      
      // Adapter le filtrage à la nouvelle structure
      if (startDate && endDate) {
        results = await Audit.getByDateRange(startDate, endDate, limit);
      } else if (userId) {
        // Nous utilisons userId comme nom d'utilisateur dans le nouveau schéma
        results = await Audit.getByUser(userId, limit);
      } else if (clientId) {
        results = await Audit.getByClient(clientId, limit);
      } else if (entityType && entityId) {
        // Cette fonctionnalité n'est plus supportée dans la nouvelle structure
        results = [];
      } else if (entityType) {
        // Cette fonctionnalité n'est plus supportée dans la nouvelle structure
        results = [];
      } else if (versementId) {
        results = await Audit.getByVersement(versementId, limit);
      } else if (action) {
        // Dans notre schéma action = action_type
        results = await Audit.getByActionType(action, limit);
      } else if (actionType) {
        results = await Audit.getByActionType(actionType, limit);
      } else {
        // Cas par défaut - récupérer tous les audits récents
        results = await Audit.getAll(limit);
      }
      
      // Pagination simple - à améliorer avec une vraie pagination côté base de données
      const offset = (page - 1) * limit;
      const paginatedResults = results.slice(offset, offset + limit);
      
      return {
        items: paginatedResults,
        pagination: {
          page,
          limit,
          totalItems: results.length,
          hasMore: offset + paginatedResults.length < results.length
        }
      };
    } catch (error) {
      logger.error('Erreur lors de la récupération des audits:', error);
      throw error;
    }
  },
  
  /**
   * Récupère les statistiques des audits
   * @returns {Object} - Statistiques des audits
   */
  getAuditStats: async () => {
    try {
      return await Audit.getStats();
    } catch (error) {
      logger.error('Erreur lors de la récupération des statistiques d\'audit:', error);
      throw error;
    }
  },
  
  /**
   * Récupère l'historique des changements de montant d'un client
   * @param {number} clientId - ID du client
   * @param {number} limit - Nombre d'entrées à récupérer
   * @returns {Array} - Historique des changements de montant
   */
  getClientBalanceHistory: async (clientId, limit = 50) => {
    try {
      return await Audit.getBalanceChanges(clientId, limit);
    } catch (error) {
      logger.error(`Erreur lors de la récupération de l'historique de solde du client ${clientId}:`, error);
      throw error;
    }
  },

  /**
   * Récupère les audits dans une plage de dates
   * @param {Date|string} startDate - Date de début
   * @param {Date|string} endDate - Date de fin
   * @param {number} limit - Nombre d'entrées à récupérer
   * @returns {Array} - Audits dans la plage de dates
   */
  getAuditsByDateRange: async (startDate, endDate, limit = 50) => {
    try {
      return await Audit.getByDateRange(startDate, endDate, limit);
    } catch (error) {
      logger.error(`Erreur lors de la récupération des audits entre ${startDate} et ${endDate}:`, error);
      throw error;
    }
  },
  
  /**
   * Récupère les compteurs d'audit
   * @returns {Object} - Compteurs d'audit (total, utilisateurs uniques, etc.)
   */
  getAuditCounters: async () => {
    try {
      return await Audit.getCounters();
    } catch (error) {
      logger.error('Erreur lors de la récupération des compteurs d\'audit:', error);
      throw error;
    }
  }
};

module.exports = auditService;