const Audit = require('../models/Audit');
const socketIO = require('../config/socket');
const logger = require('../utils/loggers');

const auditService = {
  /**
   * Crée une nouvelle entrée d'audit et notifie les clients via websocket
   * @param {Object} auditData - Les données d'audit à enregistrer
   * @returns {Object} - L'entrée d'audit créée
   */
  createAuditEntry: async (auditData) => {
    try {
      const auditEntry = await Audit.create(auditData);
      
      // Notifier les clients connectés via websocket
      if (socketIO.getIO()) {
        socketIO.getIO().emit('audit_event', {
          type: auditData.action_type,
          action: auditData.action,
          entityType: auditData.entity_type,
          timestamp: new Date(),
          data: auditEntry
        });
      }
      
      return auditEntry;
    } catch (error) {
      logger.error('Erreur lors de la création de l\'entrée d\'audit:', error);
      throw error;
    }
  },
  
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
        userId,
        clientId,
        entityType,
        entityId,
        action,
        actionType,
        versementId,
        startDate,
        endDate,
        limit = 50,
        page = 1
      } = options;
      
      let results;
      
      // Implémenter toutes les conditions de filtrage en utilisant les méthodes existantes du modèle
      if (startDate && endDate) {
        results = await Audit.getByDateRange(startDate, endDate, limit);
      } else if (userId) {
        results = await Audit.getByUser(userId, limit);
      } else if (clientId) {
        results = await Audit.getByClient(clientId, limit);
      } else if (versementId) {
        results = await Audit.getByVersement(versementId, limit);
      } else if (actionType) {
        results = await Audit.getByActionType(actionType, limit);
      } else if (action) {
        results = await Audit.getByAction(action, limit);
      } else if (entityType && entityId) {
        results = await Audit.getByEntity(entityType, entityId, limit);
      } else if (entityType) {
        results = await Audit.getByEntityType(entityType, limit);
      } else {
        // Cas par défaut - récupérer tous les audits récents
        results = await Audit.getAll(limit);
      }
      
      return {
        items: results,
        pagination: {
          page,
          limit,
          totalItems: results.length,
          hasMore: results.length === limit
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
   * Récupère l'historique des changements de solde d'un client
   * @param {number} clientId - ID du client
   * @param {number} limit - Nombre d'entrées à récupérer
   * @returns {Array} - Historique des changements de solde
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
}

};

module.exports = auditService;