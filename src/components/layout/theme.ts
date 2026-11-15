'use client'

import { useEffect, useState } from 'react'
import { THEME_KEY } from './theme-script'

/** Light or dark for the dashboard. Public pages, sign-in and admin always stay dark. */
export type Theme = 'light' | 'dark'

const EVENT = 'pl-theme-change'

function systemTheme(): Theme {
  try {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

export function storedTheme(): Theme {
  try {
    const value = window.localStorage.getItem(THEME_KEY)
    if (value === 'light' || value === 'dark') return value
  } catch {}
  return systemTheme()
}

function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  window.dispatchEvent(new CustomEvent(EVENT, { detail: theme }))
}

/** Applies the saved (or system) theme to the dashboard; the returned function clears it on the way out. */
export function enterDashboardTheme() {
  setTheme(storedTheme())
  return () => {
    delete document.documentElement.dataset.theme
  }
}

export function useTheme() {
  const [theme, setState] = useState<Theme>('dark')

  useEffect(() => {
    setState(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark')
    const onChange = (event: Event) => setState((event as CustomEvent<Theme>).detail)
    window.addEventListener(EVENT, onChange)
    return () => window.removeEventListener(EVENT, onChange)
  }, [])

  const toggle = () => {
    const next: Theme = theme === 'light' ? 'dark' : 'light'
    try {
      window.localStorage.setItem(THEME_KEY, next)
    } catch {}
    setTheme(next)
  }

  return { theme, toggle }
}
