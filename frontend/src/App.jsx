import './App.css'
import { Routes, Route, Navigate } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { FacilityDetailPage } from './pages/FacilityDetailPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ProfilePage } from './pages/ProfilePage';
import { ProfileBookingsPage } from './pages/ProfileBookingsPage';
import { ProfileReviewsPage } from './pages/ProfileReviewsPage';
import { RenterDashboardPage } from './pages/RenterDashboardPage';
import { ReviewPage } from './pages/ReviewPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { getAccessToken } from './services/authStorage';

// Защищенный маршрут (простая проверка токена)
const ProtectedRoute = ({ children }) => {
  const token = getAccessToken();
  return token ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/facility/:id" element={<FacilityDetailPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      
      {/* Защищенные роуты */}
      <Route path="/profile" element={
        <ProtectedRoute><ProfilePage /></ProtectedRoute>
      } />
      <Route path="/profile/bookings" element={
        <ProtectedRoute><ProfileBookingsPage /></ProtectedRoute>
      } />
      <Route path="/profile/reviews" element={
        <ProtectedRoute><ProfileReviewsPage /></ProtectedRoute>
      } />
      <Route path="/renter" element={
        <ProtectedRoute><RenterDashboardPage /></ProtectedRoute>
      } />
      <Route path="/admin-dashboard" element={
        <ProtectedRoute><AdminDashboardPage /></ProtectedRoute>
      } />

      <Route path="/review/:id" element={
        <ProtectedRoute><ReviewPage /></ProtectedRoute> 
      } />
    </Routes>
  );
}

export default App;
