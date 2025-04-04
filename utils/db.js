const pool = require('../config/database');

module.exports = {
  query: (text, params) => pool.query(text, params),
  
  getClient: async () => {
    const client = await pool.connect();
    const query = client.query;
    const release = client.release;
    
    // Logging automatique
    client.query = (...args) => {
      console.log('QUERY:', args[0]);
      return query.apply(client, args);
    };
    
    client.release = () => {
      client.query = query;
      client.release = release;
      return release.apply(client);
    };
    
    return client;
  },
  
  testConnection: async () => {
    try {
      const client = await pool.connect();
      client.release();
      console.log('Test de connexion à la base de données réussi');
      return true;
    } catch (error) {
      console.error('Erreur lors du test de connexion à la base de données:', error);
      throw error;
    }
  },

  // Dans utils/db.js   
  
  disconnect: async () => {
    try {
    // Fermer toutes les connexions du pool
    await pool.end();
    console.log('Connexion à la base de données fermée');
  } catch (error) {
    console.error('Erreur lors de la fermeture de la connexion:', error);
  }
}

};