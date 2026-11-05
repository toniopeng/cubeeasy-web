import { DEFAULT_SITE_ORIGIN, joinSiteRoot } from './site'

function siteRoot(): string {
  const fromEnv = import.meta.env.VITE_SITE_ORIGIN as string | undefined
  const origin = (fromEnv || DEFAULT_SITE_ORIGIN).replace(/\/$/, '')
  return joinSiteRoot(origin, import.meta.env.BASE_URL || '/')
}

/** Absolute URL for a router path such as "/" or "/guide". */
export function absoluteUrl(path: string): string {
  const root = siteRoot()
  if (path === '/' || path === '') return root
  const suffix = path.startsWith('/') ? path.slice(1) : path
  return `${root}${suffix}`
}
