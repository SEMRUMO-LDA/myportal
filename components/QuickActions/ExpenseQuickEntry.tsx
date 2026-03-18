import React, { useState, useEffect, useRef } from 'react';
import { Receipt, Camera, Upload, X, CheckCircle } from 'lucide-react';
import { User } from '../../types';
import { supabase } from '../../services/supabaseClient';
import { useToast } from '../../context/ToastContext';
import QuickActionCard from './QuickActionCard';

interface ExpenseQuickEntryProps {
  user: User;
}

interface ExpenseCategory {
  id: number;
  name: string;
}

const ExpenseQuickEntry: React.FC<ExpenseQuickEntryProps> = ({ user }) => {
  const [showModal, setShowModal] = useState(false);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();

  useEffect(() => {
    if (showModal) {
      fetchCategories();
    }
  }, [showModal]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('expense_categories')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setCategories(data || []);

      // Select first category by default
      if (data && data.length > 0 && !selectedCategory) {
        setSelectedCategory(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching expense categories:', error);
      addToast('error', 'Erro ao carregar categorias.');
    }
  };

  const handleImageCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      addToast('error', 'Imagem muito grande. Máximo 5MB.');
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      addToast('error', 'Por favor selecione uma imagem.');
      return;
    }

    setImageFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setReceiptImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setReceiptImage(null);
    setImageFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!amount || parseFloat(amount) <= 0) {
      addToast('error', 'Por favor insira um valor válido.');
      return;
    }

    if (!selectedCategory) {
      addToast('error', 'Por favor selecione uma categoria.');
      return;
    }

    if (!imageFile) {
      addToast('error', 'Por favor adicione uma foto do recibo.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload image to Supabase Storage
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `expense_receipts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(filePath, imageFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('receipts')
        .getPublicUrl(filePath);

      // Create expense record
      const { error: insertError } = await supabase
        .from('expenses')
        .insert({
          user_id: user.id,
          category_id: selectedCategory,
          amount: parseFloat(amount),
          description: description || 'Despesa rápida via Kiosk',
          receipt_url: urlData.publicUrl,
          expense_date: new Date().toISOString().split('T')[0],
          status: 'PENDING'
        });

      if (insertError) throw insertError;

      addToast('success', '✅ Despesa registada com sucesso!');

      // Reset form
      setAmount('');
      setDescription('');
      setReceiptImage(null);
      setImageFile(null);
      setShowModal(false);
    } catch (error) {
      console.error('Error submitting expense:', error);
      addToast('error', 'Erro ao registar despesa.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (value: string): string => {
    // Remove non-numeric characters except decimal point
    const cleaned = value.replace(/[^\d.]/g, '');
    const parts = cleaned.split('.');

    // Keep only first decimal point
    if (parts.length > 2) {
      return parts[0] + '.' + parts.slice(1).join('');
    }

    // Limit to 2 decimal places
    if (parts[1] && parts[1].length > 2) {
      return parts[0] + '.' + parts[1].substring(0, 2);
    }

    return cleaned;
  };

  return (
    <>
      <QuickActionCard
        icon={Receipt}
        title="Despesa Rápida"
        description="Registar despesa"
        color="purple"
        badge="Foto"
        onClick={() => setShowModal(true)}
      />

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white p-6 border-b border-gray-100 flex justify-between items-center rounded-t-3xl">
              <h2 className="text-2xl font-bold text-gray-900">Registar Despesa</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Receipt image upload */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Foto do Recibo *
                </label>

                {!receiptImage ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-purple-400 transition-colors">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleImageCapture}
                      className="hidden"
                      id="receipt-upload"
                    />
                    <label
                      htmlFor="receipt-upload"
                      className="cursor-pointer flex flex-col items-center gap-3"
                    >
                      <div className="bg-purple-100 p-4 rounded-full">
                        <Camera size={32} className="text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-700 mb-1">
                          Tirar Foto ou Escolher da Galeria
                        </p>
                        <p className="text-xs text-gray-500">
                          PNG, JPG até 5MB
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-purple-600 font-semibold">
                        <Upload size={18} />
                        <span>Selecionar</span>
                      </div>
                    </label>
                  </div>
                ) : (
                  <div className="relative rounded-xl overflow-hidden border-2 border-purple-200">
                    <img
                      src={receiptImage}
                      alt="Receipt preview"
                      className="w-full h-48 object-cover"
                    />
                    <button
                      onClick={handleRemoveImage}
                      className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg transition-all"
                    >
                      <X size={18} />
                    </button>
                  </div>
                )}
              </div>

              {/* Amount */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Valor *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-lg">
                    €
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(formatCurrency(e.target.value))}
                    placeholder="0.00"
                    className="w-full pl-10 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all text-lg font-bold"
                  />
                </div>
              </div>

              {/* Category */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Categoria *
                </label>
                <select
                  value={selectedCategory || ''}
                  onChange={(e) => setSelectedCategory(parseInt(e.target.value))}
                  className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all font-semibold"
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description (optional) */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Descrição (opcional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Almoço de trabalho com cliente..."
                  rows={3}
                  maxLength={200}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all resize-none"
                />
                <p className="text-xs text-gray-500 mt-1 text-right">
                  {description.length}/200
                </p>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !amount || !selectedCategory || !imageFile}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-xl transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                      A enviar...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={20} />
                      Registar Despesa
                    </>
                  )}
                </button>

                <button
                  onClick={() => setShowModal(false)}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl transition-all"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ExpenseQuickEntry;
