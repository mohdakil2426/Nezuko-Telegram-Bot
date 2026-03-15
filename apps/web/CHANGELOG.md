# Changelog

## 1.0.0 (2026-03-15)


### ⚠ BREAKING CHANGES

* **web:** Removed premium UI features (11 themes, Framer Motion animations, Supabase auth)

### ✨ Features

* **analytics:** add api-calls trend chart and standardize period selectors ([fe651ce](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/commit/fe651ced980c99e5e1012625f7088d296de17a76))
* **auth:** remove email whitelist and enable open registration ([a714c79](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/commit/a714c799467190f5ef0005bc432c719309f2dd69))
* **cli:** harden powershell scripts and fix process termination ([28dba76](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/commit/28dba7653c49490e72f4209829a85de8e8f800c5))
* make deployment-ready for Koyeb ([a141eb3](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/commit/a141eb3c7af7c2b38e9e65df19f3a78555f97ac4))
* **realtime:** speed up verification enforcement and centralize dashboard live updates ([cf17a09](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/commit/cf17a09021bbe6bb92e4e7a5a7297fabd82b9a1e))
* **web/auth:** implement full auth lifecycle and harden route protection ([c01b475](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/commit/c01b4752d2013a94c2c168d81d5f8af40629e613))
* **web:** implement frontend expert audit & high-performance architecture ([9735c21](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/commit/9735c215e13dce42b67f70bb68d7901c63ebd1a1))
* **web:** integrate @insforge/nextjs authentication (Task 5) ([4e5bb8d](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/commit/4e5bb8dbcc7c4473e2c4a5072104f12c4f2b3483))


### 🐛 Bug Fixes

* **analytics,bot-core:** resolve chart data discrepancy and bot logging stall ([6fe1c87](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/commit/6fe1c87144f5ba255da3e926a279decd2bc95b49))
* **ci:** upgrade to actions/checkout@v5 + cache@v5 (Node 24 runtime); fix prettier CRLF issues in web src ([8f95fce](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/commit/8f95fce44affdd38bbd423ef6b85118c6f8627a6))
* **grammy:** restore first-message verification flow and harden runner liveness supervision ([ad42a09](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/commit/ad42a09e4d2fa03d8b2cfbb0379570b710b2225b))
* harden vault and bot management flows, repair analytics validation, and stabilize dev auth/settings ([63cbc5c](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/commit/63cbc5c66dacc4d56d24a06bb7b9f935ece25013))
* resolve 163 codebase audit findings — security, performance, dead code ([731bae8](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/commit/731bae8fd1a4a357c59dde5b6eff9155e793e67f))
* **security:** address all critical and high audit findings (v5) ([b80eb5f](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/commit/b80eb5f849ba40f4849addb117a17b6d2312bab7))
* **web:** automated session sync and admin bootstrap for OAuth login ([d938b24](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/commit/d938b24e291b486e6e175a5ca9cafe90216713e3))
* **web:** harden auth flow, restrict dashboard access, and add admin-scoped RLS ([366c5ae](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/commit/366c5ae068c92c939ac56fdf333dba87dc40636d))
* **web:** pass server-side auth session as initialState to prevent CSRF 403 on OAuth callback ([8f088f1](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/commit/8f088f18923bb5f5c67ed251abbc4ba444cf39f8))
* **web:** prevent login loop by clearing client session on sync failure and sanitizing URL ([dd3fb14](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/commit/dd3fb148ed5cd12b21727d7640e482f395e4b921))
* **web:** resolve 104 UI/UX audit findings across 7 dimensions ([ff8915c](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/commit/ff8915c05a05e68879dd16b00be10ccc86e26643))
* **web:** resolve 42 chart audit issues — tabs, a11y, mobile, empty states ([556531e](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/commit/556531e23929f23381ffebbfe1f065ffbebfddf7))
* **web:** resolve InsForge OAuth login loop in proxy callback flow ([73e5c80](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/commit/73e5c80d27804bdbbd4b0417e4eca8437462bd0a))
* **web:** stop proxy from redirecting /login to hosted sign-up ([33deedc](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/commit/33deedc66814a24d108071b300a78085d070fcc7))


### ⚡ Performance

* **web:** optimize bundle size and resolve health check warnings ([61aed64](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/commit/61aed6464539c0965170aa3ee5e27479bfbbb378))
* **web:** optimize Vercel costs and implement Next.js 16 PPR ([5882505](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/commit/58825053f9ef4c6820106eea1b36d69d6b09b47a))


### ♻ Refactors

* **web:** dashboard optimization, react compiler compatibility & dead code pruning ([1c729a6](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/commit/1c729a61d951ead4621ee26473c0b3102aa3b09b))
* **web:** replace custom premium UI with pure shadcn/ui dashboard ([8468a00](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/commit/8468a009e2efed6a4ff902e176360ed39d7b5c50))
