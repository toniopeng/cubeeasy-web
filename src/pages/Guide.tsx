import { GuideArticle } from '../seo/GuideArticle'
import { GUIDE_DESCRIPTION, GUIDE_TITLE } from '../seo/content'
import { usePageMeta } from '../seo/usePageMeta'

export function Guide() {
  usePageMeta('/guide', GUIDE_TITLE, GUIDE_DESCRIPTION)
  return (
    <div className="page guide-page">
      <GuideArticle level="page" />
    </div>
  )
}
