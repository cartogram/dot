import { useState, useEffect } from 'react'
import { useTheme } from "@/components/shared/providers/ThemeProvider"

import { Button } from '@/components/shared/ui/button'
import { IconMoon, IconSun } from '@/components/shared/ui/icons'

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <Button
      onClick={() => {
        setTheme(theme === 'light' ? 'dark' : 'light')
      }}
    >
      {!theme ? null : theme === 'dark' ? (
        <IconMoon className="Icon" />
      ) : (
        <IconSun className="Icon" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
