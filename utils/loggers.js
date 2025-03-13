const fs = require('fs');
const path = require('path');

// Assurez-vous que le dossier logs existe
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

const logger = {
  info: (message) => {
    const logMessage = `[INFO] ${new Date().toISOString()} - ${message}\n`;
    console.log(logMessage);
    fs.appendFile(path.join(logsDir, 'app.log'), logMessage, (err) => {
      if (err) console.error('Erreur d\'écriture dans le fichier de log:', err);
    });
  },
  
  error: (message, error = null) => {
    const logMessage = `[ERROR] ${new Date().toISOString()} - ${message} ${error ? '- ' + error.stack : ''}\n`;
    console.error(logMessage);
    fs.appendFile(path.join(logsDir, 'error.log'), logMessage, (err) => {
      if (err) console.error('Erreur d\'écriture dans le fichier de log:', err);
    });
  }
};

module.exports = logger;