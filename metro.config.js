// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
// Bundle Drizzle's generated SQL migrations (https://orm.drizzle.team/docs/connect-expo-sqlite).
config.resolver.sourceExts.push('sql');

module.exports = config;
