const fs = require('fs');
const path = require('path');

const { withEntitlementsPlist, withFinalizedMod } = require('expo/config-plugins');
const plist = require('@expo/plist').default;

function findEntitlementsFiles(iosRoot) {
  if (!fs.existsSync(iosRoot)) {
    return [];
  }
  const found = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name.endsWith('.entitlements')) {
        found.push(fullPath);
      }
    }
  };
  walk(iosRoot);
  return found;
}

function stripApsFromEntitlementsFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }
  const entitlements = plist.parse(fs.readFileSync(filePath, 'utf8'));
  if (!entitlements || typeof entitlements !== 'object' || !('aps-environment' in entitlements)) {
    return;
  }
  delete entitlements['aps-environment'];
  fs.writeFileSync(filePath, plist.build(entitlements));
}

/**
 * Runs after autolinked expo-notifications adds aps-environment.
 * Local scheduled notifications do not require push entitlements.
 */
function withoutPushEntitlement(config) {
  config = withEntitlementsPlist(config, (config) => {
    delete config.modResults['aps-environment'];
    return config;
  });

  return withFinalizedMod(config, [
    'ios',
    async (config) => {
      for (const filePath of findEntitlementsFiles(config.modRequest.platformProjectRoot)) {
        stripApsFromEntitlementsFile(filePath);
      }
      return config;
    },
  ]);
}

module.exports = withoutPushEntitlement;
