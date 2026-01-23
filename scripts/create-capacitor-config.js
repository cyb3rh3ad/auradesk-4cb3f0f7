const fs = require('fs');

const config = {
  appId: "app.lovable.fc4bd383e19d4e41b174125d10b92719",
  appName: "AuraDesk",
  webDir: "dist",
  ios: {
    contentInset: "automatic"
  },
  android: {
    allowMixedContent: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      launchFadeOutDuration: 500,
      backgroundColor: "#0a0a0f",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    }
  }
};

fs.writeFileSync('capacitor.config.json', JSON.stringify(config, null, 2));
console.log('Created capacitor.config.json for production build');
