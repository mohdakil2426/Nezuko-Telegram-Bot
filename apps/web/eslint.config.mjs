import { defineConfig } from "eslint/config";
import nextConfig from "eslint-config-next";
import reactCompiler from "eslint-plugin-react-compiler";

export default defineConfig([
  ...nextConfig,
  {
    plugins: {
      "react-compiler": reactCompiler,
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
