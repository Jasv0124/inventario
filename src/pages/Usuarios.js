import React, { useEffect, useState } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

const Usuarios = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [nuevoUsuario, setNuevoUsuario] = useState({ email: '', role: 'user' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const obtenerUsuarios = async () => {
    try {
      setLoading(true);
      setError('');
      const snapshot = await getDocs(collection(db, 'users'));
      setUsuarios(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error('Error al cargar usuarios:', err);
      setError('No se pudieron cargar los usuarios. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const agregarUsuario = async () => {
    if (!nuevoUsuario.email.trim()) {
      setError('Ingresa un correo válido antes de agregar.');
      return;
    }

    try {
      setError('');
      await addDoc(collection(db, 'users'), {
        email: nuevoUsuario.email.trim(),
        role: nuevoUsuario.role,
      });
      setNuevoUsuario({ email: '', role: 'user' });
      await obtenerUsuarios();
    } catch (err) {
      console.error('Error al agregar usuario:', err);
      setError('No se pudo agregar el usuario. Intenta más tarde.');
    }
  };

  const eliminarUsuario = async (id) => {
    try {
      await deleteDoc(doc(db, 'users', id));
      setUsuarios(prev => prev.filter(user => user.id !== id));
    } catch (err) {
      console.error('Error al eliminar usuario:', err);
      setError('No se pudo eliminar el usuario. Intenta nuevamente.');
    }
  };

  useEffect(() => {
    obtenerUsuarios();
  }, []);

  return (
    <div className="page-shell py-6">
      <div className="page-card max-w-3xl mx-auto">
        <h1 className="section-title">Gestión de Usuarios</h1>

        {error && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
        )}

        <div className="grid gap-4 sm:grid-cols-[2fr_1fr] mb-6">
          <input
            type="email"
            placeholder="Correo electrónico"
            value={nuevoUsuario.email}
            onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, email: e.target.value })}
            className="input-field"
          />
          <button
            type="button"
            onClick={agregarUsuario}
            className="btn-primary w-full"
          >
            Agregar usuario
          </button>
        </div>

        {loading ? (
          <p className="text-slate-600">Cargando usuarios...</p>
        ) : (
          <div className="space-y-4">
            {usuarios.length === 0 ? (
              <p className="text-slate-600">No hay usuarios registrados.</p>
            ) : (
              usuarios.map(user => (
                <div key={user.id} className="flex flex-col sm:flex-row justify-between gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div>
                    <p className="font-semibold text-slate-900">{user.email}</p>
                    <p className="text-sm text-slate-500">Rol: {user.role || 'user'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => eliminarUsuario(user.id)}
                    className="self-start btn-danger sm:self-center"
                  >
                    Eliminar
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Usuarios;
