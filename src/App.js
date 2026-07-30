import React, { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';

import Login from './pages/Login';

const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const UserDashboard = lazy(() => import('./pages/UserDashboard'));
const Productos = lazy(() => import('./pages/Productos'));
const Entregas = lazy(() => import('./pages/Entregas'));
const Usuarios = lazy(() => import('./pages/Usuarios'));
const Historial = lazy(() => import('./pages/Historial'));
const ProductosAdmin = lazy(() => import('./pages/ProductosAdmin'));
const AgregarUsuario = lazy(() => import('./pages/AgregarUsuario'));

const adminEmails = ['admin@example.com'];

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) return <p className="p-4">Cargando...</p>;

  const isAdmin = Boolean(user && adminEmails.includes(user.email));

  const adminRoute = (element) => {
    if (!user) return <Navigate to="/login" replace />;
    if (!isAdmin) return <Navigate to="/dashboard" replace />;
    return element;
  };

  return (
    <Router>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route
            path="/login"
            element={!user ? <Login /> : <Navigate to="/dashboard" replace />}
          />

          <Route
            path="/dashboard"
            element={user ? <UserRedirect user={user} /> : <Navigate to="/login" replace />}
          />

          <Route path="/historial" element={adminRoute(<Historial />)} />
          <Route path="/entregas" element={adminRoute(<Entregas />)} />
          <Route path="/productos" element={adminRoute(<Productos />)} />
          <Route path="/usuarios" element={adminRoute(<Usuarios />)} />
          <Route path="/productos-admin" element={adminRoute(<ProductosAdmin />)} />
          <Route path="/agregar-usuario" element={adminRoute(<AgregarUsuario />)} />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-teal-600" aria-label="Cargando" />
    </div>
  );
}

function UserRedirect({ user }) {
  return adminEmails.includes(user.email) ? <AdminDashboard /> : <UserDashboard />;
}

export default App;
