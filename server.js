const { app, httpServer } = require('./app');
const db = require('./utils/db');
const logger = require('./utils/loggers');

const PORT = process.env.PORT || 3000;

// Fonction pour démarrer le serveur
async function startServer() {
  try {
    // Tester la connexion à la base de données
    await db.testConnection();
    logger.info('Connexion à la base de données établie avec succès');
    
    // Démarrer le serveur HTTP
    httpServer.listen(PORT, () => {
      logger.info(`Serveur démarré sur le port ${PORT}`);
      logger.info(`API disponible à l'adresse: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    logger.error('Erreur lors du démarrage du serveur:', error);
    process.exit(1);
  }
}

// Gestion des signaux d'arrêt
process.on('SIGINT', async () => {
  logger.info('Signal SIGINT reçu. Arrêt du serveur...');
  await db.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Signal SIGTERM reçu. Arrêt du serveur...');
  await db.disconnect();
  process.exit(0);
});

// Gestion des erreurs non capturées
process.on('uncaughtException', (error) => {
  logger.error('Erreur non capturée:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Promesse rejetée non gérée:', reason);
  process.exit(1);
});

// Démarrer le serveur
startServer();