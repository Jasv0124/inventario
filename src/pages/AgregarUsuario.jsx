import React, { useState } from 'react';
import { initializeApp, deleteApp } from 'firebase/app';
import { createUserWithEmailAndPassword, getAuth, signOut, updateProfile } from 'firebase/auth';
import { doc, getFirestore, setDoc } from 'firebase/firestore';
import { firebaseConfig } from '../firebase';
import { DEFAULT_SEDE, SEDES, buildUserDisplayName, getSedeLabel, normalizeEmail } from '../utils/sedes';

function AgregarUsuario() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [sede, setSede] = useState(DEFAULT_SEDE);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    let secondaryApp = null;

    try {
      secondaryApp = initializeApp(firebaseConfig, `user-creation-${Date.now()}`);
      const secondaryAuth = getAuth(secondaryApp);
      const secondaryDb = getFirestore(secondaryApp);
      const credentials = await createUserWithEmailAndPassword(
        secondaryAuth,
        normalizeEmail(email),
        password
      );

      await updateProfile(credentials.user, { displayName: buildUserDisplayName(nombre, sede) });
      const userData = {
        email: normalizeEmail(email),
        nombre: nombre.trim(),
        rol: 'operador',
        sede,
        createdAt: new Date(),
      };

      let firestoreSaved = true;
      try {
        await setDoc(doc(secondaryDb, 'usuarios', credentials.user.uid), userData);
      } catch (firestoreError) {
        firestoreSaved = false;
        console.warn('Usuario creado en Auth, pero Firestore rechazo el perfil:', firestoreError);
      }

      await signOut(secondaryAuth);

      setSuccessMsg(
        firestoreSaved
          ? `Usuario creado correctamente para la sede ${getSedeLabel(sede)}.`
          : `Usuario creado. Firestore bloqueo el perfil, pero la sede ${getSedeLabel(sede)} quedo guardada en la cuenta.`
      );
      setEmail('');
      setPassword('');
      setNombre('');
      setSede(DEFAULT_SEDE);
    } catch (error) {
      console.error('Error al crear usuario:', error);
      setErrorMsg(getFirebaseErrorMessage(error));
    } finally {
      if (secondaryApp) {
        await deleteApp(secondaryApp).catch(() => {});
      }
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
              placeholder="Ej: Juan Perez"
            />
          </div>

          <div>
            <label className="block mb-2 font-medium text-gray-700">Correo electronico</label>
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
            <label className="block mb-2 font-medium text-gray-700">Contrasena</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="input-field"
              placeholder="Minimo 6 caracteres"
            />
          </div>

          <div>
            <label className="block mb-2 font-medium text-gray-700">Sede</label>
            <select
              value={sede}
              onChange={(e) => setSede(e.target.value)}
              required
              className="select-field"
            >
              {SEDES.map(item => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
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

function getFirebaseErrorMessage(error) {
  if (error?.code === 'auth/email-already-in-use') return 'Ese correo ya existe.';
  if (error?.code === 'auth/invalid-email') return 'El correo no es valido.';
  if (error?.code === 'auth/weak-password') return 'La contrasena debe tener minimo 6 caracteres.';
  if (error?.code === 'permission-denied') return 'No tienes permiso para guardar el usuario en Firestore.';
  return 'No se pudo crear el usuario. Revisa los datos e intenta de nuevo.';
}

export default AgregarUsuario;
