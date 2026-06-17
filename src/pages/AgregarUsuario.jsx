import React, { useState } from 'react';
import axios from 'axios';

function AgregarUsuario() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const res = await axios.post('http://localhost:4000/crear-usuario', {
        email,
        password,
        nombre,
      }, {
        headers: {
          Authorization: 'Bearer saul2401' // cambia esto por el mismo token del backend
        }
      });

      setSuccessMsg('Usuario creado correctamente. UID: ' + res.data.uid);
      setEmail('');
      setPassword('');
      setNombre('');
    } catch (error) {
      console.error('Error al crear usuario:', error);
      if (error.response) {
        setErrorMsg(error.response.data.error);
      } else {
        setErrorMsg('Error al conectar con el servidor');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-shell">
      <div className="app-panel max-w-md mx-auto">
        <h2 className="section-title mb-2">Agregar Nuevo Usuario</h2>
        <p className="section-subtitle mb-6">Crea una cuenta para el equipo de inventario.</p>
        {errorMsg && (
          <div className="mb-4 rounded-2xl bg-red-50 border border-red-200 p-4 text-red-700">{errorMsg}</div>
        )}
        {successMsg && (
          <div className="mb-4 rounded-2xl bg-green-50 border border-green-200 p-4 text-green-700">{successMsg}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-2 font-medium text-gray-700">Nombre completo</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              className="input-field"
              placeholder="Ej: Juan Pérez"
            />
          </div>

          <div>
            <label className="block mb-2 font-medium text-gray-700">Correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="input-field"
              placeholder="usuario@ejemplo.com"
            />
          </div>

          <div>
            <label className="block mb-2 font-medium text-gray-700">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="input-field"
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`btn-primary w-full ${loading ? 'opacity-70' : ''}`}
          >
            {loading ? 'Creando...' : 'Crear Usuario'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AgregarUsuario;
