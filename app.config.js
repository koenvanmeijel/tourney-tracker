const appJson = require('./app.json');
const { version } = require('./package.json');

// Wires the Expo app version to package.json's version so there's a single
// source of truth (package.json) instead of keeping them in sync by hand.
module.exports = {
  expo: {
    ...appJson.expo,
    version,
  },
};
