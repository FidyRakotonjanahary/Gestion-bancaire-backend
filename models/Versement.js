const pool = require('../utils/db');
const Client = require('./Client');

class Versement {
  static async create(versementData) {
    const { clientId, numero_cheque, amount, description = null, createdBy } = versementData;
    // Supprimez status des paramètres
    
    if (amount <= 0) {
      throw new Error('Le amount du versement doit être positif');
    }
    
    // Supprimez la validation du statut
    
    // Commencer une transaction
    const client = await pool.getClient();
    
    try {
      await client.query('BEGIN');
      
      // Créer le versement (avec un statut fixe ou en supprimant complètement le champ)
      const versementQuery = `
        INSERT INTO versements (client_id, numero_cheque, amount, description, created_by, created_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, client_id, numero_cheque, amount, description, created_by, created_at
      `;
      
      const versementValues = [clientId, numero_cheque, amount, description, createdBy, new Date()];
      const versementResult = await client.query(versementQuery, versementValues);
      const newVersement = versementResult.rows[0];
      
      // Obtenir le solde du client pour l'audit
      const currentClient = await Client.getById(clientId);
      if (!currentClient) {
        throw new Error(`Client avec ID ${clientId} non trouvé`);
      }
      
      // Modifier l'audit pour qu'il n'utilise plus le statut
      await this.logAudit(client, {
        userId: createdBy,
        action: 'CREATE',
        entityType: 'versement',
        entityId: newVersement.id,
        oldValues: null,
        newValues: newVersement,
        clientId: clientId,
        versementId: newVersement.id,
        oldBalance: parseFloat(currentClient.balance) - parseFloat(amount),
        newBalance: parseFloat(currentClient.balance),
        actionType: 'creation_versement'
      });
      
      await client.query('COMMIT');
      return newVersement;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async getById(id) {
    const query = `
      SELECT v.id, v.client_id, v.numero_cheque, v.amount, v.description, 
             v.created_by, v.created_at, v.updated_at,
             c.name as name, c.account_number
      FROM versements v
      JOIN clients c ON v.client_id = c.id
      WHERE v.id = $1
    `;
    
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async getAll() {
    const query = `
      SELECT v.id, v.client_id, v.numero_cheque, v.amount, v.description, 
             v.created_by, v.created_at, v.updated_at,
             c.name as name, c.account_number
      FROM versements v
      JOIN clients c ON v.client_id = c.id
      ORDER BY v.created_at DESC
    `;
    
    const result = await pool.query(query);
    return result.rows;
  }

  static async getByClientId(clientId) {
    const query = `
      SELECT v.id, v.client_id, v.numero_cheque, v.amount, v.description, 
             v.created_by, v.created_at, v.updated_at,
             c.name as name, c.account_number
      FROM versements v
      JOIN clients c ON v.client_id = c.id
      WHERE v.client_id = $1
      ORDER BY v.created_at DESC
    `;
    
    const result = await pool.query(query, [clientId]);
    return result.rows;
  }

  static async update(id, versementData, userId) {
    const { numero_cheque, amount, description, clientId } = versementData;
    // Supprimez status des paramètres
    
    if (amount !== undefined && parseFloat(amount) <= 0) {
      throw new Error('Le amount du versement doit être positif');
    }
    
    // Commencer une transaction
    const client = await pool.getClient();
    
    try {
      await client.query('BEGIN');
      
      // Obtenir l'ancien versement
      const oldVersementQuery = `
        SELECT id, client_id, numero_cheque, amount, description, created_by
        FROM versements
        WHERE id = $1
      `;
      
      const oldVersementResult = await client.query(oldVersementQuery, [id]);
      const oldVersement = oldVersementResult.rows[0];
      
      if (!oldVersement) {
        throw new Error(`Versement avec ID ${id} non trouvé`);
      }
  
      // Obtenir le solde actuel du client avant modification
      const selectedClientId = clientId || oldVersement.client_id;
      const currentClient = await Client.getById(selectedClientId);
      if (!currentClient) {
        throw new Error(`Client avec ID ${selectedClientId} non trouvé`);
      }
      const oldBalance = parseFloat(currentClient.balance);
      
      // Mettre à jour le versement sans le statut
      const updateVersementQuery = `
        UPDATE versements
        SET numero_cheque = $1, amount = $2, description = $3
        WHERE id = $4
        RETURNING id, client_id, numero_cheque, amount, description, created_by, updated_at
      `;
      
      const updateVersementValues = [
        numero_cheque || oldVersement.numero_cheque, 
        amount, 
        description !== undefined ? description : oldVersement.description,
        id
      ];
      
      const updateVersementResult = await client.query(updateVersementQuery, updateVersementValues);
      const updatedVersement = updateVersementResult.rows[0];
      
      // Récupérer le solde mis à jour par le trigger
      const updatedClient = await Client.getById(selectedClientId);
      const newBalance = parseFloat(updatedClient.balance);
      
      // Enregistrer l'action dans la table d'audit
      await this.logAudit(client, {
        userId,
        action: 'UPDATE',
        entityType: 'versement',
        entityId: id,
        oldValues: oldVersement,
        newValues: updatedVersement,
        clientId: selectedClientId,
        versementId: id,
        oldBalance: oldBalance,
        newBalance: newBalance,
        actionType: 'modification_versement'
      });
      
      await client.query('COMMIT');
      return updatedVersement;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async delete(id, userId) {
    // Commencer une transaction
    const client = await pool.getClient();
    
    try {
      await client.query('BEGIN');
      
      // Obtenir le versement à supprimer
      const versementQuery = `
        SELECT id, client_id, numero_cheque, amount, description, created_by
        FROM versements
        WHERE id = $1
      `;
      
      const versementResult = await client.query(versementQuery, [id]);
      const versement = versementResult.rows[0];
      
      if (!versement) {
        throw new Error(`Versement avec ID ${id} non trouvé`);
      }
      
      // Obtenir le solde actuel du client avant suppression
      const currentClient = await Client.getById(versement.client_id);
      if (!currentClient) {
        throw new Error(`Client avec ID ${versement.client_id} non trouvé`);
      }
      const oldBalance = parseFloat(currentClient.balance);
      
      // Supprimer le versement
      const deleteQuery = `
        DELETE FROM versements
        WHERE id = $1
        RETURNING id
      `;
      
      const deleteResult = await client.query(deleteQuery, [id]);
      
      // Récupérer le solde mis à jour par le trigger
      const updatedClient = await Client.getById(versement.client_id);
      const newBalance = parseFloat(updatedClient.balance);
      
      // Enregistrer l'action dans la table d'audit
      await this.logAudit(client, {
        userId,
        action: 'DELETE',
        entityType: 'versement',
        entityId: id,
        oldValues: versement,
        newValues: null,
        clientId: versement.client_id,
        versementId: id,
        oldBalance: oldBalance,
        newBalance: newBalance,
        actionType: 'suppression_versement'
      });
      
      await client.query('COMMIT');
      return deleteResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  // Méthode utilitaire pour enregistrer les actions d'audit
  static async logAudit(dbClient, auditData) {
    const { 
      userId, action, entityType, entityId, oldValues, newValues,
      clientId, versementId, oldBalance, newBalance, actionType 
    } = auditData;
    
    const query = `
      INSERT INTO audit_versement (
        user_id, action, entity_type, entity_id, old_values, new_values,
        client_id, versement_id, old_balance, new_balance, action_type
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id
    `;
    
    const values = [
      userId, action, entityType, entityId, 
      oldValues ? JSON.stringify(oldValues) : null,
      newValues ? JSON.stringify(newValues) : null,
      clientId, versementId, oldBalance, newBalance, actionType
    ];
    
    return dbClient.query(query, values);
  }

  // Méthode à ajouter au modèle Versement
static async getByDateRange(startDate, endDate) {
  const query = `
    SELECT v.id, v.client_id, v.numero_cheque, v.amount, v.description, 
           v.created_by, v.created_at, v.updated_at,
           c.name as name, c.account_number
    FROM versements v
    JOIN clients c ON v.client_id = c.id
    WHERE v.created_at BETWEEN $1 AND $2
    ORDER BY v.created_at DESC
  `;
  
  const result = await pool.query(query, [startDate, endDate]);
  return result.rows;
}
}

module.exports = Versement;