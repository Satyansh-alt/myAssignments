import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Courses from './pages/Courses'
import CourseDetail from './pages/CourseDetail'
import GradeCalculator from './pages/GradeCalculator'
import SyllabusParser from './pages/SyllabusParser'
import AssignmentImporter from './pages/AssignmentImporter'
import ChatBot from './pages/ChatBot'
import Navbar from './components/Layout/Navbar'
import LoadingSpinner from './components/shared/LoadingSpinner'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingSpinner />
  if (!user) return <Navigate to="/login" replace />
  return children
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingSpinner />
  if (user) return <Navigate to="/" replace />
  return children
}

export default function App() {
  const { user } = useAuth()
  return (
    <BrowserRouter>
      {user && <Navbar />}
      <main className="main-content">
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/courses" element={<ProtectedRoute><Courses /></ProtectedRoute>} />
          <Route path="/courses/:id" element={<ProtectedRoute><CourseDetail /></ProtectedRoute>} />
          <Route path="/courses/:id/grades" element={<ProtectedRoute><GradeCalculator /></ProtectedRoute>} />
          <Route path="/courses/:id/syllabus" element={<ProtectedRoute><SyllabusParser /></ProtectedRoute>} />
          <Route path="/courses/:id/import-assignments" element={<ProtectedRoute><AssignmentImporter /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><ChatBot /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}
