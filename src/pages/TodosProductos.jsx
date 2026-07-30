import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

function TodosProductos() {
  const [productos, setProductos] = useState([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'productos'), (snapshot) => {
      const productosData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProductos(productosData);
    });

    return () => unsubscribe();
  }, []);

  const eliminarProducto = async (id) => {
    if (confirm('¿Estás seguro de que deseas eliminar este producto?')) {
      await deleteDoc(doc(db, 'productos', id));
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-center">Todos los Productos</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {productos.map(producto => (
          <div key={producto.id} className="bg-white shadow p-4 rounded flex flex-col items-center">
            {producto.imagen && (
              <img src={producto.imagen} alt={producto.nombre} className="w-24 h-24 object-cover mb-2" loading="lazy" decoding="async" />
            )}
            <h3 className="font-semibold">{producto.nombre}</h3>
            <p className="mb-2">Cantidad: {producto.cantidad}</p>
            <button
              onClick={() => eliminarProducto(producto.id)}
              className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
            >
              Eliminar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TodosProductos;
