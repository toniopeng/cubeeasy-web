/** Public site URL helpers. Swap origin for cubeeasy.app without rewriting paths. */

export const DEFAULT_SITE_ORIGIN = 'https://toniopeng.github.io'

export function joinSiteRoot(origin: string, base: string): string {
  const host = (origin || DEFAULT_SITE_ORIGIN).replace(/\/$/, '')
  let path = base || '/'
  if (!path.startsWith('/')) path = `/${path}`
  if (path !== '/' && path.endsWith('/')) path = path.slice(0, -1)
  return path === '/' ? `${host}/` : `${host}${path}/`
}

