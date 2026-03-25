import { Link } from 'react-router-dom'

export function Footer() {
  return (
    <footer className="border-t border-gray-200 dark:border-gray-800 py-8 text-sm text-gray-500 dark:text-gray-400">
      <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between gap-4">
        <div>
          <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">SCOTUS Partisan Index</p>
          <p>A nonpartisan framework for analyzing judicial voting patterns.</p>
          <p className="mt-1">
            All classifications are documented and challengeable.{' '}
            <Link to="/methodology" className="underline hover:text-gray-800 dark:hover:text-gray-200">
              See methodology.
            </Link>
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <Link to="/methodology" className="hover:text-gray-800 dark:hover:text-gray-200">Methodology</Link>
          <Link to="/verify" className="hover:text-gray-800 dark:hover:text-gray-200">Verify Scores</Link>
          <Link to="/doctrines" className="hover:text-gray-800 dark:hover:text-gray-200">Doctrine Definitions</Link>
          <a
            href="https://github.com/GabeCarva/justice-affiliation"
            className="hover:text-gray-800 dark:hover:text-gray-200"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  )
}
