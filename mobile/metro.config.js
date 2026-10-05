const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'react-native-maps') {
    return context.resolveRequest(context, path.resolve(__dirname, 'react-native-maps.web.js'), platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
