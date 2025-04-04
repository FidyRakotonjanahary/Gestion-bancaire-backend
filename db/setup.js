// const fs = require('fs');
// const path = require('path');
// const { Pool } = require('pg');
// const dotenv = require('dotenv');

// // Charger les variables d'environnement
// dotenv.config({ path: path.join(__dirname, '..', 'config', '.env') });

// // Connexion à la base de données
// const pool = new Pool({
//   user: process.env.DB_USER,
//   host: process.env.DB_HOST,
//   database: process.env.DB_NAME,
//   password: process.env.DB_PASSWORD,
//   port: process.env.DB_PORT
// });

// async function setupDatabase() {
//   try {
//     console.log('Démarrage de la configuration de la base de données...');

//     // Exécuter les migrations
//     const migrationFiles = fs.readdirSync(path.join(__dirname, 'migrations'))
//       .sort();

//     for (const file of migrationFiles) {
//       console.log(`Exécution de la migration: ${file}`);
//       const sql = fs.readFileSync(path.join(__dirname, 'migrations', file), 'utf8');
//       await pool.query(sql);
//     }
//     console.log('Migrations exécutées avec succès.');

//     // Exécuter les triggers
//     const triggerFiles = fs.readdirSync(path.join(__dirname, 'triggers'))
//       .sort();

//     for (const file of triggerFiles) {
//       console.log(`Exécution du trigger: ${file}`);
//       const sql = fs.readFileSync(path.join(__dirname, 'triggers', file), 'utf8');
//       await pool.query(sql);
//     }
//     console.log('Triggers exécutés avec succès.');

//     // Exécuter les seeds
//     const seedFiles = fs.readdirSync(path.join(__dirname, 'seeds'))
//       .sort();

//     for (const file of seedFiles) {
//       console.log(`Exécution du seed: ${file}`);
//       const sql = fs.readFileSync(path.join(__dirname, 'seeds', file), 'utf8');
//       await pool.query(sql);
//     }
//     console.log('Données initiales insérées avec succès.');

//     console.log('Configuration de la base de données terminée avec succès!');
//   } catch (error) {
//     console.error('Erreur lors de la configuration de la base de données:', error);
//     process.exit(1);
//   } finally {
//     await pool.end();
//   }
// }

// setupDatabase();

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const dotenv = require('dotenv');

// Charger les variables d'environnement
dotenv.config({ path: path.join(__dirname, '..', 'config', '.env') });

async function createAndSetupDatabase() {
  // Connexion à la base postgres (existante par défaut)
  const adminPool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: 'postgres', // Se connecter à postgres au lieu de votre BD
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT
  });

  try {
    console.log('Vérification si la base de données existe...');
    
    // Vérifier si la base de données existe déjà
    const checkDbResult = await adminPool.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`, 
      [process.env.DB_NAME]
    );
    
    // Si la base de données n'existe pas, la créer
    if (checkDbResult.rowCount === 0) {
      console.log(`Création de la base de données ${process.env.DB_NAME}...`);
      await adminPool.query(`CREATE DATABASE ${process.env.DB_NAME}`);
      console.log(`Base de données ${process.env.DB_NAME} créée avec succès!`);
    } else {
      console.log(`La base de données ${process.env.DB_NAME} existe déjà.`);
    }
  } catch (error) {
    console.error('Erreur lors de la création de la base de données:', error);
    process.exit(1);
  } finally {
    await adminPool.end();
  }

  // Connexion à la nouvelle base de données pour configurer le schéma
  const appPool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME, // Maintenant on se connecte à notre BD
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT
  });

  try {
    console.log('Démarrage de la configuration de la base de données...');

    // Exécuter les migrations
    const migrationFiles = fs.readdirSync(path.join(__dirname, 'migrations'))
      .sort();

    for (const file of migrationFiles) {
      console.log(`Exécution de la migration: ${file}`);
      const sql = fs.readFileSync(path.join(__dirname, 'migrations', file), 'utf8');
      await appPool.query(sql);
    }
    console.log('Migrations exécutées avec succès.');

    // Exécuter les triggers
    const triggerFiles = fs.readdirSync(path.join(__dirname, 'triggers'))
      .sort();

    for (const file of triggerFiles) {
      console.log(`Exécution du trigger: ${file}`);
      const sql = fs.readFileSync(path.join(__dirname, 'triggers', file), 'utf8');
      await appPool.query(sql);
    }
    console.log('Triggers exécutés avec succès.');

    // Exécuter les seeds
    const seedFiles = fs.readdirSync(path.join(__dirname, 'seeds'))
      .sort();

    for (const file of seedFiles) {
      console.log(`Exécution du seed: ${file}`);
      const sql = fs.readFileSync(path.join(__dirname, 'seeds', file), 'utf8');
      await appPool.query(sql);
    }
    console.log('Données initiales insérées avec succès.');
    

    console.log('Configuration de la base de données terminée avec succès!');
  } catch (error) {
    console.error('Erreur lors de la configuration de la base de données:', error);
    process.exit(1);
  } finally {
    await appPool.end();
  }
}

createAndSetupDatabase();