import React, { useState } from 'react';
import { X, Trash2, Plus, Minus, ArrowRight, MessageCircle, ShoppingBag, ShieldCheck, Truck, Package, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { CartItem, Order } from '../types';
import { formatRupiah, getEffectivePrice, generateWhatsAppUrl } from '../lib/format';
import { StoreDb } from '../lib/supabase';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  onShowToast: (message: string) => void;
  whatsappNumber?: string;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onShowToast,
  whatsappNumber = '628567789981',
}) => {
  const [step, setStep] = useState<'cart' | 'checkout'>('cart');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => {
    const price = getEffectivePrice(item.product.price, item.product.discount_price);
    return sum + price * item.quantity;
  }, 0);

  const validateCheckout = (): boolean => {
    const errs: Record<string, string> = {};
    if (!customerName.trim()) {
      errs.customerName = 'Nama lengkap wajib diisi';
    }
    if (!customerPhone.trim()) {
      errs.customerPhone = 'Nomor WhatsApp wajib diisi';
    } else if (customerPhone.trim().replace(/\D/g, '').length < 9) {
      errs.customerPhone = 'Nomor WhatsApp minimal 9 digit';
    }
    if (!customerAddress.trim()) {
      errs.customerAddress = 'Alamat pengiriman wajib diisi lengkap';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleProcessCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCheckout()) return;

    setIsSubmitting(true);
    try {
      // 1. Generate WhatsApp URL with exact requested format
      const waUrl = generateWhatsAppUrl({
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerAddress: customerAddress.trim(),
        notes: notes.trim(),
        items,
        total: subtotal,
        whatsappNumber,
      });

      // 2. Persist order to database (Supabase / local store)
      const newOrder: Order = {
        id: 'ord-' + Date.now(),
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        customer_address: customerAddress.trim(),
        items: items.map(item => {
          const unitPrice = getEffectivePrice(item.product.price, item.product.discount_price);
          return {
            product_id: item.product.id,
            product_name: item.product.name,
            price: unitPrice,
            quantity: item.quantity,
            subtotal: unitPrice * item.quantity,
            image_url: item.product.image_url,
          };
        }),
        total: subtotal,
        notes: notes.trim() || undefined,
        status: 'baru',
        created_at: new Date().toISOString(),
      };

      await StoreDb.createOrder(newOrder);

      // 3. Trigger celebration confetti
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#D71920', '#99131A', '#ffffff', '#ffd700'],
        });
      } catch {
        // safe fallback
      }

      onShowToast('Membuka WhatsApp untuk mengirim pesanan...');
      
      // 4. Open WhatsApp official link
      window.open(waUrl, '_blank');

      // 5. Clean cart & reset state
      setTimeout(() => {
        onClearCart();
        setStep('cart');
        onClose();
        setIsSubmitting(false);
      }, 800);
    } catch (err) {
      console.error('Checkout error:', err);
      setIsSubmitting(false);
      onShowToast('Terjadi kesalahan saat memproses pesanan.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end animate-fadeIn">
      <div
        className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#D71920]" />
            <h2 className="font-extrabold text-slate-900 text-base sm:text-lg">
              {step === 'cart' ? `Keranjang Belanja (${totalQuantity})` : 'Formulir Checkout WhatsApp'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
            title="Tutup Keranjang"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center text-[#D71920] mb-4">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-slate-800 text-base mb-1">Keranjang Masih Kosong</h3>
              <p className="text-xs text-slate-500 max-w-xs mb-6">
                Belum ada produk yang Anda pilih. Jelajahi katalog PASGAR ARIF S dan temukan produk terbaik!
              </p>
              <button
                onClick={onClose}
                className="px-5 py-2.5 text-xs font-bold text-white bg-[#D71920] hover:bg-[#99131A] rounded-lg shadow-sm transition-all"
              >
                Mulai Belanja Sekarang
              </button>
            </div>
          ) : step === 'cart' ? (
            /* Items List */
            <div className="space-y-3">
              {items.map((item) => {
                const unitPrice = getEffectivePrice(item.product.price, item.product.discount_price);
                const itemTotal = unitPrice * item.quantity;

                return (
                  <div
                    key={item.product.id}
                    className="flex gap-3 p-3 bg-white border border-slate-200 rounded-xl shadow-2xs hover:border-slate-300 transition-all"
                  >
                    {/* Thumbnail with safe src guard */}
                    <div className="w-16 h-16 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-200 flex items-center justify-center">
                      {item.product.image_url ? (
                        <img
                          src={item.product.image_url}
                          alt={item.product.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Package className="w-6 h-6 text-slate-400" />
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 flex flex-col justify-between min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                          {item.product.name}
                        </h4>
                        <button
                          onClick={() => onRemoveItem(item.product.id)}
                          className="text-slate-400 hover:text-rose-600 p-0.5 rounded transition-colors"
                          title="Hapus barang"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="text-xs text-[#D71920] font-bold tabular-nums">
                        {formatRupiah(unitPrice)}
                      </div>

                      {/* Quantity Stepper & Subtotal */}
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                        <div className="flex items-center border border-slate-200 rounded-md bg-slate-50">
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                            className="p-1 text-slate-600 hover:bg-slate-200 transition-colors"
                            title="Kurangi"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-8 text-center text-xs font-bold text-slate-800 tabular-nums">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            disabled={item.quantity >= item.product.stock}
                            onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                            className="p-1 text-slate-600 hover:bg-slate-200 disabled:opacity-40 transition-colors"
                            title="Tambah"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <span className="text-xs font-extrabold text-slate-900 tabular-nums">
                          {formatRupiah(itemTotal)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Checkout Form */
            <form id="checkout-form" onSubmit={handleProcessCheckout} className="space-y-4">
              <div className="p-3 bg-red-50/70 border border-red-200/60 rounded-xl text-xs text-[#99131A] flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 text-[#D71920] mt-0.5" />
                <p>
                  Pesanan akan otomatis dirapikan dan diteruskan ke WhatsApp resmi kami di <strong>08567789981</strong> untuk konfirmasi ongkir & pengiriman.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nama Pelanggan <span className="text-[#D71920]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => {
                    setCustomerName(e.target.value);
                    if (errors.customerName) setErrors({ ...errors, customerName: '' });
                  }}
                  placeholder="Contoh: Bpk. Ahmad Pratama"
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:border-[#D71920] focus:ring-1 focus:ring-[#D71920] outline-hidden transition-all"
                />
                {errors.customerName && (
                  <p className="text-xs text-rose-600 mt-1">{errors.customerName}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nomor WhatsApp Anda <span className="text-[#D71920]">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => {
                    setCustomerPhone(e.target.value);
                    if (errors.customerPhone) setErrors({ ...errors, customerPhone: '' });
                  }}
                  placeholder="Contoh: 081234567890"
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:border-[#D71920] focus:ring-1 focus:ring-[#D71920] outline-hidden transition-all"
                />
                {errors.customerPhone && (
                  <p className="text-xs text-rose-600 mt-1">{errors.customerPhone}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Alamat Pengiriman Lengkap <span className="text-[#D71920]">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={customerAddress}
                  onChange={(e) => {
                    setCustomerAddress(e.target.value);
                    if (errors.customerAddress) setErrors({ ...errors, customerAddress: '' });
                  }}
                  placeholder="Nama jalan, nomor rumah, RT/RW, kelurahan, kecamatan, kota/kabupaten..."
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:border-[#D71920] focus:ring-1 focus:ring-[#D71920] outline-hidden transition-all"
                />
                {errors.customerAddress && (
                  <p className="text-xs text-rose-600 mt-1">{errors.customerAddress}</p>
                )}
              </div>

              {/* Pilihan Pengiriman: Cukup Dikirim Sales */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Pilihan Pengiriman</span>
                  <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    Resmi Pasgar
                  </span>
                </label>
                <div className="p-3.5 bg-red-50/70 border-2 border-[#D71920] rounded-xl flex items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#D71920] text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                        <span>Dikirim Sales</span>
                        <CheckCircle2 className="w-4 h-4 text-[#D71920]" />
                      </div>
                      <p className="text-[11px] text-slate-600 leading-tight mt-0.5">
                        Pesanan langsung diantar oleh Sales resmi PASGAR ARIF S ke alamat Anda
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-extrabold text-[#D71920] bg-white px-2.5 py-1 rounded-md border border-red-200 shrink-0 shadow-2xs">
                    Aktif
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Catatan Tambahan (Opsional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Misal: kirim sebelum jam 12 siang / titip di pos satpam"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:border-[#D71920] focus:ring-1 focus:ring-[#D71920] outline-hidden transition-all"
                />
              </div>

              {/* Order preview breakdown */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between font-medium">
                  <span>Jumlah Item:</span>
                  <span className="font-bold text-slate-900">{totalQuantity} barang</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Total Tagihan:</span>
                  <span className="font-extrabold text-[#D71920] text-sm tabular-nums">
                    {formatRupiah(subtotal)}
                  </span>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Drawer Footer with Actions */}
        {items.length > 0 && (
          <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 space-y-3">
            {step === 'cart' ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">Subtotal Belanja:</span>
                  <span className="text-lg font-extrabold text-[#D71920] tabular-nums">
                    {formatRupiah(subtotal)}
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onClearCart}
                    className="px-3 py-3 text-xs font-semibold text-slate-600 hover:text-rose-600 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors"
                    title="Kosongkan Keranjang"
                  >
                    Kosongkan
                  </button>

                  <button
                    type="button"
                    onClick={() => setStep('checkout')}
                    className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-[#D71920] hover:bg-[#99131A] text-white font-extrabold text-sm rounded-xl shadow-md hover:shadow-lg transition-all"
                  >
                    <span>Lanjut ke Checkout WhatsApp</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep('cart')}
                  className="px-4 py-3 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Kembali
                </button>

                <button
                  type="submit"
                  form="checkout-form"
                  disabled={isSubmitting}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                >
                  <MessageCircle className="w-5 h-5 fill-current" />
                  <span>{isSubmitting ? 'Menyiapkan Pesanan...' : 'Kirim Pesanan ke WhatsApp'}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
