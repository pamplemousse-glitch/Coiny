// Metro config tuned for the Coiny pnpm + Turborepo monorepo.
// Lets Metro watch the workspace root and resolve hoisted dependencies.
// See https://docs.expo.dev/guides/monorepos/
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// Watch the whole monorepo so shared/ changes trigger reloads.
config.watchFolders = [monorepoRoot];

// Resolve modules from the package first, then the hoisted workspace root.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

module.exports = config;
