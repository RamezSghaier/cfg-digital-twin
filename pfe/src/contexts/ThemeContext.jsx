import { createContext, useContext, useState, useEffect } from 'react'

const ThemeCtx = createContext({ isDark: true, toggleTheme: () => {} })

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('cfg_theme')
    return saved ? saved === 'dark' : true
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
  }, [isDark])

  function toggleTheme() {
    setIsDark(d => {
      localStorage.setItem('cfg_theme', d ? 'light' : 'dark')
      return !d
    })
  }

  return <ThemeCtx.Provider value={{ isDark, toggleTheme }}>{children}</ThemeCtx.Provider>
}

export const useTheme = () => useContext(ThemeCtx)
