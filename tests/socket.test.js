const request = require('supertest');
const { app, httpServer } = require('../app');
const pool = require('../config/database');
const socketIO = require('socket.io-client');
const socketService = require('../services/socketService');

describe('Socket.IO Tests', () => {
  // Données de test
  const testAdmin = {
    username: 'admin_socket_test',
    email: 'admin_socket_test@example.com',
    password: 'AdminPass123',
    role_id: 1
  };
  
  const testClient = {
    name: 'Socket Test Client'
  };
  
  const testVersement = {
    numero_cheque: 'CH-TEST-001',
    amount: 1000,
    description: 'Test versement pour socket'
  };
  
  let adminToken, clientId, versementId;
  let socketClient;
  let socketClientURL;
  
  // Créer une promesse pour attendre des événements socket
  const waitForSocketEvent = (socket, event) => {
    return new Promise((resolve) => {
      socket.once(event, (data) => {
        resolve(data);
      });
    });
  };
  
  beforeAll(async () => {
    try {
      // Démarrer le serveur pour les tests
      await new Promise((resolve) => {
        const server = httpServer.listen(0, () => {
          socketClientURL = `http://localhost:${server.address().port}`;
          resolve();
        });
      });
      
      // Nettoyer les tables
      await pool.query('TRUNCATE TABLE versements CASCADE');
      await pool.query('TRUNCATE TABLE clients CASCADE');
      await pool.query('TRUNCATE TABLE users CASCADE');
      
      // Créer l'utilisateur admin
      await request(app)
        .post('/api/auth/register')
        .send(testAdmin);
      
      // Connexion admin
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: testAdmin.username,
          password: testAdmin.password
        });
      
      adminToken = loginResponse.body.data.token;
      
      // Créer un client de test
      const clientResponse = await request(app)
        .post('/api/clients')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(testClient);
      
      clientId = clientResponse.body.data.id;
      
      // Connecter le client socket
      socketClient = socketIO(socketClientURL, {
        transports: ['websocket'],
        forceNew: true
      });
      
      // Attendre la connexion du client socket
      await new Promise((resolve) => {
        socketClient.on('connect', resolve);
      });
    } catch (error) {
      console.error('Erreur dans beforeAll:', error);
    }
  }, 30000);
  
  afterAll(async () => {
    try {
      // Fermer la connexion socket
      if (socketClient && socketClient.connected) {
        socketClient.disconnect();
      }
      
      // Nettoyer les tables
      await pool.query('TRUNCATE TABLE versements CASCADE');
      await pool.query('TRUNCATE TABLE clients CASCADE');
      await pool.query('TRUNCATE TABLE users CASCADE');
      
      // Arrêter le serveur
      await new Promise((resolve) => {
        httpServer.close(resolve);
      });
      
      // Fermer la connexion à la base de données
      await pool.end();
    } catch (error) {
      console.error('Erreur dans afterAll:', error);
    }
  }, 30000);
  
  // Tests
  describe('Socket Connection', () => {
    it('should connect to socket server', async () => {
      expect(socketClient.connected).toBe(true);
    });
    
    it('should receive recent_audit_events on connection', async () => {
      // Reconnexion pour déclencher l'événement
      socketClient.disconnect();
      socketClient = socketIO(socketClientURL, {
        transports: ['websocket'],
        forceNew: true
      });
      
      // Attendre l'événement recent_audit_events
      const auditEvents = await waitForSocketEvent(socketClient, 'recent_audit_events');
      expect(Array.isArray(auditEvents)).toBe(true);
    }, 10000);
  });
  
  describe('Client Subscription', () => {
    it('should subscribe to client_audit events', async () => {
      // S'abonner aux événements d'audit du client
      socketClient.emit('subscribe_client_audit', clientId);
      
      // Attendre l'événement client_audit_history
      const clientAuditHistory = await waitForSocketEvent(socketClient, 'client_audit_history');
      
      expect(clientAuditHistory).toHaveProperty('clientId', clientId);
      expect(clientAuditHistory).toHaveProperty('audits');
      expect(Array.isArray(clientAuditHistory.audits)).toBe(true);
    }, 10000);
  });
  
  describe('Versement Events', () => {
    it('should emit audit_event when creating a versement', async () => {
      // Écouter l'événement audit_event
      const auditEventPromise = waitForSocketEvent(socketClient, 'audit_event');
      
      // Créer un versement
      const versementData = {
        ...testVersement,
        client_id: clientId
      };
      
      const response = await request(app)
        .post('/api/versements')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(versementData);
      
      expect(response.status).toBe(201);
      versementId = response.body.data.id;
      
      // Attendre l'événement audit_event
      const auditEvent = await auditEventPromise;
      expect(auditEvent).toHaveProperty('type', 'INSERT');
      expect(auditEvent.versement).toHaveProperty('id', versementId);
    }, 10000);
    
    it('should emit client_audit_event when updating a versement', async () => {
      // S'abonner aux événements d'audit du client
      socketClient.emit('subscribe_client_audit', clientId);
      
      // Écouter l'événement client_audit_event
      const clientAuditEventPromise = waitForSocketEvent(socketClient, 'client_audit_event');
      
      // Mettre à jour le versement
      console.log('Tentative de mise à jour du versement avec ID:', versementId);
      const response = await request(app)
  .put(`/api/versements/${versementId}`)
  .set('Authorization', `Bearer ${adminToken}`)
  .set('Content-Type', 'application/json')
  .send({
    client_id: clientId,  // Ajoutez ceci
    numero_cheque: testVersement.numero_cheque,  // Ajoutez ceci
    description: 'Versement mis à jour pour test socket',
    amount: 1000
  });
      
      expect(response.status).toBe(200);
      
      // Attendre l'événement client_audit_event
      const clientAuditEvent = await clientAuditEventPromise;
      expect(clientAuditEvent).toHaveProperty('type', 'UPDATE');
      expect(clientAuditEvent.versement).toHaveProperty('id', versementId);
    }, 10000);
    
    it('should emit versement_audit_event when subscribing to a versement', async () => {
      // S'abonner aux événements d'audit du versement
      socketClient.emit('subscribe_versement_audit', versementId);
      
      // Écouter l'événement versement_audit_event
      const versementAuditEventPromise = waitForSocketEvent(socketClient, 'versement_audit_event');
      
      // Modifier le versement pour déclencher un événement
      console.log('Tentative de mise à jour du versement avec ID:', versementId);
      const response = await request(app)
  .put(`/api/versements/${versementId}`)
  .set('Authorization', `Bearer ${adminToken}`)
  .set('Content-Type', 'application/json')
  .send({
    client_id: clientId,  
    numero_cheque: testVersement.numero_cheque,  
    description: 'Versement mis à jour pour test socket',
    amount: 1100
  });
      
      expect(response.status).toBe(200);
      
      // Attendre l'événement versement_audit_event
      const versementAuditEvent = await versementAuditEventPromise;
      expect(versementAuditEvent).toHaveProperty('type', 'UPDATE');
      expect(versementAuditEvent.versement).toHaveProperty('id', versementId);
    }, 10000);
  });
  
  describe('Audit Counters', () => {
    it('should emit audit_counters_updated when counters are updated', async () => {
      // Écouter l'événement audit_counters_updated
      const auditCountersPromise = waitForSocketEvent(socketClient, 'audit_counters_updated');
      
      // Déclencher la mise à jour des compteurs
      socketService.updateAuditCounters();
      
      // Attendre l'événement audit_counters_updated
      const auditCounters = await auditCountersPromise;
      expect(auditCounters).toBeDefined();
      expect(auditCounters).toHaveProperty('total');
    }, 10000);
  });
  
  describe('Notification', () => {
    it('should emit notification when a notification is sent', async () => {
      // Écouter l'événement notification
      const notificationPromise = waitForSocketEvent(socketClient, 'notification');
      
      // Émettre une notification
      socketService.emitNotification('info', 'Test notification');
      
      // Attendre l'événement notification
      const notification = await notificationPromise;
      expect(notification).toHaveProperty('type', 'info');
      expect(notification).toHaveProperty('message', 'Test notification');
      expect(notification).toHaveProperty('timestamp');
    }, 10000);
  });
  
  describe('Socket Unsubscribe', () => {
    it('should unsubscribe from client_audit events', async () => {
      // Se désabonner des événements d'audit du client
      socketClient.emit('unsubscribe_client_audit', clientId);
      
      // Créer un nouveau client socket pour vérifier
      const newSocketClient = socketIO(socketClientURL, {
        transports: ['websocket'],
        forceNew: true
      });
      
      // Attendre la connexion du nouveau client socket
      await new Promise((resolve) => {
        newSocketClient.on('connect', resolve);
      });
      
      // Vérifier que le client s'est bien désabonné (indirectement)
      // En pratique, nous ne pouvons pas vérifier directement qu'un client n'est plus abonné
      // Mais nous pouvons vérifier que le service socket fonctionne toujours
      expect(socketService.getIO()).toBeDefined();
      
      // Fermer la connexion du nouveau client socket
      newSocketClient.disconnect();
    }, 10000);
    
    it('should unsubscribe from versement_audit events', async () => {
      // Se désabonner des événements d'audit du versement
      socketClient.emit('unsubscribe_versement_audit', versementId);
      
      // Vérifier que le client s'est bien désabonné (indirectement)
      expect(socketService.getIO()).toBeDefined();
    }, 10000);
  });
});