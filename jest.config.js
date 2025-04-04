module.exports = {
    // Environnement de test (Node.js pour une application backend)
    testEnvironment: "node",
    
    // Timeout en millisecondes pour chaque test
    testTimeout: 30000,
    
    // Afficher les détails pendant l'exécution des tests
    verbose: true,
    
    // Sortir après tous les tests
    forceExit: true,
    
    // Détecter les ressources non fermées
    detectOpenHandles: true,
    testRegex: '/tests/*',
    // Ignorer certains dossiers
    testPathIgnorePatterns: ["/node_modules/"],
  };