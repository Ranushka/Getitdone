import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { Toaster } from 'sonner'
import { trpc, createTRPCClient } from './lib/trpc'
import { routeTree } from './routeTree.gen'
import './lib/i18n'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
})
const trpcClient = createTRPCClient()
const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

const root = createRoot(document.getElementById('root')!)
root.render(
  <StrictMode>
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <Toaster richColors position="top-center" />
      </QueryClientProvider>
    </trpc.Provider>
  </StrictMode>,
)
