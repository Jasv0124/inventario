import React, { useEffect, useState } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

const Entregas = () => {
  const [entregas, setEntregas] = useState([]);
  const [nuevaEntrega, setNuevaEntrega] = useState({ producto: '', destinatario: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const obtenerEntregas = async () => {
    try {
      setLoading(true);
      setError('');
      const snapshot = await getDocs(collection(db, 'entregas'));
      setEntregas(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error('Error al cargar entregas:', err);
      setError('No se pudieron cargar las entregas. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const agregarEntrega = async () => {
    if (!nuevaEntrega.producto.trim() || !nuevaEntrega.destinatario.trim()) {
      setError('Completa todos los campos antes de agregar la entrega.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      const docRef = await addDoc(collection(db, 'entregas'), {
        producto: nuevaEntrega.producto.trim(),
        destinatario: nuevaEntrega.destinatario.trim(),
        fecha: new Date(),
      });

      await addDoc(collection(db, 'historial'), {
        producto: nuevaEntrega.producto.trim(),
        entregadoA: nuevaEntrega.destinatario.trim(),
        fecha: new Date(),
        entregaId: docRef.id,
      });

      setNuevaEntrega({ producto: '', destinatario: '' });
      await obtenerEntregas();
    } catch (err) {
      console.error('Error al crear entrega:', err);
      setError('No se pudo registrar la entrega. Intenta nuevamente.');
    } finally {
      setSaving(false);
    }
  };

  const eliminarEntrega = async (id) => {
    try {
      await deleteDoc(doc(db, 'entregas', id));
      setEntregas((prev) => prev.filter((ent) => ent.id !== id));
    } catch (err) {
      console.error('Error al eliminar entrega:', err);
      setError('No se pudo eliminar la entrega. Intenta nuevamente.');
    }
  };

  useEffect(() => {
    obtenerEntregas();
  }, []);

  return (
    <div className="page-shell py-6">
      <div className="page-card max-w-3xl mx-auto">
        <h2 className="section-title">Entregas</h2>
        <p className="section-subtitle">Administra entregas con un diseño claro y ordenado.</p>

        <div className="space-y-4 mb-6">
          {error && (
            <div className="rounded-2xl bg-red-50 border border-red-200 text-red-700 p-3">{error}</div>
          )}

          <div className="grid gap-4 sm:grid-cols-[1.5fr_1.5fr_1fr]">
            <input
              type="text"
              placeholder="Nombre del producto"
              className="input-field"
              value={nuevaEntrega.producto}
              onChange={(e) => setNuevaEntrega({ ...nuevaEntrega, producto: e.target.value })}
            />
            <input
              type="text"
              placeholder="Destinatario"
              className="input-field"
              value={nuevaEntrega.destinatario}
              onChange={(e) => setNuevaEntrega({ ...nuevaEntrega, destinatario: e.target.value })}
            />
            <button
              type="button"
              onClick={agregarEntrega}
              disabled={saving}
              className="btn-primary w-full"
            >
              {saving ? 'Guardando...' : 'Agregar'}
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-center text-slate-600">Cargando entregas...</p>
        ) : (
          <div className="space-y-4">
            {entregas.length === 0 ? (
              <p className="text-slate-600 text-center">No hay entregas registradas.</p>
            ) : (
              entregas.map((ent) => (
                <div
                  key={ent.id}
                  className="flex flex-col sm:flex-row justify-between gap-4 rounded-3xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition bg-slate-50"
                >
                  <div>
                    <p className="font-semibold text-gray-900">{ent.producto}</p>
                    <p className="text-gray-600">Destinatario: {ent.destinatario}</p>
                    <p className="text-sm text-gray-500 mt-1">{ent.fecha?.toDate ? ent.fecha.toDate().toLocaleString() : new Date(ent.fecha).toLocaleString()}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => eliminarEntrega(ent.id)}
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

export default Entregas;
