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
      WHERE balance >= 0
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

  static async updateBalance(id, newBalance, userId, action, transactionId = null) {
    // Utilisation d'une transaction pour assurer la cohérence
    const client = await pool.getClient();
    
    try {
      await client.query('BEGIN');
      
      // Récupérer le solde actuel pour enregistrer l'audit
      const currentBalanceQuery = `
        SELECT balance
        FROM clients
        WHERE id = $1
      `;
      
      const currentBalanceResult = await client.query(currentBalanceQuery, [id]);
      const oldBalance = currentBalanceResult.rows[0].balance;
      
      // Mise à jour du solde
      const updateQuery = `
        UPDATE clients
        SET balance = $1
        WHERE id = $2
        RETURNING id, account_number, name, balance, updated_at
      `;
      
      const updateResult = await client.query(updateQuery, [newBalance, id]);
      
      // Enregistrement de l'audit
      const auditQuery = `
        INSERT INTO audit_versement (
          user_id, action, entity_type, entity_id, 
          old_values, new_values, client_id, 
          versement_id, old_balance, new_balance, action_type
        )
        VALUES (
          $1, $2, 'client', $3, 
          jsonb_build_object('balance', $4), 
          jsonb_build_object('balance', $5), 
          $3, $6, $4, $5, $7
        )
      `;
      
      await client.query(auditQuery, [
        userId, 
        action, 
        id, 
        oldBalance, 
        newBalance, 
        transactionId, 
        action
      ]);
      
      await client.query('COMMIT');
      return updateResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async delete(id) {
    const query = `
      DELETE FROM clients
      WHERE id = $1
      RETURNING id
    `;
    
    const result = await pool.query(query, [id]);
    return result.rows[0];
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
      SELECT a.id, a.action, a.old_values, a.new_values, 
             a.old_balance, a.new_balance, a.action_type, a.created_at,
             u.username as performed_by
      FROM audit_versement a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.client_id = $1
      ORDER BY a.created_at DESC
    `;
    
    const result = await pool.query(query, [id]);
    return result.rows;
  }
}

module.exports = Client;