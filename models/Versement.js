const pool = require('../utils/db');
const Client = require('./Client');

class Versement {
  static async create(versementData) {
    const { clientId, numero_cheque, amount, description = null, status = 'en_attente', createdBy } = versementData;
    
    if (amount <= 0) {
      throw new Error('Le montant du versement doit être positif');
    }
    
    if (!['en_attente', 'validé', 'rejeté'].includes(status)) {
      throw new Error('Statut invalide. Utilisez: en_attente, validé, ou rejeté');
    }
    
    // Commencer une transaction
    const client = await pool.getClient();
    
    try {
      await client.query('BEGIN');
      
      // Créer le versement
      const versementQuery = `
        INSERT INTO versements (client_id, numero_cheque, amount, description, status, created_by, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, client_id, numero_cheque, amount, description, status, created_by, created_at
      `;
      
      const versementValues = [clientId, numero_cheque, amount, description, status, createdBy, new Date()];
      const versementResult = await client.query(versementQuery, versementValues);
      const newVersement = versementResult.rows[0];
      
      // Mettre à jour le solde du client si le statut est 'validé'
      if (status === 'validé') {
        const currentClient = await Client.getById(clientId);
        if (!currentClient) {
          throw new Error(`Client avec ID ${clientId} non trouvé`);
        }
        
        const oldBalance = parseFloat(currentClient.balance);
        const newBalance = oldBalance + parseFloat(amount);
        
        const updateBalanceQuery = `
          UPDATE clients
          SET balance = $1
          WHERE id = $2
          RETURNING id, balance
        `;
        
        const updateBalanceValues = [newBalance, clientId];
        const updatedClient = await client.query(updateBalanceQuery, updateBalanceValues);
        
        // Enregistrer l'action dans la table d'audit
        await this.logAudit(client, {
          userId: createdBy,
          action: 'CREATE',
          entityType: 'versement',
          entityId: newVersement.id,
          oldValues: null,
          newValues: newVersement,
          clientId: clientId,
          versementId: newVersement.id,
          oldBalance: oldBalance,
          newBalance: newBalance,
          actionType: 'creation_versement'
        });
      } else {
        // Enregistrer l'action dans la table d'audit sans mise à jour du solde
        await this.logAudit(client, {
          userId: createdBy,
          action: 'CREATE',
          entityType: 'versement',
          entityId: newVersement.id,
          oldValues: null,
          newValues: newVersement,
          clientId: clientId,
          versementId: newVersement.id,
          oldBalance: null,
          newBalance: null,
          actionType: 'creation_versement_en_attente'
        });
      }
      
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
      SELECT v.id, v.client_id, v.numero_cheque, v.amount, v.description, v.status, 
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
      SELECT v.id, v.client_id, v.numero_cheque, v.amount, v.description, v.status, 
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
      SELECT v.id, v.client_id, v.numero_cheque, v.amount, v.description, v.status, 
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
    const { numero_cheque, amount, description, clientId, status } = versementData;
    
    if (amount <= 0) {
      throw new Error('Le montant du versement doit être positif');
    }
    
    if (status && !['en_attente', 'validé', 'rejeté'].includes(status)) {
      throw new Error('Statut invalide. Utilisez: en_attente, validé, ou rejeté');
    }
    
    // Commencer une transaction
    const client = await pool.getClient();
    
    try {
      await client.query('BEGIN');
      
      // Obtenir l'ancien versement
      const oldVersementQuery = `
        SELECT id, client_id, numero_cheque, amount, description, status, created_by
        FROM versements
        WHERE id = $1
      `;
      
      const oldVersementResult = await client.query(oldVersementQuery, [id]);
      const oldVersement = oldVersementResult.rows[0];
      
      if (!oldVersement) {
        throw new Error(`Versement avec ID ${id} non trouvé`);
      }
      
      // Mettre à jour le versement
      const updateVersementQuery = `
        UPDATE versements
        SET numero_cheque = $1, amount = $2, description = $3, status = $4
        WHERE id = $5
        RETURNING id, client_id, numero_cheque, amount, description, status, created_by, updated_at
      `;
      
      const updateVersementValues = [
        numero_cheque || oldVersement.numero_cheque, 
        amount, 
        description !== undefined ? description : oldVersement.description, 
        status || oldVersement.status, 
        id
      ];
      
      const updateVersementResult = await client.query(updateVersementQuery, updateVersementValues);
      const updatedVersement = updateVersementResult.rows[0];
      
      // Mettre à jour le solde du client selon la formule et le statut
      const selectedClientId = clientId || oldVersement.client_id;
      const currentClient = await Client.getById(selectedClientId);
      
      if (!currentClient) {
        throw new Error(`Client avec ID ${selectedClientId} non trouvé`);
      }
      
      const oldAmount = parseFloat(oldVersement.amount);
      const newAmount = parseFloat(amount);
      const currentBalance = parseFloat(currentClient.balance);
      let newBalance = currentBalance;
      
      // Calculer le nouveau solde en fonction du changement de statut
      const oldStatus = oldVersement.status;
      const newStatus = status || oldStatus;
      
      // Cas où le statut passe de 'en_attente'/'rejeté' à 'validé'
      if ((oldStatus !== 'validé') && newStatus === 'validé') {
        newBalance += newAmount;
      }
      // Cas où le statut passe de 'validé' à 'en_attente'/'rejeté'
      else if (oldStatus === 'validé' && newStatus !== 'validé') {
        newBalance -= oldAmount;
      }
      // Cas où le statut reste 'validé' mais le montant change
      else if (oldStatus === 'validé' && newStatus === 'validé') {
        newBalance = currentBalance + newAmount - oldAmount;
      }
      
      const updateBalanceQuery = `
        UPDATE clients
        SET balance = $1
        WHERE id = $2
        RETURNING id, balance
      `;
      
      const updateBalanceValues = [newBalance, selectedClientId];
      const updatedClientResult = await client.query(updateBalanceQuery, updateBalanceValues);
      
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
        oldBalance: currentBalance,
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

  static async updateStatus(id, status, userId) {
    if (!['en_attente', 'validé', 'rejeté'].includes(status)) {
      throw new Error('Statut invalide. Utilisez: en_attente, validé, ou rejeté');
    }
    
    // Commencer une transaction
    const client = await pool.getClient();
    
    try {
      await client.query('BEGIN');
      
      // Obtenir le versement actuel
      const versementQuery = `
        SELECT id, client_id, numero_cheque, amount, description, status, created_by
        FROM versements
        WHERE id = $1
      `;
      
      const versementResult = await client.query(versementQuery, [id]);
      const versement = versementResult.rows[0];
      
      if (!versement) {
        throw new Error(`Versement avec ID ${id} non trouvé`);
      }
      
      // Si le statut est déjà celui demandé, retourner le versement sans changement
      if (versement.status === status) {
        await client.query('COMMIT');
        return versement;
      }
      
      // Mettre à jour le statut du versement
      const updateStatusQuery = `
        UPDATE versements
        SET status = $1
        WHERE id = $2
        RETURNING id, client_id, numero_cheque, amount, description, status, created_by, updated_at
      `;
      
      const updateResult = await client.query(updateStatusQuery, [status, id]);
      const updatedVersement = updateResult.rows[0];
      
      // Mettre à jour le solde du client en fonction du changement de statut
      const currentClient = await Client.getById(versement.client_id);
      
      if (!currentClient) {
        throw new Error(`Client avec ID ${versement.client_id} non trouvé`);
      }
      
      const amount = parseFloat(versement.amount);
      const currentBalance = parseFloat(currentClient.balance);
      let newBalance = currentBalance;
      
      // Cas où le statut passe à 'validé'
      if (status === 'validé' && versement.status !== 'validé') {
        newBalance += amount;
      }
      // Cas où le statut passe de 'validé' à autre chose
      else if (status !== 'validé' && versement.status === 'validé') {
        newBalance -= amount;
      }
      
      const updateBalanceQuery = `
        UPDATE clients
        SET balance = $1
        WHERE id = $2
        RETURNING id, balance
      `;
      
      const updateBalanceValues = [newBalance, versement.client_id];
      const updatedClientResult = await client.query(updateBalanceQuery, updateBalanceValues);
      
      // Enregistrer l'action dans la table d'audit
      await this.logAudit(client, {
        userId,
        action: 'UPDATE',
        entityType: 'versement',
        entityId: id,
        oldValues: { status: versement.status },
        newValues: { status },
        clientId: versement.client_id,
        versementId: id,
        oldBalance: currentBalance,
        newBalance: newBalance,
        actionType: 'changement_statut_versement'
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
        SELECT id, client_id, numero_cheque, amount, description, status, created_by
        FROM versements
        WHERE id = $1
      `;
      
      const versementResult = await client.query(versementQuery, [id]);
      const versement = versementResult.rows[0];
      
      if (!versement) {
        throw new Error(`Versement avec ID ${id} non trouvé`);
      }
      
      // Obtenir le solde actuel du client
      const currentClient = await Client.getById(versement.client_id);
      if (!currentClient) {
        throw new Error(`Client avec ID ${versement.client_id} non trouvé`);
      }
      
      const currentBalance = parseFloat(currentClient.balance);
      let newBalance = currentBalance;
      
      // Mettre à jour le solde du client uniquement si le versement était validé
      if (versement.status === 'validé') {
        const amount = parseFloat(versement.amount);
        newBalance = currentBalance - amount;
        
        const updateBalanceQuery = `
          UPDATE clients
          SET balance = $1
          WHERE id = $2
          RETURNING id, balance
        `;
        
        const updateBalanceValues = [newBalance, versement.client_id];
        await client.query(updateBalanceQuery, updateBalanceValues);
      }
      
      // Enregistrer l'action dans la table d'audit avant de supprimer
      await this.logAudit(client, {
        userId,
        action: 'DELETE',
        entityType: 'versement',
        entityId: id,
        oldValues: versement,
        newValues: null,
        clientId: versement.client_id,
        versementId: id,
        oldBalance: currentBalance,
        newBalance: newBalance,
        actionType: 'suppression_versement'
      });
      
      // Supprimer le versement
      const deleteQuery = `
        DELETE FROM versements
        WHERE id = $1
        RETURNING id
      `;
      
      const deleteResult = await client.query(deleteQuery, [id]);
      
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
}

module.exports = Versement;