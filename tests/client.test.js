const request = require('supertest');
const { app } = require('../app');
const pool = require('../config/database');
const db = require('../utils/db');
const { v4: uuidv4 } = require('uuid');

describe('Clients API', () => {
  // Données de test pour les utilisateurs et les clients
  const testAdmin = {
    username: 'adminuser',
    email: 'admin@example.com',
    password: 'AdminPass123',
    role_id: 1
  };
  
  const testUser = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'UserPass123',
    role_id: 2
  };
  
  // Modifié: ne contient que le champ name attendu par le contrôleur
  const testClient = {
    name: 'Test Client'
  };
  
  let adminToken, userToken, clientId, accountNumber, deleteClientId;
  let poolClosed = false;
  
  beforeAll(async () => {
    // Vérifier la connexion à la base de données
    try {
      await db.testConnection();
      console.log('Connexion à la base de données de test établie');
      
      // Nettoyer les tables
      await pool.query('TRUNCATE TABLE versements CASCADE');
      await pool.query('TRUNCATE TABLE clients CASCADE');
      await pool.query('TRUNCATE TABLE users CASCADE');
      
      // Créer les utilisateurs de test
      await request(app)
        .post('/api/auth/register')
        .send(testAdmin);
        
      await request(app)
        .post('/api/auth/register')
        .send(testUser);
        
      // Obtenir les tokens
      const adminResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: testAdmin.username,
          password: testAdmin.password
        });
      adminToken = adminResponse.body.data.token;
      
      const userResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: testUser.username,
          password: testUser.password
        });
      userToken = userResponse.body.data.token;
      
    } catch (error) {
      console.error('Erreur dans beforeAll:', error);
    }
  }, 15000);

  afterAll(async () => {
    if (poolClosed) return;
    
    try {
      // Nettoyer les tables
      await pool.query('TRUNCATE TABLE versements CASCADE');
      await pool.query('TRUNCATE TABLE clients CASCADE');
      await pool.query('TRUNCATE TABLE users CASCADE');
      
      // Fermez les écouteurs de notifications
      const client = await pool.connect();
      await client.query('UNLISTEN audit_changes');
      client.release();
      
      // Fermez le pool
      await pool.end();
      poolClosed = true;
      console.log('Connexion à la base de données fermée');
    } catch (error) {
      console.error('Erreur pendant le nettoyage des tests:', error);
    }
  }, 50000);

  // Tests de création de client
  describe('POST /api/clients', () => {
    it('should create a new client as admin', async () => {
      const response = await request(app)
        .post('/api/clients')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(testClient);
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Client créé avec succès');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('account_number');
      expect(response.body.data).toHaveProperty('name', testClient.name);
      
      // Sauvegarder l'ID et le numéro de compte pour les tests suivants
      clientId = response.body.data.id;
      accountNumber = response.body.data.account_number;
    });

    it('should not create a client with invalid data', async () => {
      const response = await request(app)
        .post('/api/clients')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });

    it('should deny client creation for unauthorized users', async () => {
      // Supposons que l'utilisateur normal n'a pas la permission client_create
      const response = await request(app)
        .post('/api/clients')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Client Non Autorisé'
        });
      
      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  // Tests de récupération de tous les clients
  describe('GET /api/clients', () => {
    it('should get all clients', async () => {
      const response = await request(app)
        .get('/api/clients')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should deny access without authentication', async () => {
      const response = await request(app)
        .get('/api/clients');
      
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  // Tests de récupération d'un client par ID
  describe('GET /api/clients/:id', () => {
    it('should get a client by ID', async () => {
      // Vérification que l'ID est bien défini
      expect(clientId).toBeDefined();
      
      const response = await request(app)
        .get(`/api/clients/${clientId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id', clientId);
      expect(response.body.data).toHaveProperty('name', testClient.name);
    });

    it('should return 404 for non-existent client', async () => {
      const response = await request(app)
        .get('/api/clients/9999')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Client non trouvé');
    });
  });

  // Tests de mise à jour d'un client
  describe('PUT /api/clients/:id', () => {
    it('should update a client as admin', async () => {
      // Vérification que l'ID est bien défini
      expect(clientId).toBeDefined();
      
      const updatedClient = {
        name: 'Updated Test Client'
      };
      
      const response = await request(app)
        .put(`/api/clients/${clientId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updatedClient);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Client mis à jour avec succès');
      expect(response.body.data).toHaveProperty('name', updatedClient.name);
    });

    it('should deny client update for unauthorized users', async () => {
      // Vérification que l'ID est bien défini
      expect(clientId).toBeDefined();
      
      const response = await request(app)
        .put(`/api/clients/${clientId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Attempted Update' });
      
      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 404 for updating non-existent client', async () => {
      const response = await request(app)
        .put('/api/clients/9999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Non-existent Client' });
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Client non trouvé');
    });
  });

  // Tests de récupération du solde d'un client
  describe('GET /api/clients/:id/solde', () => {
    it('should get client balance', async () => {
      // Vérification que l'ID est bien défini
      expect(clientId).toBeDefined();
      
      const response = await request(app)
        .get(`/api/clients/${clientId}/solde`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('balance');
      // Le solde initial devrait être 0
      expect(parseFloat(response.body.balance)).toBe(0);
    });

    it('should return 404 for non-existent client balance', async () => {
      const response = await request(app)
        .get('/api/clients/9999/solde')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Client non trouvé');
    });
  });

  // Tests de suppression d'un client
  describe('DELETE /api/clients/:id', () => {
    // Créons d'abord un client spécifiquement pour le test de suppression
    beforeAll(async () => {
      try {
        const deleteClientData = {
          name: 'Client à supprimer'
        };
        
        const createResponse = await request(app)
          .post('/api/clients')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(deleteClientData);
        
        expect(createResponse.status).toBe(201);
        deleteClientId = createResponse.body.data.id;
        expect(deleteClientId).toBeDefined();
      } catch (error) {
        console.error('Erreur lors de la création du client à supprimer:', error);
      }
    });
    
    it('should delete a client as admin', async () => {
      // Vérification que l'ID est bien défini
      expect(deleteClientId).toBeDefined();
      
      const response = await request(app)
        .delete(`/api/clients/${deleteClientId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Client supprimé avec succès');
    });

    // Créer un nouveau client spécifique pour ce test
    it('should deny client deletion for unauthorized users', async () => {
      // Créer un nouveau client pour ce test
      const clientForDenialTest = {
        name: 'Client pour test de refus'
      };
      
      const createResponse = await request(app)
        .post('/api/clients')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(clientForDenialTest);
      
      expect(createResponse.status).toBe(201);
      const denialTestClientId = createResponse.body.data.id;
      expect(denialTestClientId).toBeDefined();
      
      // Tester le refus de suppression
      const response = await request(app)
        .delete(`/api/clients/${denialTestClientId}`)
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 404 for deleting non-existent client', async () => {
      const response = await request(app)
        .delete('/api/clients/9999')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Client non trouvé');
    });
  });
});