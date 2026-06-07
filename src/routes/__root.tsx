import { useEffect, useState } from 'react'
import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import appCss from '../styles.css?url'
import { AuthProvider } from '@/lib/auth/AuthContext'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { Header } from '@/components/layout/Header'
import { Page } from '@/components/layout/Page'
import { Main } from '@/components/layout/Main'
import { Logo } from '@/components/layout/Logo'
import { getCurrentUser } from '@/lib/server/auth'

export const Route = createRootRoute({
  beforeLoad: async () => {
    const user = await getCurrentUser()

    return { user }
  },
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1, maximum-scale=1',
      },
      {
        title: 'Distance Over Time',
      },
      {
        name: 'description',
        content:
          'Distance Over Time is a platform for tracking your activities and sharing them with your friends.',
      },
      {
        name: 'theme-color',
        content: '#000000',
      },
      {
        name: 'apple-mobile-web-app-capable',
        content: 'yes',
      },
      {
        name: 'apple-mobile-web-app-status-bar-style',
        content: 'black-translucent',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
      {
        rel: 'manifest',
        href: '/manifest.json',
      },
      {
        rel: 'apple-touch-icon',
        href: '/apple-touch-icon.png',
      },
    ],
  }),

  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
    }
  }, [])

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: 'window.Buffer = window.Buffer || { from: () => ({}) };',
          }}
        />
        <HeadContent />
      </head>
      <body>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <AuthProvider>
              <Page>
                <Logo />
                <Header />

                <Main>{children}</Main>
                {/* <Footer /> */}
              </Page>
            </AuthProvider>
            <TanStackDevtools
              config={{
                position: 'bottom-right',
              }}
              plugins={[
                {
                  name: 'Tanstack Router',
                  render: <TanStackRouterDevtoolsPanel />,
                },
              ]}
            />
            <Scripts />
          </ThemeProvider>
        </QueryClientProvider>
      </body>
    </html>
  )
}

function Footer() {
  return (
    <footer style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p className="heading--4">
        made by <a href="https://cartogram.ca">Cartogram</a>
      </p>
    </footer>
  )
}