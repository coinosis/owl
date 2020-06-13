const allSettings = require('./settings.json');
const environment = process.env.ENVIRONMENT || 'development';
const settings = allSettings[environment];

module.exports = settings;
