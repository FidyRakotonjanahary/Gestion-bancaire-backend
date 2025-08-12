# Application de Gestion de Versements Bancaires - Backend

Ce projet est une API RESTful pour une application de gestion de versements bancaires.

## Fonctionnalités

- Gestion des utilisateurs (ADMIN et USER)
- Authentification sécurisée avec JWT
- Gestion des clients et de leurs soldes
- Gestion des versements bancaires
- Système d'audit complet
- Mises à jour en temps réel via Socket.IO
- Permissions granulaires par utilisateur

## Installation

1. Cloner le dépôt
2. Installer les dépendances : `npm install`
3. Copier `.env.example` vers `.env` et configurer les variables d'environnement
4. Configurer la base de données : `npm run setup-db`
5. Démarrer le serveur : `npm start` ou `npm run dev` pour le mode développement

## Structure du Projet

- `/config` - Fichiers de configuration
- `/controllers` - Contrôleurs pour la logique métier
- `/db` - Scripts et migrations SQL
- `/middleware` - Middlewares Express
- `/models` - Modèles de données
- `/routes` - Routes API
- `/services` - Services pour la logique métier
- `/tests` - Tests unitaires et d'intégration
- `/utils` - Utilitaires divers

## Documentation de l'API

### Authentification

- `POST /api/auth/register` - Inscription d'un nouvel utilisateur
- `POST /api/auth/login` - Connexion
- `GET /api/auth/me` - Informations sur l'utilisateur connecté

### Utilisateurs

- `GET /api/users` - Liste des utilisateurs (ADMIN)
- `GET /api/users/:id` - Détails d'un utilisateur
- `PUT /api/users/:id` - Mise à jour d'un utilisateur
- `DELETE /api/users/:id` - Suppression d'un utilisateur

### Clients

- `GET /api/clients` - Liste des clients
- `GET /api/clients/:id` - Détails d'un client
- `POST /api/clients` - Création d'un nouveau client
- `PUT /api/clients/:id` - Mise à jour d'un client
- `DELETE /api/clients/:id` - Suppression d'un client

### Versements

- `GET /api/versements` - Liste des versements
- `GET /api/versements/:id` - Détails d'un versement
- `POST /api/versements` - Création d'un nouveau versement
- `PUT /api/versements/:id` - Mise à jour d'un versement
- `DELETE /api/versements/:id` - Suppression d'un versement

### Audit

- `GET /api/audit` - Liste des logs d'audit
- `GET /api/audit/stats` - Statistiques d'audit

### Permissions

- `GET /api/permissions` - Liste des permissions
- `GET /api/permissions/user/:userId` - Permissions d'un utilisateur
- `PUT /api/permissions/user/:userId` - Mise à jour des permissions d'un utilisateur

## Tests

Exécuter les tests : `npm test`


## Login
Nom : admin
Mot de passe : Admin123