import { Link, NavLink, Outlet } from 'react-router-dom'

export function Layout() {
  return (
    <div className="shell">
      <header className="topbar">
        <Link to="/" className="brand">
          <span className="brand-mark" aria-hidden />
          <span>CubeEasy</span>
        </Link>
        <nav className="nav">
          <NavLink to="/learn">Learn</NavLink>
          <NavLink to="/pricing">Pricing</NavLink>
          <NavLink to="/support">Support</NavLink>
        </nav>
        <Link className="btn btn-sm btn-primary" to="/learn">
          Start free
        </Link>
      </header>
      <main className="main">
        <Outlet />
      </main>
      <footer className="footer">
        <div>
          <strong>CubeEasy</strong> — beginner 3×3 tutor
        </div>
        <div className="footer-links">
          <Link to="/pricing">Pricing</Link>
          <Link to="/support">Support</Link>
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
        </div>
      </footer>
    </div>
  )
}
