const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  js.configs.recommended,
  {
    languageOptions: {
      // This tells the checker we are using Node.js, so words like "process" and "require" are allowed.
      globals: {
        ...globals.node
      }
    },
    rules: {
      // As a beginner, we don't want it to yell at us just because we created a variable and didn't use it yet.
      "no-unused-vars": "off" 
    }
  }
];