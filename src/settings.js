const allSettings = require('../settings.json');
const environment = process.env.ENVIRONMENT || 'development';
console.log(`running on the ${environment} environment`);
const settings = allSettings[environment];
settings.youtube = {
  ...settings.youtube,
  clientID: process.env.YOUTUBE_CLIENT_ID,
  clientSecret: process.env.YOUTUBE_CLIENT_SECRET,
  refreshToken: process.env.YOUTUBE_REFRESH_TOKEN,
};
settings.paypal = {
  ...settings.paypal,
  clientID: process.env.PAYPAL_CLIENT_ID,
  clientSecret: process.env.PAYPAL_CLIENT_SECRET,
};

module.exports = settings;
