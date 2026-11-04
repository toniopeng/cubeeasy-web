import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Learn } from './pages/Learn'
import { Pricing } from './pages/Pricing'
import { Support } from './pages/Support'
import { Privacy, Terms } from './pages/Legal'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Learn />} />
        <Route path="learn" element={<Navigate to="/" replace />} />
        <Route path="pricing" element={<Pricing />} />
        <Route path="support" element={<Support />} />
        <Route path="privacy" element={<Privacy />} />
        <Route path="terms" element={<Terms />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
