/**
 * electron-builder afterPack hook — prepare unsigned macOS bundles for distribution.
 */
const { execSync } = require('child_process')
const path = require('path')

exports.default = async function afterPack(context) {
  const { appOutDir, electronPlatformName, packager } = context
  if (electronPlatformName !== 'darwin') return

  const appName = packager.appInfo.productFilename
  const appPath = path.join(appOutDir, `${appName}.app`)

  console.log(`Clearing extended attributes in ${appOutDir}...`)
  execSync(`dot_clean -m "${appOutDir}"`, { stdio: 'inherit' })
  execSync(`xattr -cr "${appOutDir}"`, { stdio: 'inherit' })

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
