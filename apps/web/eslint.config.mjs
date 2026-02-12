import { defineConfig } from "eslint/config";
import nextConfig from "eslint-config-next";

export default defineConfig([
  ...nextConfig,
  {
    plugins: {
      "react-compiler": require("eslint-plugin-react-compiler"),
    },
    rules: {
      "react-compiler/react-compiler": "error",
    },
  },
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "node_modules/**"
    ],
  },
]);
