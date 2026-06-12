/**
 * electron-builder afterPack hook — prepare unsigned macOS bundles for distribution.
 */
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

exports.default = async function afterPack(context) {
  const { appOutDir, electronPlatformName, packager } = context
  if (electronPlatformName !== 'darwin') return

  const appName = packager.appInfo.productFilename
  const appPath = path.join(appOutDir, `${appName}.app`)

  console.log(`Clearing extended attributes in ${appOutDir}...`)
  execSync(`dot_clean -m "${appOutDir}"`, { stdio: 'inherit' })
  execSync(`xattr -cr "${appOutDir}"`, { stdio: 'inherit' })

  const nativeModule = path.join(appPath, 'Contents/Resources/window_capture_exclude.node')
  if (fs.existsSync(nativeModule)) {
    console.log('Ad-hoc signing stealth native module...')
    try {
      execSync(`codesign --force --sign - "${nativeModule}"`, { stdio: 'inherit' })
    } catch (err) {
      console.warn('codesign stealth native module failed (continuing):', err.message)
    }
  }

  const signingDisabled =
    process.env.CSC_IDENTITY_AUTO_DISCOVERY === 'false' || !process.env.CSC_NAME
  if (!signingDisabled) return

  console.log('Removing broken adhoc signature from unsigned Clarifi.app...')
  try {
    execSync(`codesign --remove-signature "${appPath}"`, { stdio: 'inherit' })
  } catch (err) {
    console.warn('codesign --remove-signature failed (continuing):', err.message)
  }
}
