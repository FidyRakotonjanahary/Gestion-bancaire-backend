const pool = require('../utils/db');
const Client = require('./Client');

class Versement {
  static async create(versementData) {
    const { clientId, numero_cheque, amount, description = null, createdBy } = versementData;
    
    if (amount <= 0) {
      throw new Error('Le montant du versement doit être positif');
    }
    
    // Le trigger update_client_balance_on_insert mettra à jour automatiquement le solde du client
    const query = `
      INSERT INTO versements (client_id, numero_cheque, amount, description, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, client_id, numero_cheque, amount, description, created_by, created_at
    `;
    
    const values = [clientId, numero_cheque, amount, description, createdBy];
    
    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Erreur lors de la création du versement: ${error.message}`);
    }
  }

  static async getById(id) {
    const query = `
      SELECT v.id, v.client_id, v.numero_cheque, v.amount, v.description, 
             v.created_by, v.created_at, v.updated_at,
             c.name as client_name, c.account_number
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
             c.name as client_name, c.account_number,
             u.username as created_by_username
      FROM versements v
      JOIN clients c ON v.client_id = c.id
      LEFT JOIN users u ON v.created_by = u.id
      ORDER BY v.created_at DESC
    `;
    
    const result = await pool.query(query);
    return result.rows;
  }

  static async getByClientId(clientId) {
    const query = `
      SELECT v.id, v.client_id, v.numero_cheque, v.amount, v.description, 
             v.created_by, v.created_at, v.updated_at,
             c.name as client_name, c.account_number,
             u.username as created_by_username
      FROM versements v
      JOIN clients c ON v.client_id = c.id
      LEFT JOIN users u ON v.created_by = u.id
      WHERE v.client_id = $1
      ORDER BY v.created_at DESC
    `;
    
    const result = await pool.query(query, [clientId]);
    return result.rows;
  }

  static async update(id, versementData) {
    const { numero_cheque, amount, description } = versementData;
    
    if (amount !== undefined && parseFloat(amount) <= 0) {
      throw new Error('Le montant du versement doit être positif');
    }
    
    // Obtenir l'ancien versement pour pouvoir construire la requête de mise à jour
    const oldVersementQuery = `
      SELECT numero_cheque, amount, description
      FROM versements
      WHERE id = $1
    `;
    
    const oldVersementResult = await pool.query(oldVersementQuery, [id]);
    const oldVersement = oldVersementResult.rows[0];
    
    if (!oldVersement) {
      throw new Error(`Versement avec ID ${id} non trouvé`);
    }
    
    // Le trigger update_client_balance_on_update mettra à jour automatiquement le solde du client
    const updateQuery = `
      UPDATE versements
      SET numero_cheque = $1, 
          amount = $2, 
          description = $3
      WHERE id = $4
      RETURNING id, client_id, numero_cheque, amount, description, created_by, updated_at
    `;
    
    const updateValues = [
      numero_cheque || oldVersement.numero_cheque, 
      amount !== undefined ? amount : oldVersement.amount,
      description !== undefined ? description : oldVersement.description,
      id
    ];
    
    try {
      const result = await pool.query(updateQuery, updateValues);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Erreur lors de la mise à jour du versement: ${error.message}`);
    }
  }

/**
 * The function `delete` deletes a record from the `versements` table based on the provided `id` while
 * ensuring the `userId` is set as the current user.
 * @param id - The `id` parameter in the `delete` method is used to specify the ID of the versement
 * (payment) that you want to delete from the database.
 * @param userId - The `userId` parameter in the `delete` method is used to specify the user ID
 * associated with the deletion operation. It is used to set the current user ID for the session in the
 * database connection before executing the delete query. This helps ensure that the deletion operation
 * is performed with the correct user context
 * @returns The `delete` method is returning the ID of the deleted versement (payment) if the deletion
 * is successful.
 */
static async delete(id, userId) {
  const client = await pool.getClient();
  
  try {
    await client.query('BEGIN');
    
    // D'abord, récupérer et stocker les informations du client associé au versement
    const clientInfoQuery = `
      SELECT c.account_number, c.name, v.client_id
      FROM versements v
      JOIN clients c ON v.client_id = c.id
      WHERE v.id = $1
    `;
    
    const clientInfo = await client.query(clientInfoQuery, [id]);
    
    if (clientInfo.rows.length === 0) {
      throw new Error(`Versement avec ID ${id} non trouvé`);
    }
    
    const { account_number, name, client_id } = clientInfo.rows[0];
    
    // Stocker les informations dans des variables de session
    await client.query(`SET LOCAL session.current_user_id = ${parseInt(userId)}`);
    await client.query(`SET LOCAL session.client_account_number = '${account_number}'`);
    await client.query(`SET LOCAL session.client_name = '${name}'`);
    await client.query(`SET LOCAL session.client_id = ${client_id}`);
    
    // Ensuite, supprimer le versement
    const deleteQuery = `
      DELETE FROM versements
      WHERE id = $1
      RETURNING id
    `;
    
    const result = await client.query(deleteQuery, [id]);
    
    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Supprime un versement en utilisant une connexion client existante
 * @param {number} id - ID du versement à supprimer
 * @param {object} client - Client de connexion à la base de données
 * @returns {object} - Résultat de la suppression
 */
static async deleteWithClient(id, client) {
  try {
    // Supprimer le versement
    const deleteQuery = `
      DELETE FROM versements
      WHERE id = $1
      RETURNING id
    `;
    
    const result = await client.query(deleteQuery, [id]);
    
    if (result.rows.length === 0) {
      throw new Error(`Versement avec ID ${id} non trouvé`);
    }
    
    return result.rows[0];
  } catch (error) {
    throw error;
  }
}
  static async getByDateRange(startDate, endDate) {
    const query = `
      SELECT v.id, v.client_id, v.numero_cheque, v.amount, v.description, 
             v.created_by, v.created_at, v.updated_at,
             c.name as client_name, c.account_number,
             u.username as created_by_username
      FROM versements v
      JOIN clients c ON v.client_id = c.id
      LEFT JOIN users u ON v.created_by = u.id
      WHERE v.created_at >= $1 AND v.created_at < ($2::date + INTERVAL '1 day')
      ORDER BY v.created_at DESC
    `;
    
    const result = await pool.query(query, [startDate, endDate]);
    return result.rows;
  }
  
  static async getAuditTrail(id) {
    const query = `
      SELECT 
        id, 
        action_type, 
        date_operation, 
        numero_versement, 
        numero_compte, 
        nom_client, 
        montant_ancien, 
        montant_nouveau, 
        utilisateur
      FROM audit_versement
      WHERE versement_id = $1
      ORDER BY date_operation DESC
    `;
    
    const result = await pool.query(query, [id]);
    return result.rows;
  }
}

module.exports = Versement;