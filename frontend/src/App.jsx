import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import EmployeeWorkspace from './pages/EmployeeWorkspace'
import AdminDashboard from './pages/AdminDashboard'

// Root redirect based on role
const RootRedirect = () => {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={user.role === 'hr_admin' ? '/admin' : '/employee'} replace />
}

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Employee workspace */}
        <Route
          path="/employee"
          element={
            <ProtectedRoute requiredRole="employee">
              <EmployeeWorkspace />
            </ProtectedRoute>
          }
        />

        {/* HR Admin dashboard */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRole="hr_admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* Root redirect */}
        <Route path="/" element={<RootRedirect />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  </BrowserRouter>
)

export default App
