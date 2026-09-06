const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Required for npm workspaces: watch the workspace root for hoisted dependencies
config.watchFolders = [workspaceRoot];

// Tell Metro where to find packages (hoisted to workspace root)
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Support .bin model files
config.resolver.assetExts.push('bin');

module.exports = config;
