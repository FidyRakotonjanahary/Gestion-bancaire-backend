const pool = require('../utils/db');

class Client {
  static async create(clientData) {
    const { account_number, name, balance = 0 } = clientData;
    
    const query = `
      INSERT INTO clients (account_number, name, balance)
      VALUES ($1, $2, $3)
      RETURNING id, account_number, name, balance, created_at
    `;
    
    const values = [account_number, name, balance];
    
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async getById(id) {
    const query = `
      SELECT id, account_number, name, balance, created_at, updated_at
      FROM clients
      WHERE id = $1
    `;
    
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async getCount() {
    const query = `
      SELECT COUNT(*) as count
      FROM clients
    `;
    
    const result = await pool.query(query);
    return parseInt(result.rows[0].count);
  }

  static async getByAccountNumber(accountNumber) {
    const query = `
      SELECT id, account_number, name, balance, created_at, updated_at
      FROM clients
      WHERE account_number = $1
    `;
    
    const result = await pool.query(query, [accountNumber]);
    return result.rows[0] || null;
  }

  static async getAll() {
    const query = `
      SELECT id, account_number, name, balance, created_at, updated_at
      FROM clients
      ORDER BY name ASC
    `;
    
    const result = await pool.query(query);
    return result.rows;
  }

  static async getAllWithBalance() {
    const query = `
      SELECT id, account_number, name, balance AS solde, created_at, updated_at
      FROM clients
      WHERE balance > 0
      ORDER BY name ASC
    `;
    
    const result = await pool.query(query);
    return result.rows;
  }

  static async update(id, clientData) {
    const { name, account_number } = clientData;
    
    const query = `
      UPDATE clients
      SET name = $1, account_number = $2
      WHERE id = $3
      RETURNING id, account_number, name, balance, updated_at
    `;
    
    const values = [name, account_number, id];
    
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async updateBalance(id, newBalance) {
    // Mise à jour directe du solde
    const query = `
      UPDATE clients
      SET balance = $1
      WHERE id = $2
      RETURNING id, account_number, name, balance, updated_at
    `;
    
    const result = await pool.query(query, [newBalance, id]);
    return result.rows[0];
  }

  static async delete(id, userId) {
    
    const client = await pool.getClient();
    
    try {
      await client.query('BEGIN');
      
      // Définir la variable de session pour le trigger d'audit
      await client.query(`SET LOCAL session.current_user_id = ${parseInt(userId)}`);
      
      
      const deleteQuery = `
        DELETE FROM clients
        WHERE id = $1
        RETURNING id
      `;
      
      const result = await client.query(deleteQuery, [id]);
      
      if (result.rows.length === 0) {
        throw new Error(`Client avec ID ${id} non trouvé`);
      }
      
      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async getClientBalance(id) {
    const query = `
      SELECT balance
      FROM clients
      WHERE id = $1
    `;
    
    const result = await pool.query(query, [id]);
    return result.rows[0] ? result.rows[0].balance : null;
  }
  
  static async getClientTransactions(id) {
    const query = `
      SELECT v.id, v.numero_cheque, v.amount, v.description, 
             v.created_at, v.updated_at, 
             u.username as created_by_username
      FROM versements v
      LEFT JOIN users u ON v.created_by = u.id
      WHERE v.client_id = $1
      ORDER BY v.created_at DESC
    `;
    
    const result = await pool.query(query, [id]);
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
      WHERE client_id = $1
      ORDER BY date_operation DESC
    `;
    const result = await pool.query(query, [id]);
    return result.rows;
  }
}

module.exports = Client;