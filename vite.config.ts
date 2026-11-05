import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import {
  HOME_DESCRIPTION,
  HOME_TITLE,
  buildJsonLd,
  pageDescription,
  pageTitle,
  renderGuideHtml,
  robotsTxt,
  sitemapXml,
} from './src/seo/content.ts'
import { DEFAULT_SITE_ORIGIN, joinSiteRoot } from './src/seo/site.ts'

function pageVariant(homeHtml: string, root: string, path: string): string {
  const url = `${root}${path.slice(1)}`
  const title = pageTitle(path)
  const desc = pageDescription(path)
  return homeHtml
    .replaceAll(`<title>${HOME_TITLE}</title>`, `<title>${title}</title>`)
    .replaceAll(
      `<meta name="description" content="${HOME_DESCRIPTION}" />`,
      `<meta name="description" content="${desc}" />`,
    )
    .replaceAll(
      `<meta property="og:title" content="${HOME_TITLE}" />`,
      `<meta property="og:title" content="${title}" />`,
    )
    .replaceAll(
      `<meta property="og:description" content="${HOME_DESCRIPTION}" />`,
      `<meta property="og:description" content="${desc}" />`,
    )
    .replaceAll(`<meta property="og:url" content="${root}" />`, `<meta property="og:url" content="${url}" />`)
    .replaceAll(
      `<meta name="twitter:title" content="${HOME_TITLE}" />`,
      `<meta name="twitter:title" content="${title}" />`,
    )
    .replaceAll(
      `<meta name="twitter:description" content="${HOME_DESCRIPTION}" />`,
      `<meta name="twitter:description" content="${desc}" />`,
    )
    .replaceAll(`<link rel="canonical" href="${root}" />`, `<link rel="canonical" href="${url}" />`)
    .replaceAll(`<link rel="alternate" hreflang="en" href="${root}" />`, `<link rel="alternate" hreflang="en" href="${url}" />`)
    .replaceAll(
      `<link rel="alternate" hreflang="x-default" href="${root}" />`,
      `<link rel="alternate" hreflang="x-default" href="${url}" />`,
    )
}

function siteRootFromEnv(): string {
  const origin = process.env.VITE_SITE_ORIGIN || DEFAULT_SITE_ORIGIN
  const base = process.env.VITE_BASE || '/'
  return joinSiteRoot(origin, base)
}

/** Canonical, JSON-LD, robots, and sitemap. Origin swaps to cubeeasy.app via VITE_SITE_ORIGIN. */
function seoFiles(): Plugin {
  const root = siteRootFromEnv()
  return {
    name: 'cubeeasy-seo-files',
    transformIndexHtml(html) {
      const json = JSON.stringify(buildJsonLd(root)).replaceAll('<', '\\u003c')
      return html
        .replaceAll('__SITE_ROOT__', root)
        .replaceAll('__PAGE_TITLE__', HOME_TITLE)
        .replaceAll('__PAGE_DESC__', HOME_DESCRIPTION)
        .replaceAll('__JSON_LD__', json)
        .replaceAll('__NOSCRIPT_HTML__', renderGuideHtml(root))
    },
    closeBundle() {
      const out = resolve(process.cwd(), 'dist')
      const lastmod = new Date().toISOString().slice(0, 10)
      writeFileSync(resolve(out, 'robots.txt'), robotsTxt(root))
      writeFileSync(resolve(out, 'sitemap.xml'), sitemapXml(root, lastmod))
      const home = resolve(out, 'index.html')
      copyFileSync(home, resolve(out, '404.html'))
      // Real files so GitHub Pages returns 200 for these paths, not a soft 404.
      const homeHtml = readFileSync(home, 'utf8')
      for (const path of ['/guide', '/pricing', '/support', '/privacy', '/terms']) {
        const dir = resolve(out, path.slice(1))
        mkdirSync(dir, { recursive: true })
        writeFileSync(resolve(dir, 'index.html'), pageVariant(homeHtml, root, path))
      }
    },
  }
}

// Static export-friendly. Use '/' for a custom domain (cubeeasy.app);
// GitHub project pages override with VITE_BASE=/cubeeasy-web/.
export default defineConfig({
  plugins: [react(), seoFiles()],
  base: process.env.VITE_BASE || '/',
})
