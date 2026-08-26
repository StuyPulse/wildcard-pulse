import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

const config = [...nextVitals, ...nextTypeScript, {
  rules: {
    // Existing server-rendered pages use untyped relation results. Keep those
    // visible while allowing the new lint baseline to run in CI.
    "@typescript-eslint/no-explicit-any": "warn",
  },
}];

export default config;
