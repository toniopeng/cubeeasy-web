import { useEffect } from 'react'
import { absoluteUrl } from './url'

function setMeta(name: string, content: string, attr: 'name' | 'property' = 'name') {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, name)
    document.head.appendChild(el)
  }
  el.content = content
}

function setLink(rel: string, href: string, hreflang?: string) {
  const selector = hreflang
    ? `link[rel="${rel}"][hreflang="${hreflang}"]`
    : `link[rel="${rel}"]:not([hreflang])`
  let el = document.head.querySelector<HTMLLinkElement>(selector)
  if (!el) {
    el = document.createElement('link')
    el.rel = rel
    if (hreflang) el.hreflang = hreflang
    document.head.appendChild(el)
  }
  el.href = href
}

/** Keep title, description, canonical, and social tags in sync with the route. */
export function usePageMeta(path: string, title: string, description: string) {
  useEffect(() => {
    const url = absoluteUrl(path)
    document.title = title
    document.documentElement.lang = 'en'
    setMeta('description', description)
    setMeta('og:title', title, 'property')
    setMeta('og:description', description, 'property')
    setMeta('og:url', url, 'property')
    setMeta('twitter:title', title)
    setMeta('twitter:description', description)
    setLink('canonical', url)
    setLink('alternate', url, 'en')
    setLink('alternate', url, 'x-default')
  }, [path, title, description])
}
