import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import ProtectedRoute from './ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import Home from './pages/Home';
import NewRoom from './pages/NewRoom';
import Room from './pages/Room';
import Join from './pages/Join';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Register />} />
          <Route path="/verificar-email" element={<VerifyEmail />} />
          <Route path="/entrar/:code" element={<Join />} />
          <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/salas/nova" element={<ProtectedRoute><NewRoom /></ProtectedRoute>} />
          <Route path="/salas/:id" element={<ProtectedRoute><Room /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}