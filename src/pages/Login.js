import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { Eye, EyeOff } from 'lucide-react';
import logoRG from './rg.png';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(
        err.code === 'auth/wrong-password'
          ? 'Contraseña incorrecta'
          : err.code === 'auth/user-not-found'
          ? 'Usuario no encontrado'
          : 'Error al iniciar sesión. Verifica tus credenciales.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-shell flex items-center justify-center">
      <div className="grid w-full max-w-5xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden lg:block">
          <div className="max-w-md">
            <div className="mb-5 inline-flex rounded-full border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-bold text-teal-800">
              Inventario RG
            </div>
            <h1 className="text-5xl font-black leading-tight text-slate-950">
              Control de entregas rápido y ordenado.
            </h1>
            <p className="mt-5 text-lg font-medium leading-8 text-slate-600">
              Consulta productos, registra entregas y mantén el historial claro desde cualquier dispositivo.
            </p>
          </div>
        </section>

        <form onSubmit={handleLogin} className="app-panel mx-auto max-w-md">
          <div className="mb-7 text-center">
            <div className="mx-auto mb-5 flex h-28 w-28 items-center justify-center rounded-3xl border border-slate-200 bg-white shadow-sm">
              <img src={logoRG} alt="RG Logo" className="h-24 w-24 object-contain" />
            </div>
            <h2 className="section-title">Iniciar sesión</h2>
            <p className="section-subtitle">Ingresa con tus credenciales para continuar.</p>
          </div>

          <div className="mb-4">
            <label className="mb-2 block text-sm font-bold text-slate-700">
              Correo
            </label>
            <input
              type="email"
              placeholder="usuario@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              required
            />
          </div>

          <div className="mb-4">
            <label className="mb-2 block text-sm font-bold text-slate-700">
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Ingresa tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field pr-12"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-teal-700"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff size={21} /> : <Eye size={21} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Cargando...' : 'Iniciar sesión'}
          </button>

          <button
            type="button"
            className="mt-4 w-full text-center text-sm font-bold text-teal-700 hover:text-teal-900"
            onClick={() => alert('Contacta al administrador para restablecer tu contraseña.')}
          >
            ¿Olvidaste tu contraseña?
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
