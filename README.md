# Clarifi

Monorepo for Clarifi:

| Folder | What |
|--------|------|
| **Root** (`/`) | Desktop overlay app (Electron) |
| **`web/`** | Next.js dashboard + API (deploy to Vercel with **Root Directory = `web`**) |

## Clarifi Desktop

AI meeting co-pilot overlay for macOS and Windows.

## Development

```bash
npm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY, GROQ_API_KEY
npm run electron:dev
```

## Phase 1 — Release prep (complete)

- **Branding:** `Clarifi` / `com.clarifi.desktop` in `electron-builder.yml`
- **Icons:** `build/icon.icns` (Mac), `build/icon.ico` (Windows) from `build/icon-source.png`
- **API keys:** Never baked into the build. Loaded at runtime from:
  - `.env.local` (development)
  - `~/Library/Application Support/Clarifi/.env` (packaged Mac)
  - Keychain via `auth:validate` IPC (`anthropic`, `groq` services)
- **Native helper:** `resources/audio-capture-helper` (macOS system audio)

### Regenerate icons

```bash
npm run build:icons
# or pass a custom PNG:
bash scripts/build-icons.sh path/to/logo.png
```

### Build installers

```bash
npm run build:mac    # → release/Clarifi-x.x.x.dmg
npm run build:win    # → release/Clarifi Setup x.x.x.exe
```

### Packaged app API setup

Users must configure their own keys. Create `~/.config` equivalent:

**macOS:** `~/Library/Application Support/Clarifi/.env`

```
ANTHROPIC_API_KEY=sk-ant-...
GROQ_API_KEY=gsk_...
```

## Permissions (macOS)

- Microphone — live transcription
- Screen Recording — screen context + system audio capture
