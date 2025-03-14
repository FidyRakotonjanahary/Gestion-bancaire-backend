const request = require('supertest');
const { app } = require('../app'); // Importation de l'application Express
const pool = require('../config/database');
const db = require('../utils/db');
const Audit  = require('../models/Audit'); // Assurez-vous que le chemin est correct

describe('Audit API', () => {
  // Données de test pour les utilisateurs
  const testAdmin = {
    username: 'adminaudit',
    email: 'adminaudit@example.com',
    password: 'AdminAudit123',
    role_id: 1 // Rôle administrateur
  };
  
  const testUser = {
    username: 'useraudit',
    email: 'useraudit@example.com',
    password: 'UserAudit123',
    role_id: 2 // Rôle utilisateur standard
  };
  
  // Variables pour stocker les tokens et IDs
  let adminToken, userToken;
  let clientId, versementId;
  let poolClosed = false;
  
  beforeAll(async () => {
    // Vérifier la connexion à la base de données
    try {
      await db.testConnection();
      console.log('Connexion à la base de données de test établie');
      
      // Créer les utilisateurs de test
      await request(app)
        .post('/api/auth/register')
        .send(testAdmin);
        
      await request(app)
        .post('/api/auth/register')
        .send(testUser);
        
      // Obtenir les tokens d'authentification
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
      const adminUserInfo = await request(app)
  .get('/api/auth/me')  // Supposons qu'il y ait un endpoint pour récupérer les infos utilisateur
  .set('Authorization', `Bearer ${adminToken}`);

const adminUserId = adminUserInfo.body.data.id;
      // Créer un client de test pour générer des entrées d'audit
      const clientResponse = await request(app)
        .post('/api/clients')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Client Test Audit' });
      
      clientId = clientResponse.body.data.id;
      
      // Créer un versement de test pour générer des entrées d'audit
      const versementResponse = await request(app)
        .post('/api/versements')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          client_id: clientId,
          amount: 1000,
          type: 'DEPOSIT',
          description: 'Test versement'
        });
      
      versementId = versementResponse.body.data.id;

      await Audit.create({
        user_id: adminUserId,
        action: 'Créer un test',
        entity_type: 'test_entity',
        entity_id: 1,
        old_values: JSON.stringify({ test: 'old' }),
        new_values: JSON.stringify({ test: 'new' }),
        client_id: clientId,
        versement_id: versementId,
        action_type: 'INSERT'  // Utiliser le même action_type que dans le test
      });
      
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
      
      // Fermez le pool
      await pool.end();
      poolClosed = true;
      console.log('Connexion à la base de données fermée');
    } catch (error) {
      console.error('Erreur pendant le nettoyage des tests:', error);
    }
  }, 50000);

  // Tests pour récupérer tous les audits
  describe('GET /api/audit', () => {
    it('should get all audits as admin', async () => {
      const response = await request(app)
        .get('/api/audit')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      // On s'attend à avoir au moins les entrées pour la création du client et du versement
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should deny access without authentication', async () => {
      const response = await request(app)
        .get('/api/audit');
      
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  // Tests pour les statistiques d'audit
  describe('GET /api/audit/stats', () => {
    it('should get audit statistics as admin', async () => {
      const response = await request(app)
        .get('/api/audit/stats')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('counts');
      expect(response.body.counts).toHaveProperty('total');
      expect(response.body.counts).toHaveProperty('insert');
      expect(response.body.counts).toHaveProperty('update');
      expect(response.body.counts).toHaveProperty('delete');
    });
  });

  // Tests pour récupérer les audits par utilisateur
  describe('GET /api/audit/user/:user_id', () => {
    it('should get audits by user as admin', async () => {
      // On utilise l'ID de l'utilisateur admin qui a créé le client et le versement
      const adminId = 1; // À adapter selon votre structure de données
      
      const response = await request(app)
        .get(`/api/audit/user/${adminId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should deny access for regular users', async () => {
      const adminId = 1;
      
      const response = await request(app)
        .get(`/api/audit/user/${adminId}`)
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  // Tests pour récupérer les audits par client
  describe('GET /api/audit/client/:clientId', () => {
    it('should get audits by client', async () => {
      // Vérification que l'ID du client est bien défini
      expect(clientId).toBeDefined();
      
      const response = await request(app)
        .get(`/api/audit/client/${clientId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      // Il devrait y avoir au moins une entrée pour la création du client
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  // Tests pour récupérer les audits par versement
  describe('GET /api/audit/versement/:versementId', () => {
    it('should get audits by versement', async () => {
      // Vérification que l'ID du versement est bien défini
      expect(versementId).toBeDefined();
      
      const response = await request(app)
        .get(`/api/audit/versement/${versementId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      // Il devrait y avoir au moins une entrée pour la création du versement
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  // Tests pour récupérer les audits par type d'action
  describe('GET /api/audit/type/:action_type', () => {
    it('should get audits by action type', async () => {
      // Test pour le type d'action INSERT (création de client et versement)
      const response = await request(app)
        .get('/api/audit/type/INSERT')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  // Tests pour récupérer les audits récents
  describe('GET /api/audit/recent', () => {
    it('should get recent audits with default limit', async () => {
      const response = await request(app)
        .get('/api/audit/recent')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      // Le nombre d'entrées par défaut est 10
      expect(response.body.data.length).toBeLessThanOrEqual(10);
    });

    it('should get recent audits with custom limit', async () => {
      const limit = 5;
      
      const response = await request(app)
        .get(`/api/audit/recent?limit=${limit}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(limit);
    });
  });

  // Tests pour récupérer les audits par plage de dates
  describe('GET /api/audit/date-range', () => {
    it('should get audits by date range', async () => {
      // Utiliser la date d'aujourd'hui pour le test
    // Dans votre test date-range
const today = new Date();
const oneWeekAgo = new Date(today);
oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
const oneWeekLater = new Date(today);
oneWeekLater.setDate(oneWeekLater.getDate() + 7);

const start_date = oneWeekAgo.toISOString().split('T')[0]; // Format YYYY-MM-DD
const end_date = oneWeekLater.toISOString().split('T')[0];

const response = await request(app)
  .get(`/api/audit/date-range?start_date=${start_date}&end_date=${end_date}`)
  .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      // Les entrées créées aujourd'hui devraient être dans la plage de dates
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  // Tests pour récupérer un audit par ID
  describe('GET /api/audit/:id', () => {
    it('should get an audit by ID', async () => {
      // D'abord, récupérons un ID d'audit existant
      const allAuditsResponse = await request(app)
        .get('/api/audit')
        .set('Authorization', `Bearer ${adminToken}`);
      
      const auditId = allAuditsResponse.body.data[0].id;
      expect(auditId).toBeDefined();
      
      const response = await request(app)
        .get(`/api/audit/${auditId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id', auditId);
    });

    it('should return 404 for non-existent audit', async () => {
      const response = await request(app)
        .get('/api/audit/9999999')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Audit non trouvé');
    });
  });

  // Tests pour l'historique des soldes d'un client
  describe('GET /api/audit/client/:clientId/balance-history', () => {
    it('should get client balance history', async () => {
      // Vérification que l'ID du client est bien défini
      expect(clientId).toBeDefined();
      
      const response = await request(app)
        .get(`/api/audit/client/${clientId}/balance-history`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      // La création du versement devrait avoir créé un historique de solde
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });
});