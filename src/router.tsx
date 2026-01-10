import { createRouter } from '@tanstack/react-router'
import { DefaultCatchBoundary } from './components/errors/Error'
import { NotFound } from './components/errors/NotFound'

// Import the generated route tree
import { routeTree } from './routeTree.gen'

// Create a new router instance
export function getRouter() {
  const router = createRouter({
    routeTree,
    defaultErrorComponent: DefaultCatchBoundary,
    defaultNotFoundComponent: () => <NotFound />,
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  })

  return router
}

// Also export as default for TanStack Start
export default getRouter
