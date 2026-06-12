import { app } from 'electron'
import { execSync } from 'child_process'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

const DEBUG_ENDPOINT =
  'http://127.0.0.1:7545/ingest/c19994d6-505e-4d73-855e-70ee46048b6f'
const DEBUG_LOG_PATH = '/Users/tschool/Desktop/Clarifi.c/.cursor/debug-6989d7.log'

function logPaths(): string[] {
  return [
    DEBUG_LOG_PATH,
    path.join(os.homedir(), 'Library', 'Logs', 'Clarifi', 'startup.log'),
  ]
}

export function logStartup(
  hypothesisId: string,
  message: string,
  data: Record<string, unknown> = {},
): void {
  const payload = {
    sessionId: '6989d7',
    runId: process.env.DEBUG_RUN_ID || 'prod',
    hypothesisId,
    location: 'electron/startupDiagnostics.ts',
    message,
    data: {
      ...data,
      pid: process.pid,
      packaged: app.isPackaged,
      execPath: process.execPath,
    },
    timestamp: Date.now(),
  }
  const line = `${JSON.stringify(payload)}\n`
  // #region agent log
  for (const logPath of logPaths()) {
    try {
      fs.mkdirSync(path.dirname(logPath), { recursive: true })
      fs.appendFileSync(logPath, line)
    } catch {
      /* ignore */
    }
  }
  fetch(DEBUG_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': '6989d7',
    },
    body: JSON.stringify(payload),
  }).catch(() => {})
  // #endregion
}

export function stripMacQuarantine(): void {
  if (process.platform !== 'darwin' || !app.isPackaged) return

  const appBundle = path.resolve(process.execPath, '..', '..', '..')
  const targets = [process.execPath, appBundle]
  for (const target of targets) {
    try {
      execSync(`xattr -dr com.apple.quarantine "${target}"`, { stdio: 'ignore' })
      logStartup('H1', 'quarantine-stripped', { target })
    } catch (err) {
      logStartup('H1', 'quarantine-strip-failed', {
        target,
        error: String(err),
      })
    }
  }
}
