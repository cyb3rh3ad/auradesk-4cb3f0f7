# Building AuraDesk as a Native Desktop App

This guide explains how to build AuraDesk as a native Windows .exe (and Mac/Linux) using Electron.

## Prerequisites

1. **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
2. **Git** - [Download](https://git-scm.com/)
3. **For Windows builds**: Windows OS
4. **For Mac builds**: macOS with Xcode Command Line Tools
5. **For Linux builds**: Linux with required build tools

## Step-by-Step Build Instructions

### 1. Export to GitHub

In Lovable:
1. Click the **GitHub** button in the top-right
2. Connect your GitHub account if not already connected
3. Click **Create Repository** to export your project

### 2. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
cd YOUR_REPO_NAME
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Add Electron Scripts to package.json

Open `package.json` and add these scripts to the `"scripts"` section:

```json
{
  "scripts": {
    "electron:dev": "concurrently \"npm run dev\" \"wait-on http://localhost:5173 && electron .\"",
    "electron:build": "npm run build && electron-builder --win",
    "electron:build:mac": "npm run build && electron-builder --mac",
    "electron:build:linux": "npm run build && electron-builder --linux"
  }
}
```

Also add this to the root of `package.json`:

```json
{
  "main": "electron/main.js"
}
```

### 5. Build the Application

**For Windows (.exe):**
```bash
npm run electron:build
```

**For macOS (.dmg):**
```bash
npm run electron:build:mac
```

**For Linux (.AppImage):**
```bash
npm run electron:build:linux
```

### 6. Find Your Built App

After building, your installer will be in the `release/` folder:
- Windows: `AuraDesk-Setup-1.0.0.exe`
- Mac: `AuraDesk-1.0.0.dmg`
- Linux: `AuraDesk-1.0.0.AppImage`

## Development Mode

To test the app in Electron during development:

```bash
npm run electron:dev
```

This will start the Vite dev server and open the app in an Electron window.

## Troubleshooting

### "electron-squirrel-startup" error
Install the package:
```bash
npm install electron-squirrel-startup
```

### Build fails on Windows
Make sure you have the Windows Build Tools:
```bash
npm install --global windows-build-tools
```

### Icons not showing
Create proper icon files:
- Windows: `.ico` file (256x256)
- Mac: `.icns` file
- Linux: `.png` file (512x512)

Place them in the `build/` folder and update `electron-builder.json`.

## Hosting the .exe for Download

After building, you can host your `.exe` file:

1. **GitHub Releases** (Recommended):
   - Go to your GitHub repo → Releases → Create new release
   - Upload the `.exe` file from `release/` folder
   - Users can download directly from the release page

2. **Your own server/CDN**:
   - Upload to any file hosting service
   - Link directly to the file

Then update the download button on your landing page to link to the hosted file.

## Need Help?

Contact support at: info.auradesk@gmail.com
