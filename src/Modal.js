function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow-lg w-full max-w-sm relative">
        <h2 className="text-xl font-semibold mb-4">{title}</h2>
        <div>{children}</div>
        <button onClick={onClose} className="absolute top-2 right-2 text-gray-500 hover:text-gray-700">&times;</button>
      </div>
    </div>
  );
}

export default Modal;
