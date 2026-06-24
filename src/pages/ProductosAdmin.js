import React, { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Boxes,
  Loader2,
  Package,
  Search,
  Trash2,
  X
} from 'lucide-react';

function ProductosAdmin() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [productoAEliminar, setProductoAEliminar] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProductos();
  }, []);

  const fetchProductos = async () => {
    try {
      setLoading(true);
      const snapshot = await getDocs(collection(db, 'productos'));
      const lista = snapshot.docs.map(documento => ({
        id: documento.id,
        ...documento.data()
      }));
      setProductos(lista);
    } catch (e) {
      console.error(e);
      setError('No se pudieron cargar los productos');
    } finally {
      setLoading(false);
    }
  };

  const productosFiltrados = useMemo(() => {
    const term = busqueda.trim().toLowerCase();
    if (!term) return productos;
    return productos.filter(producto => producto.nombre?.toLowerCase().includes(term));
  }, [productos, busqueda]);

  const totalUnidades = useMemo(() => {
    return productos.reduce((total, producto) => total + (parseInt(producto.cantidad) || 0), 0);
  }, [productos]);

  const totalVariantes = useMemo(() => {
    return productos.reduce((total, producto) => total + getVariantes(producto).length, 0);
  }, [productos]);

  const confirmarEliminarProducto = async () => {
    if (!productoAEliminar) return;

    try {
      setIsDeleting(true);
      await deleteDoc(doc(db, 'productos', productoAEliminar.id));
      setProductos(prev => prev.filter(producto => producto.id !== productoAEliminar.id));
      setProductoAEliminar(null);
    } catch (e) {
      console.error(e);
      setError('Error al eliminar producto');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 font-sans text-slate-900">
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-40 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate('/dashboard')}
              className="w-10 h-10 rounded-2xl bg-slate-50 text-slate-500 flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all shrink-0"
              title="Volver al dashboard"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-black tracking-tight truncate">Productos Admin</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Inventario completo</p>
            </div>
          </div>

          <button
            onClick={() => navigate('/dashboard')}
            className="hidden sm:flex items-center gap-2 bg-slate-900 px-4 py-2 rounded-xl text-xs font-bold text-white hover:bg-indigo-600 transition-all"
          >
            <ArrowLeft size={16} /> Regresar
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {error && (
          <div className="flex items-center justify-between gap-3 bg-red-50 border border-red-100 text-red-600 rounded-2xl px-4 py-3">
            <div className="flex items-center gap-2 min-w-0">
              <AlertCircle size={18} className="shrink-0" />
              <p className="text-sm font-bold truncate">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="w-8 h-8 rounded-xl bg-white/70 flex items-center justify-center hover:bg-white transition-all">
              <X size={16} />
            </button>
          </div>
        )}

        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard title="Productos" value={productos.length} icon={<Package size={22} />} color="text-indigo-600 bg-indigo-50" />
          <StatCard title="Unidades" value={totalUnidades} icon={<Boxes size={22} />} color="text-cyan-600 bg-cyan-50" />
          <StatCard title="Variantes" value={totalVariantes} icon={<Search size={22} />} color="text-emerald-600 bg-emerald-50" />
        </section>

        <section className="bg-white border border-slate-100 rounded-[24px] p-4 sm:p-5 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
            <div>
              <h2 className="text-lg font-black tracking-tight">Todos los productos</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                {productosFiltrados.length} visibles de {productos.length}
              </p>
            </div>

            <div className="relative w-full lg:w-72">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
              <input
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar producto"
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-2.5 pl-11 pr-4 text-sm font-semibold placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-200"
              />
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {[1, 2, 3, 4, 5, 6].map(item => (
                <div key={item} className="h-52 bg-slate-50 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : productosFiltrados.length === 0 ? (
            <div className="py-16 text-center bg-slate-50 rounded-3xl border border-slate-100">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-white border border-slate-100 flex items-center justify-center text-slate-300 mb-4">
                <Package size={28} />
              </div>
              <p className="text-sm font-black text-slate-700">No hay productos para mostrar</p>
              <p className="text-xs font-bold text-slate-400 mt-1">Prueba con otra busqueda o agrega productos desde el dashboard.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {productosFiltrados.map(producto => (
                <ProductCard
                  key={producto.id}
                  producto={producto}
                  onDelete={() => setProductoAEliminar(producto)}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {productoAEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={() => setProductoAEliminar(null)} />
          <div className="relative w-full max-w-sm bg-white rounded-[32px] p-8 shadow-2xl">
            <button
              onClick={() => setProductoAEliminar(null)}
              className="absolute top-4 right-4 w-9 h-9 rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all flex items-center justify-center"
            >
              <X size={18} />
            </button>
            <div className="w-16 h-16 rounded-3xl bg-red-50 text-red-500 flex items-center justify-center mb-5">
              <Trash2 size={30} />
            </div>
            <h2 className="text-xl font-black text-slate-900 mb-2">Eliminar producto</h2>
            <p className="text-sm font-semibold text-slate-500 mb-7">
              Se eliminara "{productoAEliminar.nombre}" del inventario.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setProductoAEliminar(null)}
                className="py-3.5 rounded-2xl bg-slate-50 text-slate-500 font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarEliminarProducto}
                disabled={isDeleting}
                className="py-3.5 rounded-2xl bg-red-600 text-white font-black text-xs uppercase tracking-widest hover:bg-red-700 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {isDeleting && <Loader2 className="animate-spin" size={16} />}
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, icon, color }) {
  return (
    <div className="bg-white border border-slate-100 rounded-[28px] p-5 shadow-sm flex items-center gap-4">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
        <p className="text-2xl font-black text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function ProductCard({ producto, onDelete }) {
  const variantes = getVariantes(producto);

  return (
    <article className="border border-slate-100 rounded-2xl bg-white p-3 shadow-sm hover:shadow-lg hover:shadow-slate-200/70 transition-all">
      <div className="aspect-[5/3] rounded-xl bg-slate-50 border border-slate-100 overflow-hidden flex items-center justify-center mb-3">
        {producto.imagen ? (
          <img src={producto.imagen} alt={producto.nombre} className="w-full h-full object-cover" />
        ) : (
          <Package size={34} className="text-slate-300" />
        )}
      </div>

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-black text-slate-900 truncate">{producto.nombre}</h3>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{producto.cantidad || 0} unidades</p>
        </div>
        <button
          onClick={onDelete}
          className="w-8 h-8 rounded-xl bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-600 hover:text-white transition-all shrink-0"
          title="Eliminar producto"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {variantes.length === 0 ? (
          <span className="px-2.5 py-1 rounded-lg bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Sin tallas
          </span>
        ) : variantes.slice(0, 6).map(variante => (
          <span
            key={`${variante.genero}-${variante.talla}`}
            className="px-2.5 py-1 rounded-lg bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-widest"
          >
            {variante.genero} {variante.talla}: {variante.cantidad}
          </span>
        ))}
        {variantes.length > 6 && (
          <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-[10px] font-black text-indigo-600 uppercase tracking-widest">
            +{variantes.length - 6} mas
          </span>
        )}
      </div>
    </article>
  );
}

function getVariantes(producto) {
  return Object.entries(producto.tallas || {}).flatMap(([genero, tallas]) => (
    Object.entries(tallas || {}).map(([talla, data]) => ({
      genero,
      talla,
      cantidad: data?.cantidad || 0
    }))
  ));
}

export default ProductosAdmin;
