import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout/Layout'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import './App.css'

function App() {
  return (
    <div className="bg-[#FAFAFA] dark:bg-[#0E0E0E] text-[#111827] dark:text-[#E2E8F0] font-sans antialiased min-h-screen">
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          {/* We will replace these with actual page components later */}
          <Route path="/dashboard" element={<div className="p-8">Dashboard Placeholder</div>} />
          <Route path="*" element={<div className="p-8 text-red-500">404 - Page Not Found</div>} />
        </Route>
      </Routes>
    </div>
  )
}

export default App
