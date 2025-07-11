// src/types/json.d.ts
// This file tells TypeScript that we can import .json files as modules.
// It's a global declaration needed for the dynamic imports in `i18n.ts`.
declare module "*.json" {
  const value: Record<string, string>;
  export default value;
}
