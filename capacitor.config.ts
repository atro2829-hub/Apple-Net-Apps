import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.applenet.app',
  appName: 'Apple.NET',
  webDir: 'out',
  server: {
    androidScheme: 'https',
    cleartext: false,
  },
  android: {
    buildOptions: {
      keystorePath: '../keystore/apple-net-2026.keystore',
      keystoreAlias: 'applenet',
      keystorePassword: 'applenet2026',
      keystoreAliasPassword: 'applenet2026',
    },
    backgroundColor: '#1B7A3D',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#1B7A3D',
      sound: 'default',
    },
    Haptics: {},
    Filesystem: {
      directory: 'Documents',
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#1B7A3D',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    BiometricAuth: {
      iosKeychainAccessGroup: 'com.applenet.app',
    },
  },
};

export default config;
