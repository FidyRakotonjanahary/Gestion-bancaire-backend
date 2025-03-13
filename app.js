const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { createServer } = require('http');
require('dotenv').config();

// Import des routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const clientRoutes = require('./routes/clients');
const versementRoutes = require('./routes/versements');
const auditRoutes = require('./routes/audit');
const permissionRoutes = require('./routes/permissions');

// Import des services
const socketService = require('./services/socketService');
const logger = require('./utils/loggers');

// Initialisation de l'application Express
const app = express();
const httpServer = createServer(app);

// Configuration de Socket.IO
socketService.initialize(httpServer);

// Middlewares
app.use(helmet()); // Sécurité
app.use(cors()); // Gestion CORS
app.use(express.json()); // Parsing du corps des requêtes en JSON
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev', { stream: { write: message => logger.info(message.trim()) } })); // Logging

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/versements', versementRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/permissions', permissionRoutes);

// Gestion des erreurs
app.use((err, req, res, next) => {
  logger.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Une erreur est survenue sur le serveur',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Route pour vérifier si l'API est en ligne
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'API en ligne' });
});


module.exports = { app, httpServer };