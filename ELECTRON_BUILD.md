# AuraDesk Electron Build Guide

## Prerequisites
- Node.js v18+
- Git

## Quick Build (Windows)

```powershell
# 1. Clone the repo
git clone https://github.com/cyb3rh3ad/auradesk-4cb3f0f7.git
cd auradesk-4cb3f0f7

# 2. Install dependencies
npm install

# 3. Build web app
npm run build

# 4. Build Electron
npx electron-builder --win --dir

# 5. Run the app
.\release\win-unpacked\AuraDesk.exe
```

## Build for Distribution

```powershell
# Creates installer (.exe)
npx electron-builder --win
```

## macOS

```bash
npm run build
npx electron-builder --mac
```

## Linux

```bash
npm run build
npx electron-builder --linux
```

## Development Mode

```bash
# Terminal 1: Start Vite dev server
npm run dev

# Terminal 2: Start Electron (set NODE_ENV first)
set NODE_ENV=development && npx electron .
```

## Troubleshooting

**White screen?**
- Make sure `npm run build` completed successfully
- Check that `dist/index.html` exists before running electron-builder

**Build errors?**
- Delete `release` folder and rebuild
- Run `npm install` again
