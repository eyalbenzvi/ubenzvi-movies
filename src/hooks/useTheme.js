import { useEffect } from 'react'
import { useLocalStorage } from '../lib/storage.js'

/** 'dark' (default, cinematic) | 'light'. Applied as a class on <html>. */
export function useTheme() {
  const [theme, setTheme] = useLocalStorage('theme', 'dark')
  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#120e0b' : '#faf7f2')
  }, [theme])
  return [theme, () => setTheme(theme === 'dark' ? 'light' : 'dark')]
}
