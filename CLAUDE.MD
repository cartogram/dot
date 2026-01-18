# Distance Over Time - Project Documentation

## Project Overview

This is a React application built with TanStack Start (React Router), TypeScript, and shadcn/ui components. The project is called "distance-over-time" and appears to be a template/starter project with modern React tooling.

## Tech Stack

### Core Framework

- **React 19.2.0** - Latest React with concurrent features
- **TypeScript 5.7.2** - Type-safe development
- **Vite 7.1.7** - Fast build tool and dev server
- **TanStack Start 1.132.0** - Full-stack React framework with file-based routing

### Routing & State

- **@tanstack/react-router 1.132.0** - Type-safe routing
- **@tanstack/react-start** - SSR and full-stack capabilities
- **@tanstack/react-router-ssr-query** - SSR query integration

### UI & Styling

- **Tailwind CSS 4.0.6** - Utility-first CSS framework
- **shadcn/ui** - High-quality, accessible component library built on Base UI
- **@base-ui/react 1.0.0** - Unstyled accessible components
- **class-variance-authority** - Component variant management
- **clsx & tailwind-merge** - Conditional className utilities
- **@tabler/icons-react** - Icon library
- **@fontsource-variable/inter** - Inter font family

### Development Tools

- **Vitest 3.0.5** - Unit testing framework
- **@testing-library/react 16.2.0** - React testing utilities
- **ESLint** - Code linting
- **Prettier 3.5.3** - Code formatting
- **@tanstack/react-devtools** - React debugging tools
- **@tanstack/react-router-devtools** - Router debugging

### Backend

- **Nitro (latest)** - Universal server framework

## Project Structure

```
distance-over-time/
├── src/
│   ├── components/
│   │   ├── ui/           # shadcn/ui components
│   │   │   ├── alert-dialog.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── combobox.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── field.tsx
│   │   │   ├── input.tsx
│   │   │   ├── input-group.tsx
│   │   │   ├── label.tsx
│   │   │   ├── select.tsx
│   │   │   ├── separator.tsx
│   │   │   └── textarea.tsx
│   │   ├── component-example.tsx
│   │   └── example.tsx
│   ├── routes/
│   │   └── index.tsx     # Home page route
│   ├── lib/
│   │   └── utils.ts      # Utility functions (cn, etc.)
│   └── styles.css        # Global styles and Tailwind imports
├── public/               # Static assets
├── components.json       # shadcn/ui configuration
├── package.json
├── tsconfig.json
├── vite.config.ts
├── eslint.config.js
├── prettier.config.js
└── README.md
```

## Available Scripts

```bash
# Development
pnpm dev          # Start dev server on port 3000

# Building
pnpm build        # Build for production
pnpm preview      # Preview production build

# Testing
pnpm test         # Run Vitest tests

# Code Quality
pnpm lint         # Run ESLint
pnpm format       # Run Prettier
pnpm check        # Format with Prettier and fix ESLint issues
```

## Development Guidelines

### Adding New Components

1. **shadcn/ui components**: Use the shadcn CLI to add new components

   ```bash
   npx shadcn@latest add [component-name]
   ```

2. **Custom components**: Place in `src/components/` directory

### Routing

This project uses TanStack Router with file-based routing:

- Routes are defined in `src/routes/`
- Each route exports a `Route` object created with `createFileRoute()`
- Example: `src/routes/index.tsx` is the home page at `/`

### Styling

- Uses Tailwind CSS 4.0 with Vite plugin
- Global styles in `src/styles.css`
- Component variants managed with `class-variance-authority`
- Utility function `cn()` from `src/lib/utils.ts` for merging classes

### TypeScript

- Strict TypeScript configuration
- Type checking integrated with build process
- All components should be properly typed

### Testing

- Vitest for unit tests
- React Testing Library for component tests
- jsdom environment for DOM testing

## Current State

Based on git status, recent work includes:

- Setting up shadcn/ui components (added multiple UI components)
- Configuring components.json for shadcn/ui
- Creating example components
- Updating dependencies (package.json, pnpm-lock.yaml)
- Styling updates (src/styles.css)
- Route modifications (src/routes/index.tsx)

## Key Files

- **src/routes/index.tsx** - Main entry point rendering `ComponentExample`
- **src/lib/utils.ts** - Utility functions including the `cn()` helper
- **components.json** - shadcn/ui configuration
- **vite.config.ts** - Vite and plugin configuration
- **tsconfig.json** - TypeScript compiler options

## Notes for AI Assistants

- This is a modern React setup with the latest versions (React 19, Vite 7, Tailwind 4)
- File-based routing through TanStack Router
- UI components from shadcn/ui built on Base UI (unstyled, accessible primitives)
- Full-stack capabilities with TanStack Start and Nitro
- Prefer using existing shadcn/ui components when building UI
- Follow the project's TypeScript strict mode conventions
- Use the `cn()` utility for conditional className merging
