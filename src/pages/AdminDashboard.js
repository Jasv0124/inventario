import React, { useEffect, useState, useMemo, useRef } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { signOut } from 'firebase/auth';
import { db, storage, auth } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { DEFAULT_SEDE, SEDES, getSedeLabel } from '../utils/sedes';
import { 
  Plus, Trash2, Download, LogOut, UserPlus, 
  Package, Users, LayoutDashboard, Image as ImageIcon,
  ChevronRight, X, AlertCircle, Loader2, Clock, CheckCircle2, Eye
} from 'lucide-react';

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

function AdminDashboard() {
  const [nombre, setNombre] = useState('');
  const [sede, setSede] = useState(DEFAULT_SEDE);
  const [tallas, setTallas] = useState([{ genero: '', talla: '', cantidad: '' }]);
  const [imagen, setImagen] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [productos, setProductos] = useState([]);
  const [filtroSedeInventario, setFiltroSedeInventario] = useState('todas');
  const [sedeExportacion, setSedeExportacion] = useState('todas');
  const [showExportModal, setShowExportModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingProductos, setIsLoadingProductos] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const imageInputRef = useRef(null);
  const navigate = useNavigate();

  // ─── EFECTOS ────────────────────────────────────────────────────────────────
  
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        fetchUsuarios();
        fetchProductos();
      } else {
        navigate('/login');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // ─── FUNCIONES DE LÓGICA ────────────────────────────────────────────────────

  const fetchUsuarios = async () => {
    try {
      setIsLoading(true);
      const snap = await getDocs(collection(db, 'usuarios'));
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsuarios(list);
    } catch (e) {
      console.error(e);
      setError('Error al cargar usuarios');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProductos = async () => {
    try {
      setIsLoadingProductos(true);
      const snap = await getDocs(collection(db, 'productos'));
      const list = snap.docs.map(doc => normalizeProducto({ id: doc.id, ...doc.data() }));
      setProductos(list);
    } catch (e) {
      console.error(e);
      setError('Error al cargar productos');
    } finally {
      setIsLoadingProductos(false);
    }
  };

  const handleCerrarSesion = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (e) {
      console.error(e);
    }
  };

  const handleEliminarUsuario = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este usuario?')) return;
    try {
      await deleteDoc(doc(db, 'usuarios', id));
      setUsuarios(prev => prev.filter(u => u.id !== id));
    } catch (e) {
      console.error(e);
      setError('Error al eliminar');
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!nombre.trim()) errors.nombre = 'Requerido';
    if (!sede) errors.sede = 'Requerido';
    tallas.forEach((t, i) => {
      if (!t.genero) errors[`genero_${i}`] = '!';
      if (!t.talla) errors[`talla_${i}`] = '!';
      if (!t.cantidad || t.cantidad <= 0) errors[`cantidad_${i}`] = '!';
    });
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAgregarProducto = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);

      const tallasObj = tallas.reduce((acc, { genero, talla, cantidad }) => {
        if (!acc[genero]) acc[genero] = {};
        acc[genero][talla] = { cantidad: parseInt(cantidad) };
        return acc;
      }, {});

      const total = tallas.reduce((sum, t) => sum + (parseInt(t.cantidad) || 0), 0);

      const productoData = {
        nombre,
        tallas: tallasObj,
        cantidad: total,
        imagen: '',
        sede,
        fechaCreacion: new Date()
      };

      const docRef = await addDoc(collection(db, 'productos'), productoData);
      setProductos(prev => [normalizeProducto({ id: docRef.id, ...productoData }), ...prev]);
      setShowSuccessModal(true);

      setNombre('');
      setSede(DEFAULT_SEDE);
      setTallas([{ genero: '', talla: '', cantidad: '' }]);
      const imagenParaSubir = imagen;
      setImagen(null);
      if (imageInputRef.current) imageInputRef.current.value = '';

      if (imagenParaSubir) {
        void uploadProductImage(docRef.id, imagenParaSubir);
      }
    } catch (e) {
      console.error(e);
      setError('Error al guardar producto');
    } finally {
      setIsSubmitting(false);
    }
  };

  const uploadProductImage = async (productId, file) => {
    try {
      const imgRef = ref(storage, `productos/${productId}/${uuidv4()}-${file.name}`);
      const snap = await uploadBytes(imgRef, file);
      const imageUrl = await getDownloadURL(snap.ref);
      await updateDoc(doc(db, 'productos', productId), { imagen: imageUrl });
      setProductos(prev => prev.map(producto => (
        producto.id === productId ? normalizeProducto({ ...producto, imagen: imageUrl }) : producto
      )));
    } catch (e) {
      console.error(e);
      setError('Producto guardado, pero no se pudo subir la imagen');
    }
  };

  const exportToExcel = async (type) => {
    setIsExporting(true);
    try {
      const XLSX = await import('xlsx');
      let data = [];
      const snap = await getDocs(collection(db, type));
      const rawItems = type === 'productos'
        ? mergeProductosForExport(productos, snap.docs.map(d => ({ id: d.id, ...d.data() })))
        : snap.docs.map(d => d.data());
      const items = filterItemsBySede(rawItems, sedeExportacion);
      
      if (type === 'productos') {
        items.forEach(p => {
          if (!p.tallas || Object.keys(p.tallas).length === 0) {
            data.push({
              Producto: p.nombre || 'Sin nombre',
              Sede: getSedeLabel(p.sede),
              Genero: 'N/A',
              Talla: 'N/A',
              Cantidad: p.cantidad || 0
            });
            return;
          }

          Object.keys(p.tallas || {}).forEach(g => {
            Object.keys(p.tallas[g] || {}).forEach(t => {
              data.push({ 
                Producto: p.nombre, 
                Sede: getSedeLabel(p.sede),
                Género: g, 
                Talla: t, 
                Cantidad: p.tallas[g][t].cantidad 
              });
            });
          });
        });
      } else {
        data = items.map(h => ({ 
          ...h, 
          fecha: h.fecha?.toDate ? h.fecha.toDate().toLocaleString() : 'N/A' 
        }));
      }

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, type);
      const sedeSuffix = sedeExportacion === 'todas' ? 'todas_sedes' : sedeExportacion;
      XLSX.writeFile(wb, `${type}_${sedeSuffix}_${new Date().toLocaleDateString()}.xlsx`);
    } catch (e) {
      console.error(e);
      setError('Error al exportar');
    } finally {
      setIsExporting(false);
      setShowExportModal(false);
    }
  };

  const totalInventario = useMemo(() => {
    return tallas.reduce((s, t) => s + (parseInt(t.cantidad) || 0), 0);
  }, [tallas]);

  const productosInventario = useMemo(() => {
    if (filtroSedeInventario === 'todas') return productos;
    return productos.filter(producto => producto.sede === filtroSedeInventario);
  }, [productos, filtroSedeInventario]);

  const totalProductosRegistrados = useMemo(() => {
    return productosInventario.reduce((sum, producto) => sum + (parseInt(producto.cantidad) || 0), 0);
  }, [productosInventario]);

  // ─── RENDERIZADO ────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 font-sans">
      
      {/* ── NAVBAR ── */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-40 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100">
              <LayoutDashboard size={20} />
            </div>
            <h1 className="text-lg font-black text-slate-900 tracking-tight">Admin<span className="text-indigo-600">Dashboard</span></h1>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => navigate('/historial')}
              className="hidden sm:flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-all"
            >
              <Clock size={16} /> Historial
            </button>
            <button onClick={handleCerrarSesion} className="w-10 h-10 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-all">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {error && (
          <div className="lg:col-span-12 flex items-center justify-between gap-3 bg-red-50 border border-red-100 text-red-600 rounded-2xl px-4 py-3">
            <div className="flex items-center gap-2 min-w-0">
              <AlertCircle size={18} className="shrink-0" />
              <p className="text-sm font-bold truncate">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="w-8 h-8 rounded-xl bg-white/70 flex items-center justify-center hover:bg-white transition-all">
              <X size={16} />
            </button>
          </div>
        )}

        {/* ── COLUMNA IZQUIERDA ── */}
        <div className="lg:col-span-7 space-y-8">
          <div className="bg-white rounded-[32px] border border-slate-100 p-6 shadow-sm">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Package size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Nuevo Producto</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ingreso de inventario</p>
              </div>
            </div>

            <form onSubmit={handleAgregarProducto} className="space-y-6">
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre del Producto</label>
                <input 
                  placeholder="Ej. Camiseta Deportiva" 
                  value={nombre} 
                  onChange={e => setNombre(e.target.value)}
                  className={`w-full bg-slate-50 border-none rounded-2xl py-3.5 px-4 text-sm font-semibold placeholder:text-slate-300 focus:ring-2 transition-all ${formErrors.nombre ? 'ring-2 ring-red-100' : 'focus:ring-indigo-500/10'}`}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Sede del inventario</label>
                <select
                  value={sede}
                  onChange={e => setSede(e.target.value)}
                  className={`w-full bg-slate-50 border-none rounded-2xl py-3.5 px-4 text-sm font-semibold focus:ring-2 transition-all ${formErrors.sede ? 'ring-2 ring-red-100' : 'focus:ring-indigo-500/10'}`}
                >
                  {SEDES.map(item => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Tallas y Stock</label>
                  <button type="button" onClick={() => setTallas([...tallas, {genero:'', talla:'', cantidad:''}])} className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline">+ Agregar Fila</button>
                </div>
                
                {tallas.map((t, i) => (
                  <div key={i} className="flex gap-2">
                    <div className="flex-1 grid grid-cols-3 gap-2 bg-slate-50 p-2 rounded-[20px] border border-slate-100">
                      <select 
                        value={t.genero} 
                        onChange={e => {
                          const n = [...tallas]; n[i].genero = e.target.value; setTallas(n);
                        }}
                        className="bg-transparent border-none text-xs font-bold text-slate-700 focus:ring-0"
                      >
                        <option value="">Género</option>
                        <option value="hombre">Hombre</option>
                        <option value="mujer">Mujer</option>
                        <option value="unisex">Unisex</option>
                      </select>
                      <input 
                        placeholder="Talla" 
                        value={t.talla}
                        onChange={e => {
                          const n = [...tallas]; n[i].talla = e.target.value; setTallas(n);
                        }}
                        className="bg-transparent border-none text-xs font-bold text-slate-700 focus:ring-0 placeholder:text-slate-300"
                      />
                      <input 
                        type="number" 
                        placeholder="Cant." 
                        value={t.cantidad}
                        onChange={e => {
                          const n = [...tallas]; n[i].cantidad = e.target.value; setTallas(n);
                        }}
                        className="bg-transparent border-none text-xs font-bold text-slate-700 focus:ring-0 placeholder:text-slate-300"
                      />
                    </div>
                    {tallas.length > 1 && (
                      <button type="button" onClick={() => setTallas(tallas.filter((_, idx) => idx !== i))} className="w-10 h-10 rounded-xl bg-red-50 text-red-400 flex items-center justify-center hover:bg-red-100 transition-all shrink-0">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-4 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
                <div className="flex-1">
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Total acumulado</p>
                  <p className="text-xl font-black text-indigo-600">{totalInventario} <span className="text-xs font-bold">Unidades</span></p>
                </div>
                <label className="cursor-pointer group">
                  <input ref={imageInputRef} type="file" className="hidden" onChange={e => setImagen(e.target.files[0])} />
                  <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-xl border border-indigo-100 text-xs font-bold text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                    <ImageIcon size={16} /> {imagen ? 'Cambiar Foto' : 'Subir Foto'}
                  </div>
                </label>
              </div>

              <button 
                disabled={isSubmitting}
                className="w-full bg-slate-900 py-4 rounded-2xl text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-indigo-600 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
                Guardar Producto
              </button>
            </form>
          </div>
        </div>

        {/* ── COLUMNA DERECHA ── */}
        <div className="lg:col-span-5 space-y-8">
          
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => navigate('/agregar-usuario')}
              className="flex flex-col items-center justify-center p-6 bg-white border border-slate-100 rounded-[32px] hover:border-indigo-100 hover:shadow-xl hover:shadow-indigo-500/5 transition-all group"
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <UserPlus size={24} />
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nuevo</span>
              <span className="text-sm font-black text-slate-900">Usuario</span>
            </button>

            <button 
              onClick={() => setShowExportModal(true)}
              className="flex flex-col items-center justify-center p-6 bg-white border border-slate-100 rounded-[32px] hover:border-indigo-100 hover:shadow-xl hover:shadow-indigo-500/5 transition-all group"
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Download size={24} />
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Generar</span>
              <span className="text-sm font-black text-slate-900">Excel</span>
            </button>
          </div>

          <div className="bg-white rounded-[32px] border border-slate-100 p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-cyan-50 flex items-center justify-center text-cyan-600">
                  <Package size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">Productos</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {filtroSedeInventario === 'todas' ? 'Inventario registrado' : getSedeLabel(filtroSedeInventario)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={filtroSedeInventario}
                  onChange={e => setFiltroSedeInventario(e.target.value)}
                  className="max-w-[132px] rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-black text-slate-600 outline-none transition focus:border-cyan-200 focus:ring-2 focus:ring-cyan-100"
                  title="Filtrar por sede"
                >
                  <option value="todas">Todas</option>
                  {SEDES.map(item => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
                <button
                  onClick={() => navigate('/productos-admin')}
                  className="w-10 h-10 rounded-2xl bg-slate-50 text-slate-500 flex items-center justify-center hover:bg-cyan-50 hover:text-cyan-600 transition-all"
                  title="Ver todos los productos"
                >
                  <Eye size={18} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Productos</p>
                <p className="text-2xl font-black text-slate-900">{productosInventario.length}</p>
              </div>
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Unidades</p>
                <p className="text-2xl font-black text-slate-900">{totalProductosRegistrados}</p>
              </div>
            </div>
            
            <div className="space-y-3 max-h-[320px] overflow-y-auto pr-2">
              {isLoadingProductos ? (
                [1,2,3].map(i => <div key={i} className="h-16 bg-slate-50 rounded-2xl animate-pulse" />)
              ) : productosInventario.length === 0 ? (
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                  <p className="text-sm font-black text-slate-700">No hay productos registrados</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    {filtroSedeInventario === 'todas' ? 'Agrega el primero desde el formulario' : `Sin inventario en ${getSedeLabel(filtroSedeInventario)}`}
                  </p>
                </div>
              ) : productosInventario.map(producto => (
                <div key={producto.id} className="flex items-center justify-between gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100/50 hover:bg-white hover:border-cyan-100 transition-all">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                      {producto.imagen ? (
                        <img src={producto.imagen} alt={producto.nombre} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                      ) : (
                        <Package size={18} className="text-slate-300" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-800 truncate">{producto.nombre}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{producto.cantidad || 0} unidades · {getSedeLabel(producto.sede)}</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-slate-300 shrink-0" />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-[32px] border border-slate-100 p-6 shadow-sm">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Users size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Usuarios</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Personal con acceso</p>
              </div>
            </div>
            
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {isLoading ? (
                [1,2,3].map(i => <div key={i} className="h-16 bg-slate-50 rounded-2xl animate-pulse" />)
              ) : usuarios.map(u => (
                <div key={u.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100/50 group hover:bg-white hover:border-indigo-100 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-black text-slate-400 text-xs">
                      {u.nombre?.substring(0,2).toUpperCase() || 'U'}
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-800">{u.nombre}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{u.rol || 'Operador'} · {getSedeLabel(u.sede)}</p>
                    </div>
                  </div>
                  <button onClick={() => handleEliminarUsuario(u.id)} className="w-8 h-8 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* ── MODAL DE ÉXITO ── */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={() => setShowSuccessModal(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-[32px] p-8 shadow-2xl text-center">
            <button
              onClick={() => setShowSuccessModal(false)}
              className="absolute top-4 right-4 w-9 h-9 rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all flex items-center justify-center"
            >
              <X size={18} />
            </button>
            <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-5">
              <CheckCircle2 size={32} />
            </div>
            <h2 className="text-xl font-black text-slate-900 mb-2">Producto agregado</h2>
            <p className="text-sm font-semibold text-slate-500 mb-7">Los productos se agregaron con exito al inventario.</p>
            <button
              onClick={() => setShowSuccessModal(false)}
              className="w-full bg-slate-900 py-4 rounded-2xl text-white font-black text-xs uppercase tracking-widest hover:bg-emerald-600 transition-all"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL EXPORTACIÓN ── */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={() => setShowExportModal(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-[40px] p-8 shadow-2xl">
            <h2 className="text-xl font-black text-slate-900 mb-2">Exportar Datos</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Selecciona sede y reporte</p>

            <div className="mb-5">
              <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">Sede</label>
              <select
                value={sedeExportacion}
                onChange={e => setSedeExportacion(e.target.value)}
                className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700 outline-none transition focus:border-indigo-200 focus:ring-2 focus:ring-indigo-100"
              >
                <option value="todas">Todas las sedes</option>
                {SEDES.map(item => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </div>
            
            <div className="space-y-3">
              <button 
                onClick={() => exportToExcel('productos')}
                disabled={isExporting}
                className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all group disabled:opacity-70"
              >
                <div className="flex items-center gap-3">
                  {isExporting ? <Loader2 className="text-indigo-500 animate-spin" size={20} /> : <Package className="text-indigo-500" size={20} />}
                  <span className="text-sm font-black text-slate-700">Inventario Actual</span>
                </div>
                <ChevronRight size={18} className="text-slate-300 group-hover:text-indigo-500" />
              </button>

              <button 
                onClick={() => exportToExcel('historial')}
                disabled={isExporting}
                className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all group disabled:opacity-70"
              >
                <div className="flex items-center gap-3">
                  {isExporting ? <Loader2 className="text-indigo-500 animate-spin" size={20} /> : <Clock className="text-indigo-500" size={20} />}
                  <span className="text-sm font-black text-slate-700">Historial de Entregas</span>
                </div>
                <ChevronRight size={18} className="text-slate-300 group-hover:text-indigo-500" />
              </button>
            </div>

            <button 
              onClick={() => setShowExportModal(false)}
              className="w-full mt-8 py-4 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-all"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

function mergeProductosForExport(localProductos, firestoreProductos) {
  const productosMap = new Map();
  [...firestoreProductos, ...localProductos].forEach(producto => {
    if (!producto?.id) return;
    productosMap.set(producto.id, normalizeProducto(producto));
  });
  return Array.from(productosMap.values());
}

function filterItemsBySede(items, sede) {
  if (sede === 'todas') return items;
  return items.filter(item => (item?.sede || DEFAULT_SEDE) === sede);
}

function normalizeProducto(producto) {
  return {
    ...producto,
    id: producto?.id || uuidv4(),
    nombre: producto?.nombre || 'Sin nombre',
    cantidad: parseInt(producto?.cantidad) || 0,
    tallas: producto?.tallas && typeof producto.tallas === 'object' ? producto.tallas : {},
    imagen: typeof producto?.imagen === 'string' ? producto.imagen : '',
    sede: producto?.sede || DEFAULT_SEDE
  };
}

export default AdminDashboard;
