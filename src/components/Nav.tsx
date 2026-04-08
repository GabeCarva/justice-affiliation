import { Link, useLocation } from 'react-router-dom'

const links = [
  { to: '/', label: 'Dashboard' },
  { to: '/blog', label: 'Analysis' },
  { to: '/methodology', label: 'Methodology' },
  { to: '/verify', label: 'Verify Scores' },
  { to: '/doctrines', label: 'Doctrines' },
  { to: '/priors', label: 'Stated Positions' },
  { to: '/predict', label: 'Predictions' },
]

export function Nav() {
  const { pathname } = useLocation()
  return (
    <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="font-serif text-xl font-semibold tracking-tight">
          SCOTUS Partisan Index
        </Link>
        <nav className="hidden md:flex gap-6 text-sm">
          {links.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={
                pathname === to
                  ? 'font-medium text-gray-900 dark:text-white underline underline-offset-4'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors'
              }
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}
