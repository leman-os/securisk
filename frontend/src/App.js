import { useState, useEffect } from 'react';
import '@/App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import RiskRegister from './pages/RiskRegister';
import Threats from './pages/Threats';
import Vulnerabilities from './pages/Vulnerabilities';
import Incidents from './pages/Incidents';
import Assets from './pages/Assets';
import Users from './pages/Users';
import Settings from './pages/Settings';
import Wiki from './pages/Wiki';
import Registries from './pages/Registries';
import RegistryView from './pages/RegistryView';
import Roles from './pages/Roles';
import Layout from './components/Layout';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

// Axios interceptor for auth
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await axios.get(`${API}/auth/me`);
          setUser(response.data);
        } catch (error) {
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login setUser={setUser} />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout user={user} setUser={setUser}>
                  <Dashboard user={user} />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/risks"
            element={
              <ProtectedRoute>
                <Layout user={user} setUser={setUser}>
                  <RiskRegister user={user} />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/threats"
            element={
              <ProtectedRoute>
                <Layout user={user} setUser={setUser}>
                  <Threats user={user} />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/vulnerabilities"
            element={
              <ProtectedRoute>
                <Layout user={user} setUser={setUser}>
                  <Vulnerabilities user={user} />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/incidents"
            element={
              <ProtectedRoute>
                <Layout user={user} setUser={setUser}>
                  <Incidents user={user} />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/assets"
            element={
              <ProtectedRoute>
                <Layout user={user} setUser={setUser}>
                  <Assets user={user} />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute>
                <Layout user={user} setUser={setUser}>
                  <Users user={user} />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Layout user={user} setUser={setUser}>
                  <Settings user={user} />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/wiki"
            element={
              <ProtectedRoute>
                <Layout user={user} setUser={setUser}>
                  <Wiki user={user} />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/registries"
            element={
              <ProtectedRoute>
                <Layout user={user} setUser={setUser}>
                  <Registries user={user} />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/registries/:registryId"
            element={
              <ProtectedRoute>
                <Layout user={user} setUser={setUser}>
                  <RegistryView user={user} />
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
