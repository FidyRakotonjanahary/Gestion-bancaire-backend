const clientService = require('../services/clientService');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/loggers');

exports.createClient = async (req, res) => {
  const { name } = req.body;
  
  // Vérification que le nom n'est pas vide
  if (!name) {
    return res.status(400).json({
      success: false,
      message: 'Le nom du client est requis'
    });
  }
  
  try {
    // Générer un numéro de compte unique
    const account_number = 'ACC-' + uuidv4().substring(0, 8).toUpperCase();
    
    // Utiliser le service client
    const client = await clientService.createClient({
      account_number,
      name
    });
    
    res.status(201).json({
      success: true,
      message: 'Client créé avec succès',
      data: client
    });
  } catch (error) {
    logger.error('Erreur lors de la création du client:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du client'
    });
  }
};

exports.getAllClients = async (req, res) => {
  try {
    // Utiliser le service client
    const clients = await clientService.getAllClients();
    
    res.status(200).json({
      success: true,
      data: clients
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des clients:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des clients'
    });
  }
};

exports.getClientById = async (req, res) => {
  const { id } = req.params;
  
  try {
    // Utiliser le service client
    const client = await clientService.getClientById(id);
    
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client non trouvé'
      });
    }
    
    res.status(200).json({
      success: true,
      data: client
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération du client:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du client'
    });
  }
};

exports.updateClient = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  
  if (!name) {
    return res.status(400).json({
      success: false,
      message: 'Le nom du client est requis'
    });
  }
  
  try {
    // Vérifier si le client existe
    const existingClient = await clientService.getClientById(id);
    
    if (!existingClient) {
      return res.status(404).json({
        success: false,
        message: 'Client non trouvé'
      });
    }
    
    // Utiliser le service client
    const client = await clientService.updateClient(id, {
      name,
      account_number: existingClient.account_number
    });
    
    res.status(200).json({
      success: true,
      message: 'Client mis à jour avec succès',
      data: client
    });
  } catch (error) {
    logger.error('Erreur lors de la mise à jour du client:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du client'
    });
  }
};

exports.deleteClient = async (req, res) => {
  const { id } = req.params;
  
  try {
    // Vérifier si le client existe
    const client = await clientService.getClientById(id);
    
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client non trouvé'
      });
    }
    
    // Utiliser le service client pour supprimer
    await clientService.deleteClient(id);
    
    res.status(200).json({
      success: true,
      message: 'Client supprimé avec succès',
      data: client
    });
  } catch (error) {
    logger.error('Erreur lors de la suppression du client:', error);
    
    // Gérer l'erreur spécifique de client avec versements
    if (error.message && error.message.includes('client avec des versements')) {
      return res.status(400).json({
        success: false,
        message: 'Impossible de supprimer un client avec des versements associés'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du client'
    });
  }
};

exports.getClientByAccountNumber = async (req, res) => {
  const { account_number } = req.params;
  
  try {
    // Utiliser le service client
    const client = await clientService.getClientByAccountNumber(account_number);
    
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client non trouvé'
      });
    }
    
    res.status(200).json({
      success: true,
      data: client
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération du client:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du client'
    });
  }
};

exports.getClientVersements = async (req, res) => {
  const { id } = req.params;
  
  try {
    // Vérifier si le client existe
    const client = await clientService.getClientById(id);
    
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client non trouvé'
      });
    }
    
    // Utiliser le service client
    const transactions = await clientService.getClientTransactions(id);
    
    res.status(200).json({
      success: true,
      data: transactions
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des versements du client:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des versements du client'
    });
  }
};

exports.searchClients = async (req, res) => {
  const { term } = req.query;
  
  try {
    // Cette fonctionnalité n'existe pas dans le service client
    // Nous utilisons directement la requête SQL
    const db = require('../utils/db');
    const result = await db.query(
      `SELECT id, account_number, name, balance, created_at, updated_at 
       FROM clients 
       WHERE name ILIKE $1 OR account_number ILIKE $1
       ORDER BY name`,
      [`%${term}%`]
    );
    
    res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    logger.error('Erreur lors de la recherche des clients:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la recherche des clients'
    });
  }
};

exports.getClientCount = async (req, res) => {
  try {
    // Cette fonctionnalité n'existe pas dans le service client
    const db = require('../utils/db');
    const result = await db.query('SELECT COUNT(*) FROM clients');
    
    res.status(200).json({
      success: true,
      count: parseInt(result.rows[0].count)
    });
  } catch (error) {
    logger.error('Erreur lors du comptage des clients:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du comptage des clients'
    });
  }
};

exports.getClientsWithBalance = async (req, res) => {
  try {
    // Cette fonctionnalité n'existe pas dans le service client
    const db = require('../utils/db');
    const result = await db.query(
      `SELECT id, account_number, name, balance, created_at, updated_at 
       FROM clients 
       WHERE balance > 0 
       ORDER BY balance DESC`
    );
    
    res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des clients avec solde:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des clients avec solde'
    });
  }
};

exports.getClientBalanceHistory = async (req, res) => {
  const { id } = req.params;
  
  try {
    // Vérifier si le client existe
    const client = await clientService.getClientById(id);
    
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client non trouvé'
      });
    }
    
    // Utiliser le service client
    const auditTrail = await clientService.getAuditTrail(id);
    
    res.status(200).json({
      success: true,
      data: auditTrail
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération de l\'historique du solde:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'historique du solde'
    });
  }
};

exports.getClientBalance = async (req, res) => {
  const { id } = req.params;
  
  try {
    // Utiliser le service client
    const balance = await clientService.getClientBalance(id);
    
    if (balance === null) {
      return res.status(404).json({
        success: false,
        message: 'Client non trouvé'
      });
    }
    
    res.status(200).json({
      success: true,
      balance: balance
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération du solde:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du solde'
    });
  }
};

module.exports = exports;