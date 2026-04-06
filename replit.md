# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## PE Gradebook App (`artifacts/pe-gradebook`)

- **Framework**: Expo (React Native) with Expo Router v3, file-based routing
- **State**: `GradebookContext` (AsyncStorage key `pe_gb_mobile_v1`) + `SettingsContext` (AsyncStorage key `pe_gb_settings_v1`)
- **Grading**: `utils/grading.ts` — `calcScore(mileTime, ttb, gradingConfig)`, `getSpecial(mileTime, gradingConfig)`, `GradingConfig` type
- **Settings**: `SettingsContext` wraps `GradebookProvider`; grading thresholds (tier90MaxSecs, tier80MaxSecs, threshold65Secs, threshold50Secs) and special code labels (mu/med/abs/exc) are fully customizable and persisted
- **Tabs**: Gradebook (index), Quick Reference, Settings
- **Export**: CSV + Excel (SheetJS `xlsx`) using expo-sharing; excel export uses `expo-file-system/legacy`
- **Special codes**: MU / MED / ABS / EXC entered in Mile Time field; labels customizable via Settings
- **ID generation**: `Date.now()` + counter, no uuid dependency

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
