/**
 * electron-builder afterPack hook — strip xattrs that break codesign on macOS.
 */
const { execSync } = require('child_process')

exports.default = async function afterPack(context) {
  const { appOutDir, electronPlatformName } = context
  if (electronPlatformName !== 'darwin') return

  console.log(`Clearing extended attributes in ${appOutDir}...`)
  execSync(`dot_clean -m "${appOutDir}"`, { stdio: 'inherit' })
  execSync(`xattr -cr "${appOutDir}"`, { stdio: 'inherit' })
}
