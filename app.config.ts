import type { ConfigContext, ExpoConfig } from 'expo/config';

// EAS sets APP_VARIANT via each build profile's "env" in eas.json. Only the
// "development" profile sets it, so preview/production (and any local run
// without it set) fall through to the normal production identity below.
const IS_DEV = process.env.APP_VARIANT === 'development';

// Dev-client builds need their own Android package id so they install as a
// separate app alongside a production build.
export default ({ config }: ConfigContext): ExpoConfig => {
  // `config` (app.json's contents) is typed as Partial<ExpoConfig> by Expo,
  // even though every required field is actually present here — cast once
  // rather than non-null-asserting each field below.
  const base = config as ExpoConfig;
  return {
    ...base,
    name: IS_DEV ? 'Tourney Tracker (Dev)' : base.name,
    android: {
      ...base.android,
      package: IS_DEV ? `${base.android!.package}.dev` : base.android!.package!,
    },
  };
};
