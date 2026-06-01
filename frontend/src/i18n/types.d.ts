import "i18next";

import type common from "./locales/en/common.json";
import type auth from "./locales/en/auth.json";
import type apps from "./locales/en/apps.json";
import type tokens from "./locales/en/tokens.json";
import type users from "./locales/en/users.json";
import type errors from "./locales/en/errors.json";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "common";
    resources: {
      common: typeof common;
      auth: typeof auth;
      apps: typeof apps;
      tokens: typeof tokens;
      users: typeof users;
      errors: typeof errors;
    };
  }
}
