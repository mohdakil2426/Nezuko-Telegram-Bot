# 15. Configuration & Environment Management

## 15.1 TypeScript Configuration

**RULE:** Use `tsconfig.json` with strict settings and path aliases.

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/types/*": ["./src/types/*"],
      "@/hooks/*": ["./src/hooks/*"]
    },
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "types": ["node", "jest", "@testing-library/jest-dom"]
  },
  "include": ["src/**/*", "next-env.d.ts"],
  "exclude": ["node_modules", "dist", ".next"]
}
```

## 15.2 ESLint Configuration

**RULE:** Use eslint-config-next with strict rules. Enable all recommended checks.

**.eslintrc.json:**
```json
{
  "extends": [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/strict"
  ],
  "rules": {
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "prefer-const": "error",
    "eqeqeq": ["error", "always"],
    "no-var": "error"
  }
}
```

## 15.3 Next.js Configuration

**next.config.js:**
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Strict mode - catches common mistakes during development
  reactStrictMode: true,
  
  // Optimize fonts
  optimizeFonts: true,
  
  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'example.com',
      },
    ],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
  
  // Content Security Policy
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data: https:;",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

## 15.4 Environment Variables

**.env.local (server secrets - never commit):**
```
DATABASE_URL=postgresql://...
API_SECRET=secret...
JWT_SECRET=secret...
STRIPE_SECRET_KEY=sk_...
```

**.env.example (template - safe to commit):**
```
DATABASE_URL=
API_SECRET=
JWT_SECRET=
STRIPE_SECRET_KEY=
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=
```

**.env.production (production secrets - set in CI/CD):**
```
# Set securely in CI/CD environment (Vercel, GitHub Secrets, etc.)
```

**.env.public (safe for client):**
```
NEXT_PUBLIC_API_URL=https://api.example.com
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_...
NEXT_PUBLIC_ANALYTICS_ID=gtag-...
```

---

[← Back to Forbidden Patterns](./15-forbidden-patterns.md) | [Back to Overview →](./01-overview.md)

---

**END OF RULEBOOK**

This rulebook is comprehensive, production-grade, and based on the latest official documentation for Next.js 16, React 19, TypeScript 5.9, and all listed technologies at January 2026. Use this as your AI coding standard and reference.
