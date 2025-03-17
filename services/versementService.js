const logger = require('../utils/loggers');
const Versement = require('../models/Versement');

/**
 * Récupère tous les versements
 */
const getAllVersements = async () => {
  try {
    const versements = await Versement.getAll();
    // Formater les données pour correspondre à l'attente du service
    return versements.map(v => ({
      id: v.id,
      numero_cheque: v.numero_cheque,
      amount: v.amount,
      date_creation: v.created_at,
      client_id: v.client_id,
      numero_compte: v.account_number,
      nom_client: v.name,
      description: v.description
    }));
  } catch (error) {
    logger.error('Erreur lors de la récupération des versements:', error);
    throw error;
  }
};

/**
 * Récupère un versement par son ID
 */
const getVersementById = async (id) => {
  try {
    const versement = await Versement.getById(id);
    if (!versement) return null;
    
    // Formater les données pour correspondre à l'attente du service
    return {
      id: versement.id,
      numero_cheque: versement.numero_cheque,
      amount: versement.amount,
      date_creation: versement.created_at,
      client_id: versement.client_id,
      numero_compte: versement.account_number,
      nom_client: versement.name,
      description: versement.description
    };
  } catch (error) {
    logger.error(`Erreur lors de la récupération du versement ${id}:`, error);
    throw error;
  }
};

/**
 * Crée un nouveau versement
 */
const createVersement = async (versementData, userId) => {
  const { client_id, numero_cheque, amount, description } = versementData;
  
  try {
    // Adapter les données pour le modèle Versement
    const versementModelData = {
      clientId: client_id,
      numero_cheque: numero_cheque,
      amount: amount,
      description: description,
      createdBy: userId
    };
    
    // Créer le versement en utilisant le modèle
    const newVersement = await Versement.create(versementModelData);
    
    // Retourner les données formatées
    return {
      id: newVersement.id,
      numero_cheque: newVersement.numero_cheque,
      amount: newVersement.amount,
      date_creation: newVersement.created_at,
      client_id: newVersement.client_id,
      description: newVersement.description
    };
  } catch (error) {
    logger.error('Erreur lors de la création du versement:', error);
    throw error;
  }
};

/**
 * Met à jour un versement
 */
const updateVersement = async (id, versementData, userId) => {
  const { numero_cheque, amount, description } = versementData;
  
  try {
    // Adapter les données pour le modèle Versement
    const versementModelData = {
      numero_cheque: numero_cheque,
      amount: amount,
      description: description
    };
    
    // Nettoyer les données null ou undefined
    Object.keys(versementModelData).forEach(key => {
      if (versementModelData[key] === undefined || versementModelData[key] === null) {
        delete versementModelData[key];
      }
    });
    
    // Mettre à jour le versement en utilisant le modèle
    const updatedVersement = await Versement.update(id, versementModelData, userId);
    
    // Retourner les données formatées
    return {
      id: updatedVersement.id,
      numero_cheque: updatedVersement.numero_cheque,
      amount: updatedVersement.amount,
      date_creation: updatedVersement.created_at,
      client_id: updatedVersement.client_id,
      description: updatedVersement.description
    };
  } catch (error) {
    logger.error(`Erreur lors de la mise à jour du versement ${id}:`, error);
    throw error;
  }
};

/**
 * Supprime un versement
 */
const deleteVersement = async (id, userId) => {
  try {
    // Supprimer le versement en utilisant le modèle
    const result = await Versement.delete(id, userId);
    
    return result;
  } catch (error) {
    logger.error(`Erreur lors de la suppression du versement ${id}:`, error);
    throw error;
  }
};

/**
 * Récupère les statistiques des versements
 */
const getVersementStats = async () => {
  try {
    // Récupérer tous les versements
    const versements = await Versement.getAll();
    
    // Calculer les statistiques
    const totalVersements = versements.length;
    const amountTotal = versements.reduce((sum, v) => sum + parseFloat(v.amount), 0);
    
    return {
      total_versements: totalVersements,
      amount_total: amountTotal
    };
  } catch (error) {
    logger.error('Erreur lors de la récupération des statistiques de versements:', error);
    throw error;
  }
};

/**
 * Récupère les versements dans une plage de dates
 */
const getVersementsByDateRange = async (startDate, endDate) => {
  try {
    const versements = await Versement.getByDateRange(startDate, endDate);
    return versements.map(v => ({
      id: v.id,
      numero_cheque: v.numero_cheque,
      amount: v.amount,
      date_creation: v.created_at,
      client_id: v.client_id,
      numero_compte: v.account_number,
      nom_client: v.name,
      description: v.description
    }));
  } catch (error) {
    logger.error('Erreur lors de la récupération des versements par plage de dates:', error);
    throw error;
  }
};

/**
 * Récupère les versements d'un client spécifique
 */
const getVersementsByClient = async (clientId) => {
  try {
    const versements = await Versement.getByClientId(clientId);
    return versements.map(v => ({
      id: v.id,
      numero_cheque: v.numero_cheque,
      amount: v.amount,
      date_creation: v.created_at,
      client_id: v.client_id,
      numero_compte: v.account_number,
      nom_client: v.name,
      description: v.description
    }));
  } catch (error) {
    logger.error(`Erreur lors de la récupération des versements du client ${clientId}:`, error);
    throw error;
  }
};

module.exports = {
  getAllVersements,
  getVersementById,
  createVersement,
  updateVersement,
  deleteVersement,
  getVersementStats,
  getVersementsByDateRange,
  getVersementsByClient
};