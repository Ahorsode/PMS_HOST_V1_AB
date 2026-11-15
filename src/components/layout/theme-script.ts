/** localStorage key for the dashboard theme ("light" or "dark"). */
export const THEME_KEY = 'pl-theme'

/**
 * Runs in <head> before the first paint so a dashboard page never flashes the
 * wrong theme. Only /dashboard opts into light; every other page stays dark.
 */
export const NO_FLASH_SCRIPT = `(function(){try{if(location.pathname.indexOf('/dashboard')!==0)return;var t=localStorage.getItem('${THEME_KEY}');if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'}document.documentElement.dataset.theme=t}catch(e){}})()`
