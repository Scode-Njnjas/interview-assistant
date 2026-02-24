// scripts/notarize.js
// Notarization hook for electron-builder.
// Activates only when Apple signing secrets are present (CI release builds).
// Skips gracefully in development and unsigned CI builds.

const { notarize } = require("@electron/notarize");

module.exports = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;

  if (electronPlatformName !== "darwin") {
    return;
  }

  // Skip if no signing identity is configured (dev builds, unsigned CI)
  if (!process.env.APPLE_ID && !process.env.APPLE_API_KEY_ID) {
    console.log("Skipping notarization: no Apple credentials configured");
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appPath = `${appOutDir}/${appName}.app`;

  console.log(`Notarizing ${appPath}...`);

  // Prefer API Key auth (no 2FA issues in CI)
  if (process.env.APPLE_API_KEY_ID) {
    await notarize({
      appPath,
      appleApiKey: process.env.APPLE_API_KEY_PATH || `~/.private_keys/AuthKey_${process.env.APPLE_API_KEY_ID}.p8`,
      appleApiKeyId: process.env.APPLE_API_KEY_ID,
      appleApiIssuer: process.env.APPLE_API_KEY_ISSUER,
    });
  } else {
    await notarize({
      appPath,
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_PASSWORD,
      teamId: process.env.APPLE_TEAM_ID,
    });
  }

  console.log("Notarization complete");
};
