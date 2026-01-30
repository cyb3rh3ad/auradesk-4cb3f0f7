import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';

interface GitHubRelease {
  tag_name: string;
  name: string;
  body: string;
  html_url: string;
  published_at: string;
  assets: {
    name: string;
    browser_download_url: string;
  }[];
}

interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
  releaseNotes: string;
  downloadUrl: string;
  releaseUrl: string;
  publishedAt: string;
}

// Current app version - update this with each release
const CURRENT_VERSION = '1.0.0';

// GitHub repo info - UPDATE THESE WITH YOUR ACTUAL VALUES
// After exporting to GitHub, update these with your repo details
const GITHUB_OWNER = 'YOUR_GITHUB_USERNAME'; // e.g., 'john-doe'
const GITHUB_REPO = 'YOUR_REPO_NAME'; // e.g., 'auradesk-app'

export const useAppUpdate = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const parseVersion = (version: string): number[] => {
    // Remove 'v' prefix and any suffix like '-android'
    const cleanVersion = version.replace(/^v/, '').replace(/-.*$/, '');
    return cleanVersion.split('.').map(n => parseInt(n, 10) || 0);
  };

  const isNewerVersion = (latest: string, current: string): boolean => {
    const latestParts = parseVersion(latest);
    const currentParts = parseVersion(current);
    
    for (let i = 0; i < Math.max(latestParts.length, currentParts.length); i++) {
      const latestPart = latestParts[i] || 0;
      const currentPart = currentParts[i] || 0;
      
      if (latestPart > currentPart) return true;
      if (latestPart < currentPart) return false;
    }
    
    return false;
  };

  const checkForUpdates = useCallback(async (): Promise<UpdateInfo | null> => {
    // Only check on native platforms
    if (!Capacitor.isNativePlatform()) {
      return null;
    }

    setIsChecking(true);

    try {
      const response = await fetch(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases`,
        {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch releases');
      }

      const releases: GitHubRelease[] = await response.json();
      
      // Find the latest Android release
      const androidRelease = releases.find(release => 
        release.tag_name.includes('android') || 
        release.assets.some(asset => asset.name.endsWith('.apk'))
      );

      if (!androidRelease) {
        setLastChecked(new Date());
        setIsChecking(false);
        return null;
      }

      // Find APK asset
      const apkAsset = androidRelease.assets.find(asset => 
        asset.name.endsWith('.apk')
      );

      if (!apkAsset) {
        setLastChecked(new Date());
        setIsChecking(false);
        return null;
      }

      const latestVersion = androidRelease.tag_name;
      
      if (isNewerVersion(latestVersion, CURRENT_VERSION)) {
        const info: UpdateInfo = {
          currentVersion: CURRENT_VERSION,
          latestVersion,
          releaseNotes: androidRelease.body || 'Bug fixes and improvements',
          downloadUrl: apkAsset.browser_download_url,
          releaseUrl: androidRelease.html_url,
          publishedAt: androidRelease.published_at,
        };
        
        setUpdateInfo(info);
        setUpdateAvailable(true);
        setLastChecked(new Date());
        setIsChecking(false);
        return info;
      }

      setLastChecked(new Date());
      setIsChecking(false);
      return null;
    } catch (error) {
      console.error('Error checking for updates:', error);
      setIsChecking(false);
      return null;
    }
  }, []);

  const dismissUpdate = useCallback(() => {
    setUpdateAvailable(false);
    // Store dismissed version in localStorage to not prompt again for same version
    if (updateInfo) {
      localStorage.setItem('dismissedUpdateVersion', updateInfo.latestVersion);
    }
  }, [updateInfo]);

  const openDownload = useCallback(() => {
    if (updateInfo?.downloadUrl) {
      window.open(updateInfo.downloadUrl, '_blank');
    }
  }, [updateInfo]);

  // Check for updates on mount (native only)
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      // Delay check to not block app startup
      const timer = setTimeout(() => {
        checkForUpdates();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [checkForUpdates]);

  return {
    updateAvailable,
    updateInfo,
    isChecking,
    lastChecked,
    checkForUpdates,
    dismissUpdate,
    openDownload,
  };
};
