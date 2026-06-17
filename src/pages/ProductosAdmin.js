import React, { useEffect, useState } from 'react';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate, useLocation } from 'react-router-dom';
import { Trash2, Package, Clock, UserPlus } from 'lucide-react';

function ProductosAdmin() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchProductos = async () => {
      const snapshot = await getDocs(collection(db, 'productos'));
      const lista = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProductos(lista);
      setLoading(false);
    };

    fetchProductos();
  }, []);

  const eliminarProducto = async (id) => {
    const confirm = window.confirm('¿Estás seguro de que deseas eliminar este producto?');
    if (!confirm) return;

    try {
      await deleteDoc(doc(db, 'productos', id));
      setProductos(productos.filter(p => p.id !== id));
      alert('Producto eliminado correctamente.');
    } catch (error) {
      alert('Error al eliminar producto: ' + error.message);
    }
  };

  if (loading) return <p className="p-4 text-gray-600 text-center">Cargando productos...</p>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center p-4 sm:p-6 text-slate-100">
      <div className="bg-slate-950/95 shadow-xl rounded-2xl p-6 w-full max-w-5xl flex flex-col transition-all duration-300 pb-28 border border-slate-700">
        <header className="flex justify-between items-center mb-8 relative">
          <div className="flex-1 text-center">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">Gestión de Productos (Admin)</h1>
          </div>
          <img
            src="/saul.png"
            alt="Logo"
            className="absolute top-2 right-2 w-16 h-16 object-contain z-10"
          />
        </header>

        {productos.length === 0 ? (
          <p className="text-md text-gray-600 text-center">No hay productos registrados.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {productos.map(producto => (
              <div
                key={producto.id}
                className="border border-gray-200 rounded-xl shadow hover:shadow-lg transition-all duration-300 bg-white p-5 flex flex-col items-center text-center"
              >
                {producto.imagen && (
                  <img
                    src={producto.imagen}
                    alt={producto.nombre}
                    className="w-24 h-24 object-contain rounded-lg border border-gray-200 mb-3"
                  />
                )}
                <h2 className="text-xl font-semibold text-gray-900">{producto.nombre}</h2>
                <p className="text-sm text-gray-600 mb-3">
                  Cantidad: <span className="font-medium">{producto.cantidad}</span>
                </p>
                <button
                  onClick={() => eliminarProducto(producto.id)}
                  className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-medium text-sm transition-all duration-200"
                >
                  <Trash2 size={16} /> Eliminar
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Barra de navegación inferior fija */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-inner flex justify-around items-center py-3 z-20 sm:max-w-5xl sm:mx-auto sm:rounded-b-2xl">
          <NavButton
            onClick={() => navigate('/productos')}
            label="Productos"
            icon={<Package size={20} />}
            active={location.pathname === '/productos'}
          />
          <NavButton
            onClick={() => navigate('/historial')}
            label="Historial"
            icon={<Clock size={20} />}
            active={location.pathname === '/historial'}
          />
          <NavButton
            onClick={() => navigate('/agregar-usuario')}
            label="Nuevo usuario"
            icon={<UserPlus size={20} />}
            active={location.pathname === '/agregar-usuario'}
          />
        </div>
      </div>
    </div>
  );
}

function NavButton({ onClick, label, icon, active }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center px-3 py-2 rounded-lg transition-colors duration-200 text-sm font-medium ${
        active ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {icon}
      <span className="mt-1">{label}</span>
    </button>
  );
}

export default ProductosAdmin;
