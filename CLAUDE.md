# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Posu API — a personal finance REST API built with Express + TypeScript + Prisma (SQLite). Manages wallets, transactions, labels, goals, and projects for authenticated users.

## Commands

- `npm run dev` — start dev server with nodemon (port 8080)
- `npm run migrate:dev` — run Prisma migrations
- `npm run studio` — open Prisma Studio to inspect DB
- `npm run format` — format with Prettier
- `npm run gen:client` — regenerate TypeScript client & OpenAPI docs from `docs/api.yml` (auto-commits)

## Setup

1. `npm install`
2. Create `prisma/dev.db` (empty file)
3. Copy `.env.tempate` to `.env` and set `JWT_SECRET`
4. `npm run migrate:dev`

## Architecture

Layered architecture with path aliases (`@` → `./src`, `@docs` → `./docs`, `@clients` → `./clients`):

- **routes/** — Express route definitions, each resource in its own file
- **controllers/** — Request handlers, extract params and call services
- **services/** — Business logic, interact with Prisma client
- **mappers/** — Transform Prisma models to API response shapes
- **middlewares/** — Auth (`security-middleware`), pagination, error handling
- **validator/** — Request validation (uses Zod)
- **errors/** — Custom error classes extending `ApiError` (BadRequest, NotFound, Forbidden, Unauthorized, InternalServer)
- **types/** — Shared TypeScript types

Auth uses JWT (Bearer token). All resource routes are scoped to the authenticated user's `accountId`.

## API Spec

The OpenAPI spec lives in `docs/api.yml`. After modifying it, run `npm run gen:client` to regenerate `clients/` (TypeScript fetch client) and `docs/openapi.json`. Swagger UI is served at `/api-docs`.

## Database

SQLite via Prisma. Schema at `prisma/schema.prisma`. Key models: Account, Wallet, Transaction, Label, Goal, Project, ProjectTransaction. All entities link to Account via `accountId`.
