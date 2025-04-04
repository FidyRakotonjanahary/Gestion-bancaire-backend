const Client = require('../models/Client'); // Importation du modèle Client
const logger = require('../utils/loggers');
const Versement = require('../models/Versement');
const pool = require('../utils/db');

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

const getClientsWithBalance = async () => {
  try {
    return await Client.getAllWithBalance();
  } catch (error) {
    logger.error('Erreur lors de la récupération des clients avec solde:', error);
    throw error;
  }
};

const getClientCount = async () => {
  try {
    return await Client.getCount();
  } catch (error) {
    logger.error('Erreur lors du comptage des clients:', error);
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
const updateClientBalance = async (id, newBalance) => {
  try {
    return await Client.updateBalance(id, newBalance);
  } catch (error) {
    logger.error(`Erreur lors de la mise à jour du solde du client ${id}:`, error);
    throw error;
  }
};

/**
 * Supprime un client
 */
const deleteClient = async (id, userId) => {
  try {
    // Vérifie si userId est fourni
    if (!userId) {
      throw new Error('ID utilisateur requis pour la suppression du client');
    }

    // Récupérer le client pour vérifier s'il existe
    const client = await Client.getById(id);
    if (!client) {
      throw new Error(`Client avec ID ${id} non trouvé`);
    }
    
    // Supprimer le client en utilisant la méthode du modèle Client
    // Nous déléguons la gestion de la transaction à cette méthode
    const result = await Client.delete(id, userId);
    return result;
    
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
  getClientsWithBalance,
  getClientCount,
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