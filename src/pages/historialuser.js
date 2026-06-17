import React, { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";
import { 
  Package, Clock, X, BoxSelect, User, 
  Hash, Ruler, Calendar, ChevronRight, Search, 
  ArrowLeft, ClipboardList, ChevronDown
} from "lucide-react";

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const formatFecha = (fecha) => {
  if (!fecha) return "—";
  const date = fecha.seconds ? new Date(fecha.seconds * 1000) : new Date(fecha);
  if (isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// ─── COMPONENTES DE APOYO ─────────────────────────────────────────────────────

const Badge = ({ children, variant = "default" }) => {
  const styles = {
    default: "bg-slate-100 text-slate-600",
    success: "bg-emerald-50 text-emerald-600 border border-emerald-100/50",
    indigo: "bg-indigo-50 text-indigo-600 border border-indigo-100/50",
  };
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg ${styles[variant]}`}>
      {children}
    </span>
  );
};

const SkeletonCard = () => (
  <div className="bg-white rounded-[24px] p-5 border border-slate-100 shadow-sm animate-pulse flex gap-4">
    <div className="w-16 h-16 bg-slate-100 rounded-2xl" />
    <div className="flex-1 space-y-3">
      <div className="h-4 bg-slate-100 rounded w-1/2" />
      <div className="h-3 bg-slate-100 rounded w-1/4" />
      <div className="flex gap-2">
        <div className="h-5 bg-slate-100 rounded-full w-12" />
        <div className="h-5 bg-slate-100 rounded-full w-12" />
      </div>
    </div>
  </div>
);

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

function Historial() {
  const [historial, setHistorial] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Lógica para "Ver más"
  const ITEMS_PER_PAGE = 5;
  const [visibleItems, setVisibleItems] = useState(ITEMS_PER_PAGE);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchHistorial = async () => {
      try {
        const q = query(collection(db, "historial"), orderBy("fecha", "desc"));
        const snap = await getDocs(q);
        setHistorial(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchHistorial();
  }, []);

  const filteredData = historial.filter(item => 
    item.productoNombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.entregadoA?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const displayedData = filteredData.slice(0, visibleItems);
  const hasMore = visibleItems < filteredData.length;

  const handleLoadMore = () => {
    setVisibleItems(prev => prev + ITEMS_PER_PAGE);
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] pb-10 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-lg font-black text-slate-900 tracking-tight">Historial</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {filteredData.length} registros totales
              </p>
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-200">
            <Clock size={18} strokeWidth={2.5} />
          </div>
        </div>
      </header>

      {/* ── BUSCADOR ───────────────────────────────────────────────────────── */}
      <div className="max-w-2xl mx-auto px-6 mt-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
          <input 
            type="text"
            placeholder="Buscar en el historial..."
            className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-semibold placeholder:text-slate-300 focus:ring-2 focus:ring-indigo-500/10 transition-all"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setVisibleItems(ITEMS_PER_PAGE);
            }}
          />
        </div>
      </div>

      {/* ── LISTADO ────────────────────────────────────────────────────────── */}
      <main className="max-w-2xl mx-auto px-6 mt-8 space-y-3">
        {loading ? (
          [1, 2, 3].map(i => <SkeletonCard key={i} />)
        ) : displayedData.length === 0 ? (
          <div className="py-20 text-center">
            <BoxSelect size={48} className="mx-auto text-slate-100 mb-4" strokeWidth={1} />
            <p className="text-slate-400 text-sm font-bold">No hay registros disponibles</p>
          </div>
        ) : (
          <>
            {displayedData.map((item) => (
              <div
                key={item.id}
                onClick={() => { setSelectedItem(item); setModalOpen(true); }}
                className="group bg-white border border-slate-100 rounded-[24px] p-4 flex items-center gap-4 hover:border-indigo-100 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 cursor-pointer active:scale-[0.98]"
              >
                <div className="relative shrink-0">
                  {item.evidenciaFoto ? (
                    <img src={item.evidenciaFoto} className="w-14 h-14 rounded-2xl object-cover shadow-sm" alt="" />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100">
                      <Package size={20} className="text-slate-200" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-0.5">
                    <h2 className="text-sm font-bold text-slate-800 truncate">{item.productoNombre}</h2>
                    <span className="text-[9px] font-bold text-slate-300 uppercase">{formatFecha(item.fecha)}</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-400 truncate mb-2">{item.entregadoA}</p>
                  <div className="flex gap-1.5">
                    <Badge variant="indigo">Talla {item.talla}</Badge>
                    <Badge variant="success">{item.cantidadEntregada} Unid.</Badge>
                  </div>
                </div>

                <div className="text-slate-200 group-hover:text-indigo-400 transition-colors">
                  <ChevronRight size={18} />
                </div>
              </div>
            ))}

            {hasMore && (
              <button 
                onClick={handleLoadMore}
                className="w-full py-4 mt-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-center gap-2 text-slate-500 hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-100 transition-all group shadow-sm"
              >
                <span className="text-xs font-black uppercase tracking-widest">Ver entregas anteriores</span>
                <ChevronDown size={16} className="group-hover:translate-y-0.5 transition-transform" />
              </button>
            )}

            {!hasMore && filteredData.length > ITEMS_PER_PAGE && (
              <p className="text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest py-6">
                Has llegado al final del historial
              </p>
            )}
          </>
        )}
      </main>

      {/* ── MODAL DE DETALLE ───────────────────────────────────────────────── */}
      {modalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-[2px]" onClick={() => setModalOpen(false)} />
          
          <div className="relative w-full max-w-md bg-white rounded-[32px] overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] animate-in slide-in-from-bottom-full duration-500 ease-out">
            <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mt-3 sm:hidden" />
            <div className="px-8 pt-6 pb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <ClipboardList size={20} />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 tracking-tight">Detalle de Entrega</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Resumen del registro</p>
                </div>
              </div>
              <button onClick={() => setModalOpen(false)} className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="px-8 pb-8">
              {selectedItem.evidenciaFoto && (
                <div className="mb-6 relative">
                  <img src={selectedItem.evidenciaFoto} className="w-full h-44 object-cover rounded-[24px]" alt="" />
                </div>
              )}
              <div className="space-y-3">
                <InfoRow icon={<Package size={16}/>} label="Producto" value={selectedItem.productoNombre} />
                <InfoRow icon={<User size={16}/>} label="Entregado a" value={selectedItem.entregadoA} />
                <div className="grid grid-cols-2 gap-3">
                  <InfoBox label="Talla" value={selectedItem.talla} />
                  <InfoBox label="Cantidad" value={`${selectedItem.cantidadEntregada} Unid.`} />
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100/50 mt-2">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-slate-400" />
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tighter">Fecha y Hora</span>
                  </div>
                  <span className="text-xs font-black text-slate-700">{formatFecha(selectedItem.fecha)}</span>
                </div>
              </div>
              <button onClick={() => setModalOpen(false)} className="w-full mt-8 bg-slate-900 py-4 rounded-2xl text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-indigo-600 transition-all active:scale-[0.98]">
                Cerrar Detalles
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

const InfoRow = ({ icon, label, value }) => (
  <div className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100/50">
    <div className="flex items-center gap-3">
      <div className="text-indigo-400">{icon}</div>
      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tighter">{label}</span>
    </div>
    <span className="text-sm font-extrabold text-slate-800 max-w-[150px] truncate">{value || 'N/A'}</span>
  </div>
);

const InfoBox = ({ label, value }) => (
  <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100/50">
    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">{label}</span>
    <span className="text-sm font-black text-slate-800">{value || '—'}</span>
  </div>
);

export default Historial;