import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'

export function Layout() {
  const { pathname } = useLocation()
  const lessonMode = pathname === '/' || pathname === '/learn'
  return (
    <div className={`shell ${lessonMode ? 'lesson-mode' : ''}`}>
      {!lessonMode && (
        <header className="topbar">
          <Link to="/" className="brand">
            <span className="brand-mark" aria-hidden />
            <span>CubeEasy</span>
          </Link>
          <nav className="nav">
            <NavLink to="/">Learn</NavLink>
            <NavLink to="/guide">Guide</NavLink>
            <NavLink to="/pricing">Pricing</NavLink>
            <NavLink to="/support">Support</NavLink>
          </nav>
        </header>
      )}
      <main className="main">
        <Outlet />
      </main>
      {!lessonMode && (
        <footer className="footer">
          <div>
            <strong>CubeEasy</strong> — beginner 3×3 tutor
          </div>
          <div className="footer-links">
            <Link to="/guide">Guide</Link>
            <Link to="/pricing">Pricing</Link>
            <Link to="/support">Support</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
          </div>
        </footer>
      )}
    </div>
  )
}
