const validators = {
    isValidEmail: (email) => {
      const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return regex.test(email);
    },
    
    isValidPassword: (password) => {
      // Au moins 8 caractères, une majuscule, une minuscule et un chiffre
      const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;
      return regex.test(password);
    },
    
    isValidAmount: (amount) => {
      return !isNaN(parseFloat(amount)) && parseFloat(amount) > 0;
    },
    
    sanitizeInput: (input) => {
      if (typeof input === 'string') {
        // Éliminer les balises HTML et les caractères spéciaux
        return input.replace(/<[^>]*>?/gm, '').trim();
      }
      return input;
    }
  };
  
  module.exports = validators;