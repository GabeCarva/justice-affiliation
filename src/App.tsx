import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Nav } from './components/Nav'
import { Footer } from './components/Footer'
import { HomePage } from './pages/HomePage'
import { BlogPage } from './pages/BlogPage'
import { MethodologyPage } from './pages/MethodologyPage'
import { VerifyPage } from './pages/VerifyPage'
import { DoctrinePage } from './pages/DoctrinePage'
import { PriorsPage } from './pages/PriorsPage'
import { PredictivePage } from './pages/PredictivePage'

export default function App() {
  return (
    <BrowserRouter basename="/justice-affiliation">
      <div className="min-h-screen flex flex-col">
        <Nav />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/blog" element={<BlogPage />} />
            <Route path="/methodology" element={<MethodologyPage />} />
            <Route path="/verify" element={<VerifyPage />} />
            <Route path="/doctrines" element={<DoctrinePage />} />
            <Route path="/priors" element={<PriorsPage />} />
            <Route path="/predict" element={<PredictivePage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  )
}
