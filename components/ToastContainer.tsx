
import React, { useEffect } from 'react';
import { ToastMessage } from '../types';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

interface ToastContainerProps {
  toasts: ToastMessage[];
  removeToast: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, removeToast }) => {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} removeToast={removeToast} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; removeToast: (id: string) => void }> = ({ toast, removeToast }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      removeToast(toast.id);
    }, toast.duration || 4000);

    return () => clearTimeout(timer);
  }, [toast, removeToast]);

  const getStyles = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-white border-l-4 border-green-500 text-gray-800 shadow-lg';
      case 'error':
        return 'bg-white border-l-4 border-red-500 text-gray-800 shadow-lg';
      case 'warning':
        return 'bg-white border-l-4 border-orange-500 text-gray-800 shadow-lg';
      default:
        return 'bg-white border-l-4 border-blue-500 text-gray-800 shadow-lg';
    }
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success': return <CheckCircle size={20} className="text-green-500" />;
      case 'error': return <AlertCircle size={20} className="text-red-500" />;
      case 'warning': return <AlertTriangle size={20} className="text-orange-500" />;
      default: return <Info size={20} className="text-blue-500" />;
    }
  };

  return (
    <div className={`${getStyles()} p-4 rounded-r-lg flex items-center gap-3 min-w-[300px] max-w-md animate-fade-in-up pointer-events-auto transform transition-all`}>
      <div className="shrink-0">{getIcon()}</div>
      <p className="text-sm font-medium flex-1">{toast.message}</p>
      <button onClick={() => removeToast(toast.id)} className="text-gray-400 hover:text-gray-600">
        <X size={16} />
      </button>
    </div>
  );
};

export default ToastContainer;
