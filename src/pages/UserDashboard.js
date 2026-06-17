import React, { useEffect, useState, useMemo } from 'react';
import { collection, onSnapshot, doc, updateDoc, addDoc, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../firebase';
import { getAuth, signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { 
  Package, Search, Clock, LogOut, X, 
  ChevronRight, Camera, AlertTriangle, 
  CheckCircle2, Loader2, User, Hash, 
  Ruler, LayoutDashboard, Info, Image as ImageIcon
} from 'lucide-react';

// Importación del historial (asumiendo que existe en la misma carpeta)
import Historial from './historialuser';

// ─── COMPONENTES DE APOYO ─────────────────────────────────────────────────────

const Badge = ({ children, variant = "default" }) => {
  const styles = {
    default: "bg-slate-100 text-slate-600",
    success: "bg-emerald-50 text-emerald-600 border border-emerald-100/50",
    warning: "bg-amber-50 text-amber-600 border border-amber-100/50",
    danger: "bg-red-50 text-red-600 border border-red-100/50",
    indigo: "bg-indigo-50 text-indigo-600 border border-indigo-100/50",
  };
  return (
    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg ${styles[variant]}`}>
      {children}
    </span>
  );
};

const InputField = ({ label, error, icon: Icon, ...props }) => (
  <div className="space-y-1.5 w-full">
    {label && <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>}
    <div className="relative">
      {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />}
      <input 
        {...props}
        className={`w-full bg-slate-50 border-none rounded-2xl py-4 ${Icon ? 'pl-12' : 'px-4'} pr-4 text-sm font-semibold placeholder:text-slate-300 focus:ring-2 transition-all ${error ? 'ring-2 ring-red-100' : 'focus:ring-indigo-500/10'}`}
      />
    </div>
    {error && <p className="text-[10px] font-bold text-red-500 ml-1 flex items-center gap-1"><AlertTriangle size={10}/> {error}</p>}
  </div>
);

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

function UserDashboard() {
  const [productos, setProductos] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [modalEntregarOpen, setModalEntregarOpen] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [cantidadEntregar, setCantidadEntregar] = useState(1);
  const [entregadoA, setEntregadoA] = useState('');
  const [cedula, setCedula] = useState('');
  const [genero, setGenero] = useState('');
  const [talla, setTalla] = useState('');
  const [evidenciaFoto, setEvidenciaFoto] = useState(null);
  const [evidenciaDanio, setEvidenciaDanio] = useState(null);
  const [isUserBlocked, setIsUserBlocked] = useState(false);
  const [isBlockedForAllProducts, setIsBlockedForAllProducts] = useState(false);
  const [showEvidenciaDanio, setShowEvidenciaDanio] = useState(false);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const navigate = useNavigate();

  // ─── LÓGICA ORIGINAL (MANTENIDA) ────────────────────────────────────────────

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(user => {
      if (!user) navigate('/login');
    });

    const unsubscribeProducts = onSnapshot(
      collection(db, 'productos'),
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProductos(data);
        setIsLoading(false);
      },
      (err) => {
        setError('Error al cargar productos');
        setIsLoading(false);
      }
    );

    return () => {
      unsubscribeAuth();
      unsubscribeProducts();
    };
  }, [navigate]);

  const handleLogout = async () => {
    try {
      const authInstance = getAuth();
      await signOut(authInstance);
      navigate('/login');
    } catch (e) { console.error(e); }
  };

  const isSizeFilteredProduct = (producto) => {
    if (!producto) return false;
    const nombreLower = producto.nombre.toLowerCase().trim();
    return (
      nombreLower.includes('camiseta') || nombreLower.includes('guante') ||
      nombreLower.includes('bota') || nombreLower.includes('pantalon') ||
      nombreLower.includes('gorras') || nombreLower.includes('chaleco') ||
      ['manga_larga', 'polo', 'operativa', 'guantes', 'botas', 'pantalones'].includes(producto.tipo?.toLowerCase())
    );
  };

  const checkUserBlocked = async (cedulaVal, productoId, productoNombre) => {
    try {
      if (!cedulaVal || !productoId || !productoNombre) return false;
      const normalizedName = productoNombre.toLowerCase().trim();
      let period = 6;
      if (normalizedName.includes('bota')) period = 6;
      else if (normalizedName.includes('pantalon')) period = 4;
      else if (normalizedName.includes('gafa') || normalizedName.includes('guante')) period = 1;
      else if (normalizedName.includes('casco')) period = 12;

      const date = new Date();
      date.setMonth(date.getMonth() - period);

      const q = query(
        collection(db, 'historial'),
        where('cedula', '==', cedulaVal.trim()),
        where('productoId', '==', productoId),
        where('fecha', '>=', date)
      );
      const snap = await getDocs(q);
      return !snap.empty;
    } catch (e) { 
      console.error(e);
      return false; 
    }
  };

  const checkUserBlockedForAll = async (cedulaVal) => {
    try {
      if (!cedulaVal) return false;
      const q = query(
        collection(db, 'historial'), 
        where('cedula', '==', cedulaVal.trim()), 
        orderBy('fecha', 'desc'), 
        limit(1)
      );
      const snap = await getDocs(q);
      return false; 
    } catch (e) { return false; }
  };

  const validateForm = () => {
    const errors = {};
    if (!entregadoA.trim()) errors.entregadoA = 'Requerido';
    if (!cedula.match(/^\d{8,}$/)) errors.cedula = 'Cédula inválida';
    if (!evidenciaFoto) errors.evidenciaFoto = 'Sube foto de evidencia';
    if (isSizeFilteredProduct(productoSeleccionado)) {
      if (!genero) errors.genero = 'Selecciona género';
      if (!talla) errors.talla = 'Selecciona talla';
    }
    if ((showEvidenciaDanio || isBlockedForAllProducts) && !evidenciaDanio) {
      errors.evidenciaDanio = 'Sube evidencia de daño';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const entregarProducto = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);
      const isBlocked = await checkUserBlocked(cedula, productoSeleccionado.id, productoSeleccionado.nombre);
      
      if (isBlocked && !evidenciaDanio) {
        alert('Esta persona ya recibió este producto recientemente. Se requiere evidencia de daño.');
        setShowEvidenciaDanio(true);
        setIsSubmitting(false);
        return;
      }

      const fotoRef = ref(storage, `historial/${uuidv4()}-${evidenciaFoto.name}`);
      const snapFoto = await uploadBytes(fotoRef, evidenciaFoto);
      const fotoURL = await getDownloadURL(snapFoto.ref);

      let danioURL = null;
      if (evidenciaDanio) {
        const danioRef = ref(storage, `danios/${uuidv4()}-${evidenciaDanio.name}`);
        const snapDanio = await uploadBytes(danioRef, evidenciaDanio);
        danioURL = await getDownloadURL(snapDanio.ref);
      }

      const updateData = { cantidad: productoSeleccionado.cantidad - cantidadEntregar };
      if (isSizeFilteredProduct(productoSeleccionado)) {
        const newTallas = { ...productoSeleccionado.tallas };
        newTallas[genero][talla].cantidad -= cantidadEntregar;
        updateData.tallas = newTallas;
      }

      await updateDoc(doc(db, 'productos', productoSeleccionado.id), updateData);
      await addDoc(collection(db, 'historial'), {
        productoId: productoSeleccionado.id,
        productoNombre: productoSeleccionado.nombre,
        cantidadEntregada: cantidadEntregar,
        entregadoA,
        cedula: cedula.trim(),
        talla,
        genero: isSizeFilteredProduct(productoSeleccionado) ? genero : null,
        entregadoPor: auth.currentUser?.email || 'operador',
        fecha: new Date(),
        evidenciaFoto: fotoURL,
        evidenciaDanio: danioURL,
      });

      alert('Entrega registrada con éxito');
      setModalEntregarOpen(false);
      // Reset form
      setEntregadoA('');
      setCedula('');
      setEvidenciaFoto(null);
      setEvidenciaDanio(null);
      setShowEvidenciaDanio(false);
    } catch (e) {
      console.error(e);
      setError('Error al registrar entrega');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── FILTROS Y MEMO ─────────────────────────────────────────────────────────

  const filteredProductos = productos.filter(p => 
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const availableGeneros = useMemo(() => 
    productoSeleccionado?.tallas ? Object.keys(productoSeleccionado.tallas) : [], 
  [productoSeleccionado]);

  const availableTallas = useMemo(() => 
    genero && productoSeleccionado?.tallas?.[genero] ? Object.keys(productoSeleccionado.tallas[genero]) : [], 
  [genero, productoSeleccionado]);

  // ─── RENDERIZADO ────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#FDFDFD] pb-32 font-sans selection:bg-indigo-100">
      
      {/* ── NAVBAR PREMIUM ── */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100">
              <LayoutDashboard size={20} />
            </div>
            <h1 className="text-lg font-black text-slate-900 tracking-tight">Entrega<span className="text-indigo-600">Pro</span></h1>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setMostrarHistorial(!mostrarHistorial)}
              className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${mostrarHistorial ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600'}`}
            >
              <Clock size={20} />
            </button>
            <button onClick={handleLogout} className="w-10 h-10 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-all">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-6 pt-8">
        {mostrarHistorial ? (
          <Historial />
        ) : (
          <>
            {/* Buscador */}
            <div className="relative mb-8">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input 
                type="text"
                placeholder="Buscar producto por nombre..."
                className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-semibold placeholder:text-slate-300 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Listado de Productos */}
            <div className="space-y-4">
              {isLoading ? (
                [1,2,3].map(i => <div key={i} className="h-24 bg-slate-50 rounded-[24px] animate-pulse" />)
              ) : filteredProductos.length === 0 ? (
                <div className="text-center py-20">
                  <Package size={48} className="mx-auto text-slate-100 mb-4" />
                  <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">No hay productos</p>
                </div>
              ) : filteredProductos.map((p) => (
                <div 
                  key={p.id}
                  onClick={() => { setProductoSeleccionado(p); setModalEntregarOpen(true); }}
                  className="group bg-white border border-slate-100 rounded-[28px] p-4 flex items-center gap-4 hover:border-indigo-100 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 cursor-pointer active:scale-[0.98]"
                >
                  <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center overflow-hidden border border-slate-100">
                    {p.imagen ? <img src={p.imagen} className="w-full h-full object-cover" alt="" /> : <Package size={24} className="text-slate-200" />}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-black text-slate-800 mb-1">{p.nombre}</h3>
                    <div className="flex gap-2">
                      <Badge variant={p.cantidad > 5 ? "success" : "warning"}>{p.cantidad} disponibles</Badge>
                      {isSizeFilteredProduct(p) && <Badge variant="indigo">Con Tallas</Badge>}
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                    <ChevronRight size={18} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {/* ── MODAL DE ENTREGA ── */}
      {modalEntregarOpen && productoSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-[2px]" onClick={() => setModalEntregarOpen(false)} />
          
          <div className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl animate-in slide-in-from-bottom-full duration-500 overflow-hidden">
            <div className="px-8 pt-8 pb-6 border-b border-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900">Entregar Producto</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase truncate max-w-[180px]">{productoSeleccionado.nombre}</p>
                </div>
              </div>
              <button onClick={() => setModalEntregarOpen(false)} className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={entregarProducto} className="px-8 py-6 space-y-5 max-h-[70vh] overflow-y-auto">
              <InputField 
                label="Entregado a" 
                placeholder="Nombre completo" 
                icon={User} 
                value={entregadoA} 
                onChange={e => setEntregadoA(e.target.value)}
                error={formErrors.entregadoA}
              />

              <InputField 
                label="Cédula" 
                placeholder="Número de identificación" 
                icon={Hash} 
                type="number"
                value={cedula} 
                onChange={e => setCedula(e.target.value)}
                error={formErrors.cedula}
              />

              {isSizeFilteredProduct(productoSeleccionado) ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Género</label>
                    <select 
                      className="w-full bg-slate-50 border-none rounded-2xl py-4 px-4 text-sm font-semibold focus:ring-2 focus:ring-indigo-500/10 transition-all"
                      value={genero}
                      onChange={e => { setGenero(e.target.value); setTalla(''); }}
                    >
                      <option value="">Seleccionar</option>
                      {availableGeneros.map(g => <option key={g} value={g}>{g.toUpperCase()}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Talla</label>
                    <select 
                      disabled={!genero}
                      className="w-full bg-slate-50 border-none rounded-2xl py-4 px-4 text-sm font-semibold focus:ring-2 focus:ring-indigo-500/10 transition-all disabled:opacity-50"
                      value={talla}
                      onChange={e => setTalla(e.target.value)}
                    >
                      <option value="">Seleccionar</option>
                      {availableTallas.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
              ) : (
                <InputField label="Talla (Opcional)" placeholder="Ej. L, XL, 40" icon={Ruler} value={talla} onChange={e => setTalla(e.target.value)} />
              )}

              {/* Evidencias */}
              <div className="grid grid-cols-2 gap-4">
                <label className="cursor-pointer group">
                  <input type="file" className="hidden" onChange={e => setEvidenciaFoto(e.target.files[0])} />
                  <div className={`h-24 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center transition-all ${evidenciaFoto ? 'border-emerald-200 bg-emerald-50 text-emerald-600' : 'border-slate-100 bg-slate-50 text-slate-400 group-hover:border-indigo-200 group-hover:bg-indigo-50 group-hover:text-indigo-600'}`}>
                    <Camera size={20} className="mb-1" />
                    <span className="text-[10px] font-black uppercase">{evidenciaFoto ? 'Foto Lista' : 'Evidencia'}</span>
                  </div>
                </label>

                {(showEvidenciaDanio || isBlockedForAllProducts) && (
                  <label className="cursor-pointer group animate-in zoom-in-95">
                    <input type="file" className="hidden" onChange={e => setEvidenciaDanio(e.target.files[0])} />
                    <div className={`h-24 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center transition-all ${evidenciaDanio ? 'border-red-200 bg-red-50 text-red-600' : 'border-amber-100 bg-amber-50 text-amber-400 group-hover:border-red-200 group-hover:bg-red-50 group-hover:text-red-600'}`}>
                      <AlertTriangle size={20} className="mb-1" />
                      <span className="text-[10px] font-black uppercase">{evidenciaDanio ? 'Daño Listo' : 'Evid. Daño'}</span>
                    </div>
                  </label>
                )}
              </div>

              <button 
                disabled={isSubmitting}
                className="w-full bg-slate-900 py-4 rounded-2xl text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-indigo-600 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                Confirmar Entrega
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default UserDashboard;