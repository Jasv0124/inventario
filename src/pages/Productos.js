import React, { useEffect, useState } from 'react';
import { collection, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { useNavigate, useLocation } from 'react-router-dom';
import { Trash2, Package, Clock, UserPlus, Edit2, Plus, X } from 'lucide-react';

function isSizeFilteredProduct(producto) {
  const nombreLower = producto.nombre.toLowerCase().trim();
  return (
    nombreLower.includes('camiseta') ||
    nombreLower.includes('guante') ||
    nombreLower.includes('bota') ||
    nombreLower.includes('pantalon') ||
    ['manga_larga', 'polo', 'operativa', 'guantes', 'botas', 'pantalones'].includes(producto.tipo?.toLowerCase())
  );
}

function ProductosAdmin() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [currentProducto, setCurrentProducto] = useState(null);
  const [formData, setFormData] = useState({ nombre: '', cantidad: 0, imagen: '', tallas: {} });
  const [imagenFile, setImagenFile] = useState(null);
  const [newGender, setNewGender] = useState('');
  const [newSize, setNewSize] = useState('');
  const [newSizeQuantity, setNewSizeQuantity] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchProductos = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'productos'));
        const lista = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setProductos(lista);
        setLoading(false);
      } catch (error) {
        console.error('Error al cargar productos:', error);
        alert('Error al cargar productos: ' + error.message);
        setLoading(false);
      }
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
      console.error('Error al eliminar producto:', error);
      alert('Error al eliminar producto: ' + error.message);
    }
  };

  const abrirModalEditar = (producto) => {
    setCurrentProducto(producto);
    setFormData({
      nombre: producto.nombre,
      cantidad: producto.cantidad || 0,
      imagen: producto.imagen || '',
      tallas: isSizeFilteredProduct(producto) ? (producto.tallas || {}) : {},
    });
    setImagenFile(null);
    setEditModalOpen(true);
    setFormErrors({});
  };

  const cerrarModalEditar = () => {
    setEditModalOpen(false);
    setCurrentProducto(null);
    setFormData({ nombre: '', cantidad: 0, imagen: '', tallas: {} });
    setImagenFile(null);
    setNewGender('');
    setNewSize('');
    setNewSizeQuantity('');
    setFormErrors({});
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'cantidad' ? parseInt(value) || 0 : value,
    }));
    setFormErrors(prevErrors => ({ ...prevErrors, [name]: '' }));
  };

  const handleImagenChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) {
        setFormErrors(prev => ({
          ...prev,
          imagen: 'Archivo inválido (solo imágenes, máx 5MB)',
        }));
        return;
      }
      setImagenFile(file);
      setFormErrors(prev => ({ ...prev, imagen: '' }));
    }
  };

  const addSizeToGender = () => {
    if (!newGender || !newSize.trim() || !newSizeQuantity) {
      setFormErrors({
        newGender: !newGender ? 'Selecciona un género' : '',
        newSize: !newSize.trim() ? 'Ingresa una talla' : '',
        newSizeQuantity: !newSizeQuantity ? 'Ingresa una cantidad' : '',
      });
      return;
    }

    if (isNaN(newSizeQuantity) || parseInt(newSizeQuantity) < 0) {
      setFormErrors({ newSizeQuantity: 'Cantidad debe ser un número no negativo' });
      return;
    }

    setFormData(prev => ({
      ...prev,
      tallas: {
        ...prev.tallas,
        [newGender]: {
          ...(prev.tallas[newGender] || {}),
          [newSize]: { cantidad: parseInt(newSizeQuantity) },
        },
      },
    }));
    setNewGender('');
    setNewSize('');
    setNewSizeQuantity('');
    setFormErrors({});
  };

  const removeSize = (gender, size) => {
    setFormData(prev => {
      const updatedTallas = { ...prev.tallas };
      delete updatedTallas[gender][size];
      if (Object.keys(updatedTallas[gender]).length === 0) {
        delete updatedTallas[gender];
      }
      return { ...prev, tallas: updatedTallas };
    });
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.nombre.trim()) {
      errors.nombre = 'El nombre es requerido';
    }
    if (isNaN(formData.cantidad) || formData.cantidad < 0) {
      errors.cantidad = 'Cantidad debe ser un número no negativo';
    }

    if (isSizeFilteredProduct({ nombre: formData.nombre })) {
      if (Object.keys(formData.tallas).length === 0) {
        errors.tallas = 'Debe haber al menos una talla para este producto';
      } else {
        const totalTallasCantidad = Object.values(formData.tallas).reduce((sum, tallas) => {
          return (
            sum +
            Object.values(tallas).reduce((subSum, { cantidad }) => subSum + (cantidad || 0), 0)
          );
        }, 0);
        if (totalTallasCantidad !== formData.cantidad) {
          errors.tallas = `La suma de cantidades de tallas (${totalTallasCantidad}) debe coincidir con la cantidad total (${formData.cantidad})`;
        }
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const guardarCambios = async (e) => {
    e.preventDefault();
    if (!currentProducto || !validateForm()) return;

    try {
      let imagenUrl = formData.imagen;

      if (imagenFile) {
        const storageRef = ref(storage, `productos/${currentProducto.id}/${imagenFile.name}`);
        await uploadBytes(storageRef, imagenFile);
        imagenUrl = await getDownloadURL(storageRef);
      }

      const updateData = {
        nombre: formData.nombre,
        cantidad: parseInt(formData.cantidad),
        imagen: imagenUrl,
        tallas: isSizeFilteredProduct({ nombre: formData.nombre }) ? formData.tallas : null,
      };

      const productoRef = doc(db, 'productos', currentProducto.id);
      await updateDoc(productoRef, updateData);

      setProductos(productos.map(p =>
        p.id === currentProducto.id ? { ...p, ...updateData } : p
      ));
      cerrarModalEditar();
      alert('Producto actualizado correctamente.');
    } catch (error) {
      console.error('Error al actualizar producto:', error);
      alert('Error al actualizar producto: ' + error.message);
    }
  };

  if (loading) return <p className="p-4 text-gray-600 text-center">Cargando productos...</p>;

  return (
    
    <div className="page-shell flex items-center justify-center">
      <div className="app-panel max-w-5xl flex flex-col transition-all duration-300 pb-28">
        <header className="flex justify-between items-center mb-8 relative">
          <div className="flex-1 text-center">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">Gestión de Productos (Admin)</h1>
          </div>
        </header>

        {productos.length === 0 ? (
          <p className="text-md text-gray-600 text-center">No hay productos registrados.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {productos.map(producto => (
              <div
                key={producto.id}
                className="surface-card flex flex-col items-center text-center"
              >
                {producto.imagen && (
                  <img
                    src={producto.imagen}
                    alt={producto.nombre}
                    className="w-24 h-24 object-contain rounded-2xl border border-slate-200 bg-slate-50 mb-3"
                  />
                )}
                <h2 className="text-xl font-semibold text-gray-900">{producto.nombre}</h2>
                <p className="text-sm text-gray-600 mb-3">
                  Cantidad: <span className="font-medium">{producto.cantidad}</span>
                </p>
                {isSizeFilteredProduct(producto) && producto.tallas && (
                  <div className="text-sm text-gray-600 mb-3

">
                    <p>Tallas:</p>
                    {Object.entries(producto.tallas).map(([genero, tallas]) => (
                      <div key={genero}>
                        <span className="font-medium">{genero.charAt(0).toUpperCase() + genero.slice(1)}: </span>
                        {Object.entries(tallas).map(([talla, { cantidad }]) => (
                          <span key={talla}>{talla} ({cantidad}), </span>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => abrirModalEditar(producto)}
                    className="flex items-center gap-2 rounded-2xl bg-teal-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-teal-700"
                  >
                    <Edit2 size={16} /> Editar
                  </button>
                  <button
                    onClick={() => eliminarProducto(producto.id)}
                    className="flex items-center gap-2 rounded-2xl bg-rose-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-rose-700"
                  >
                    <Trash2 size={16} /> Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal para editar producto */}
        {editModalOpen && currentProducto && (
          <div className="modal-backdrop">
            <div className="modal-card max-w-sm">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Editar Producto</h2>
                <button
                  type="button"
                  onClick={cerrarModalEditar}
                  className="text-gray-500 hover:text-gray-700 transition-colors duration-200"
                >
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={guardarCambios} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nombre</label>
                  <input
                    type="text"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleInputChange}
                    className="input-field mt-1"
                    required
                  />
                  {formErrors.nombre && <p className="text-red-500 text-xs mt-1">{formErrors.nombre}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Cantidad Total</label>
                  <input
                    type="number"
                    name="cantidad"
                    value={formData.cantidad}
                    onChange={handleInputChange}
                    className="input-field mt-1"
                    required
                    min="0"
                  />
                  {formErrors.cantidad && <p className="text-red-500 text-xs mt-1">{formErrors.cantidad}</p>}
                </div>
                {isSizeFilteredProduct({ nombre: formData.nombre }) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Tallas</label>
                    <div className="mt-2 space-y-2 max-h-40 overflow-y-auto pr-2">
                      {Object.entries(formData.tallas).map(([genero, tallas]) => (
                        <div key={genero} className="border border-gray-200 p-2 rounded-md bg-gray-50">
                          <h4 className="font-medium text-gray-800">{genero.charAt(0).toUpperCase() + genero.slice(1)}</h4>
                          {Object.entries(tallas).map(([talla, { cantidad }]) => (
                            <div key={talla} className="flex items-center justify-between mt-1 text-sm">
                              <span className="text-gray-600">{talla}: {cantidad}</span>
                              <button
                                type="button"
                                onClick={() => removeSize(genero, talla)}
                                className="text-red-500 hover:text-red-700 transition-colors duration-200"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      ))}
                      <div className="flex flex-col gap-2 mt-2">
                        <select
                          value={newGender}
                          onChange={(e) => {
                            setNewGender(e.target.value);
                            setFormErrors({ ...formErrors, newGender: '' });
                          }}
                          className="select-field"
                        >
                          <option value="">Selecciona género</option>
                          <option value="hombre">Hombre</option>
                          <option value="mujer">Mujer</option>
                          <option value="unisex">Unisex</option>
                        </select>
                        {formErrors.newGender && <p className="text-red-500 text-xs">{formErrors.newGender}</p>}
                        <input
                          type="text"
                          placeholder="Talla (ej. S, 40)"
                          value={newSize}
                          onChange={(e) => {
                            setNewSize(e.target.value);
                            setFormErrors({ ...formErrors, newSize: '' });
                          }}
                          className="input-field"
                        />
                        {formErrors.newSize && <p className="text-red-500 text-xs">{formErrors.newSize}</p>}
                        <input
                          type="number"
                          placeholder="Cantidad"
                          value={newSizeQuantity}
                          onChange={(e) => {
                            setNewSizeQuantity(e.target.value);
                            setFormErrors({ ...formErrors, newSizeQuantity: '' });
                          }}
                          className="input-field"
                          min="0"
                        />
                        {formErrors.newSizeQuantity && <p className="text-red-500 text-xs">{formErrors.newSizeQuantity}</p>}
                        <button
                          type="button"
                          onClick={addSizeToGender}
                          className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-emerald-700"
                        >
                          <Plus size={14} /> Agregar Talla
                        </button>
                      </div>
                      {formErrors.tallas && <p className="text-red-500 text-xs mt-1">{formErrors.tallas}</p>}
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Imagen</label>
                  {formData.imagen && (
                    <img
                      src={formData.imagen}
                      alt="Vista previa"
                      className="w-20 h-20 object-contain mt-2 rounded-md border border-gray-200"
                    />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleImagenChange}
                    className="mt-2 w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all duration-200"
                  />
                  <p className="text-xs text-gray-500 mt-1">Solo imágenes, máx. 5MB</p>
                  {formErrors.imagen && <p className="text-red-500 text-xs mt-1">{formErrors.imagen}</p>}
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <button
                    type="button"
                    onClick={cerrarModalEditar}
                    className="btn-secondary px-4 py-2"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn-primary px-4 py-2"
                  >
                    Guardar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Barra de navegación inferior fija */}
        <div className="bottom-nav sm:rounded-t-3xl">
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
