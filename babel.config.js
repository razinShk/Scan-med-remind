module.exports = function (api) {
 api.cache(true);
 return {
  presets: ['babel-preset-expo'],
  plugins: [
   // Required for expo-router
   'expo-router/babel',
   // Optional: for React Native Reanimated
   'react-native-reanimated/plugin',
   // Add support for @env
   ["module:react-native-dotenv", {
    "moduleName": "@env",
    "path": ".env",
    "blacklist": null,
    "whitelist": null,
    "safe": false,
    "allowUndefined": true
   }]
  ],
 };
}; 