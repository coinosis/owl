const allSettings = require('../settings.json');
const environment = process.env.ENVIRONMENT || 'development';
console.log(`running on the ${environment} environment`);
const settings = allSettings[environment];

module.exports = settings;
