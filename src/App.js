import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';

import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import UserDashboard from './pages/UserDashboard';
import Productos from './pages/Productos';
import Entregas from './pages/Entregas';
import Usuarios from './pages/Usuarios';
import Historial from './pages/Historial';
import ProductosAdmin from './pages/ProductosAdmin';
import AgregarUsuario from './pages/AgregarUsuario';

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
    </Router>
  );
}

function UserRedirect({ user }) {
  return adminEmails.includes(user.email) ? <AdminDashboard /> : <UserDashboard />;
}

export default App;
