# Changelog

## [1.1.0](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/compare/nezuko-grammy-v1.0.0...nezuko-grammy-v1.1.0) (2026-03-16)


### ✨ Features

* **cli:** harden powershell scripts and fix process termination ([28dba76](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/commit/28dba7653c49490e72f4209829a85de8e8f800c5))
* **grammy:** complete grammY TypeScript bot rebuild ([3162377](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/commit/31623776ebbc70f6d0e2fdb472ff5d49fa1b4194))
* **grammy:** Phase 116 — latency gap fixes + dashboard runner self-healing ([b49aeff](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/commit/b49aeff55fe12bc642787762e34b7e2ebc8a70b3))
* **grammy:** Phase 121 — integrate Throttler, Autoquote, Menu & Conversations plugins ([82255e6](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/commit/82255e67d64c0cd3f283b4bb63944419d366cfe7))
* **realtime:** speed up verification enforcement and centralize dashboard live updates ([cf17a09](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/commit/cf17a09021bbe6bb92e4e7a5a7297fabd82b9a1e))


### 🐛 Bug Fixes

* **analytics,bot-core:** resolve chart data discrepancy and bot logging stall ([6fe1c87](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/commit/6fe1c87144f5ba255da3e926a279decd2bc95b49))
* **bot:** add apikey header to InsForge REST client for RLS bypass ([ebf24b1](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/commit/ebf24b19cd4e9e26814197b5497b2b714c6fb4dd))
* **grammy:** delay verification prompts and delete burst spam reliably ([1d9c042](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/commit/1d9c0421d02c0456f4c99f2df3684d6b7e2a3fc2))
* **grammy:** restore first-message verification flow and harden runner liveness supervision ([ad42a09](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/commit/ad42a09e4d2fa03d8b2cfbb0379570b710b2225b))
* **grammy:** serialize bot lifecycle recovery to prevent duplicate runner restarts and verify-click stalls ([4b84f14](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/commit/4b84f146507fd57ca8e8ca7100dad04b1b1b36cc))
* **grammy:** upgrade Docker bun image from 1.2 to latest ([545a0c9](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/commit/545a0c96ff78f63f986895815cdf24a8c346dbc7))
* harden vault and bot management flows, repair analytics validation, and stabilize dev auth/settings ([63cbc5c](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/commit/63cbc5c66dacc4d56d24a06bb7b9f935ece25013))
* knip issues and CI Node.js 20 deprecation warnings ([e2fcc05](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/commit/e2fcc05ab1fa5c63b0881856b1ab79a6823a17d3))


### ⚡ Performance

* **web:** optimize bundle size and resolve health check warnings ([61aed64](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/commit/61aed6464539c0965170aa3ee5e27479bfbbb378))


### ♻ Refactors

* **grammy:** harden bot reliability, security, and commands ([d6d8c36](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/commit/d6d8c3679d102d293de93c152f02444ac8a8f431))
* **grammy:** move tests into apps/grammy for full package isolation ([09b3407](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/commit/09b3407fa382c891700bad94cc7f8aba9a5e781b))
* **grammy:** move tests into apps/grammy for full package isolation ([18ac660](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/commit/18ac660df267e1f70514e62f33ca91a0471aedf2))
* **web:** dashboard optimization, react compiler compatibility & dead code pruning ([1c729a6](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/commit/1c729a61d951ead4621ee26473c0b3102aa3b09b))

## 1.0.0 (2026-03-15)


### ✨ Features

* **cli:** harden powershell scripts and fix process termination ([28dba76](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/commit/28dba7653c49490e72f4209829a85de8e8f800c5))
* **grammy:** complete grammY TypeScript bot rebuild ([3162377](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/commit/31623776ebbc70f6d0e2fdb472ff5d49fa1b4194))
* **grammy:** Phase 116 — latency gap fixes + dashboard runner self-healing ([b49aeff](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/commit/b49aeff55fe12bc642787762e34b7e2ebc8a70b3))
* **grammy:** Phase 121 — integrate Throttler, Autoquote, Menu & Conversations plugins ([82255e6](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/commit/82255e67d64c0cd3f283b4bb63944419d366cfe7))
* **realtime:** speed up verification enforcement and centralize dashboard live updates ([cf17a09](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/commit/cf17a09021bbe6bb92e4e7a5a7297fabd82b9a1e))


### 🐛 Bug Fixes

* **analytics,bot-core:** resolve chart data discrepancy and bot logging stall ([6fe1c87](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/commit/6fe1c87144f5ba255da3e926a279decd2bc95b49))
* **bot:** add apikey header to InsForge REST client for RLS bypass ([ebf24b1](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/commit/ebf24b19cd4e9e26814197b5497b2b714c6fb4dd))
* **grammy:** delay verification prompts and delete burst spam reliably ([1d9c042](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/commit/1d9c0421d02c0456f4c99f2df3684d6b7e2a3fc2))
* **grammy:** restore first-message verification flow and harden runner liveness supervision ([ad42a09](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/commit/ad42a09e4d2fa03d8b2cfbb0379570b710b2225b))
* **grammy:** serialize bot lifecycle recovery to prevent duplicate runner restarts and verify-click stalls ([4b84f14](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/commit/4b84f146507fd57ca8e8ca7100dad04b1b1b36cc))
* harden vault and bot management flows, repair analytics validation, and stabilize dev auth/settings ([63cbc5c](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/commit/63cbc5c66dacc4d56d24a06bb7b9f935ece25013))
* knip issues and CI Node.js 20 deprecation warnings ([e2fcc05](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/commit/e2fcc05ab1fa5c63b0881856b1ab79a6823a17d3))


### ⚡ Performance

* **web:** optimize bundle size and resolve health check warnings ([61aed64](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/commit/61aed6464539c0965170aa3ee5e27479bfbbb378))


### ♻ Refactors

* **grammy:** harden bot reliability, security, and commands ([d6d8c36](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/commit/d6d8c3679d102d293de93c152f02444ac8a8f431))
* **web:** dashboard optimization, react compiler compatibility & dead code pruning ([1c729a6](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/commit/1c729a61d951ead4621ee26473c0b3102aa3b09b))
