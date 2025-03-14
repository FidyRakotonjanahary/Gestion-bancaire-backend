const Client = require('../models/Client'); // Importation du modèle Client
const logger = require('../utils/loggers');

/**
 * Récupère tous les clients
 */
const getAllClients = async () => {
  try {
    return await Client.getAll();
  } catch (error) {
    logger.error('Erreur lors de la récupération des clients:', error);
    throw error;
  }
};

/**
 * Récupère un client par son ID
 */
const getClientById = async (id) => {
  try {
    return await Client.getById(id);
  } catch (error) {
    logger.error(`Erreur lors de la récupération du client ${id}:`, error);
    throw error;
  }
};

/**
 * Récupère un client par son numéro de compte
 */
const getClientByAccountNumber = async (accountNumber) => {
  try {
    return await Client.getByAccountNumber(accountNumber);
  } catch (error) {
    logger.error(`Erreur lors de la récupération du client avec le numéro de compte ${accountNumber}:`, error);
    throw error;
  }
};

/**
 * Crée un nouveau client
 */
const createClient = async (clientData) => {
  try {
    return await Client.create(clientData);
  } catch (error) {
    logger.error('Erreur lors de la création du client:', error);
    throw error;
  }
};

/**
 * Met à jour un client
 */
const updateClient = async (id, clientData) => {
  try {
    return await Client.update(id, clientData);
  } catch (error) {
    logger.error(`Erreur lors de la mise à jour du client ${id}:`, error);
    throw error;
  }
};

/**
 * Met à jour le solde d'un client
 */
const updateClientBalance = async (id, newBalance, userId, action, transactionId = null) => {
  try {
    return await Client.updateBalance(id, newBalance, userId, action, transactionId);
  } catch (error) {
    logger.error(`Erreur lors de la mise à jour du solde du client ${id}:`, error);
    throw error;
  }
};

/**
 * Supprime un client
 */
const deleteClient = async (id) => {
  try {
    // Vérification si le client a des versements avant de le supprimer
    const transactions = await Client.getClientTransactions(id);
    if (transactions && transactions.length > 0) {
      throw new Error('Impossible de supprimer un client avec des versements existants');
    }
    
    return await Client.delete(id);
  } catch (error) {
    logger.error(`Erreur lors de la suppression du client ${id}:`, error);
    throw error;
  }
};

/**
 * Récupère le solde d'un client
 */
const getClientBalance = async (id) => {
  try {
    return await Client.getClientBalance(id);
  } catch (error) {
    logger.error(`Erreur lors de la récupération du solde du client ${id}:`, error);
    throw error;
  }
};

/**
 * Récupère les transactions d'un client
 */
const getClientTransactions = async (id) => {
  try {
    return await Client.getClientTransactions(id);
  } catch (error) {
    logger.error(`Erreur lors de la récupération des transactions du client ${id}:`, error);
    throw error;
  }
};

/**
 * Récupère l'historique d'audit d'un client
 */
const getAuditTrail = async (id) => {
  try {
    return await Client.getAuditTrail(id);
  } catch (error) {
    logger.error(`Erreur lors de la récupération de l'audit du client ${id}:`, error);
    throw error;
  }
};

module.exports = {
  getAllClients,
  getClientById,
  getClientByAccountNumber,
  createClient,
  updateClient,
  updateClientBalance,
  deleteClient,
  getClientBalance,
  getClientTransactions,
  getAuditTrail
};