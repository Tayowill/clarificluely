/**
 * electron-builder afterSign hook — notarize Clarifi with Apple notarytool.
 * Requires: APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, APPLE_TEAM_ID
 * Optional: APPLE_API_KEY, APPLE_API_KEY_ID, APPLE_API_ISSUER (instead of password)
 */
const { notarize } = require('@electron/notarize')
const fs = require('fs')
const path = require('path')

const DEBUG_ENDPOINT =
  'http://127.0.0.1:7545/ingest/c19994d6-505e-4d73-855e-70ee46048b6f'
const LOG_PATH = '/Users/tschool/Desktop/Clarifi.c/.cursor/debug-6989d7.log'

function debugLog(hypothesisId, message, data) {
  const payload = {
    sessionId: '6989d7',
    runId: process.env.DEBUG_RUN_ID || 'notarize',
    hypothesisId,
    location: 'scripts/notarize.cjs',
    message,
    data,
    timestamp: Date.now(),
  }
  // #region agent log
  fetch(DEBUG_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': '6989d7',
    },
    body: JSON.stringify(payload),
  }).catch(() => {})
  try {
    fs.appendFileSync(LOG_PATH, `${JSON.stringify(payload)}\n`)
  } catch {
    /* ignore */
  }
  // #endregion
}

exports.default = async function notarizeApp(context) {
  const { electronPlatformName, appOutDir } = context
  if (electronPlatformName !== 'darwin') return

  const appName = context.packager.appInfo.productFilename
  const appPath = path.join(appOutDir, `${appName}.app`)

  const appleId = process.env.APPLE_ID
  const appleIdPassword =
    process.env.APPLE_APP_SPECIFIC_PASSWORD || process.env.APPLE_ID_PASSWORD
  const teamId = process.env.APPLE_TEAM_ID
  const appleApiKey = process.env.APPLE_API_KEY
  const appleApiKeyId = process.env.APPLE_API_KEY_ID
  const appleApiIssuer = process.env.APPLE_API_ISSUER

  const hasPasswordCreds = appleId && appleIdPassword && teamId
  const hasApiKeyCreds = appleApiKey && appleApiKeyId && appleApiIssuer

  if (process.env.SKIP_NOTARIZE === '1') {
    debugLog('H2', 'Notarization skipped by SKIP_NOTARIZE', { skipNotarize: true })
    console.log('Skipping notarization (SKIP_NOTARIZE=1).')
    return
  }

  if (!hasPasswordCreds && !hasApiKeyCreds) {
    debugLog('H2', 'Notarization skipped — missing Apple credentials', {
      hasPasswordCreds,
      hasApiKeyCreds,
    })
    console.warn('Skipping notarization — no Apple credentials in environment.')
    return
  }

  debugLog('H2', 'Starting notarization', { appPath })
  console.log(`Notarizing ${appPath}...`)

  const options = {
    tool: 'notarytool',
    appPath,
    appBundleId: 'com.clarifi.desktop',
  }

  if (hasApiKeyCreds) {
    options.appleApiKey = appleApiKey
    options.appleApiKeyId = appleApiKeyId
    options.appleApiIssuer = appleApiIssuer
  } else {
    options.appleId = appleId
    options.appleIdPassword = appleIdPassword
    options.teamId = teamId
  }

  await notarize(options)
  debugLog('H2', 'Notarization complete', { appPath })
  console.log('Notarization complete.')
}
