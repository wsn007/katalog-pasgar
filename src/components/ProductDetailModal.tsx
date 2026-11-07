import React, { useState, useEffect } from 'react';
import { X, ShoppingBag, Zap, Share2, Plus, Minus, Check, Copy, MessageCircle, Send, Package } from 'lucide-react';
import { Product } from '../types';
import { formatRupiah, calculateDiscountPercent, getEffectivePrice } from '../lib/format';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number) => void;
  onBuyNow: (product: Product, quantity: number) => void;
  onShowToast: (message: string) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onAddToCart,
  onBuyNow,
  onShowToast,
}) => {
  if (!product) return null;

  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState<string>(product.image_url || '');
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (product) {
      setSelectedImage(product.image_url || '');
      setQuantity(1);
    }
  }, [product?.id]);

  const images = [product.image_url, ...(product.gallery || [])].filter(
    (url, index, self): url is string => Boolean(url && self.indexOf(url) === index)
  );

  const discountPercent = calculateDiscountPercent(product.price, product.discount_price);
  const effectivePrice = getEffectivePrice(product.price, product.discount_price);
  const isOutOfStock = product.stock <= 0;

  const handleDecrease = () => {
    if (quantity > 1) setQuantity(quantity - 1);
  };

  const handleIncrease = () => {
    if (quantity < product.stock) setQuantity(quantity + 1);
  };

  const handleShareWhatsApp = () => {
    const text = `Lihat produk *${product.name}* di PASGAR ARIF S seharga ${formatRupiah(effectivePrice)}: ${window.location.origin}?prod=${product.id}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleShareTelegram = () => {
    const text = `Lihat produk ${product.name} di PASGAR ARIF S: ${window.location.origin}?prod=${product.id}`;
    window.open(`https://t.me/share/url?url=${encodeURIComponent(window.location.origin + '?prod=' + product.id)}&text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleShareFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.origin + '?prod=' + product.id)}`, '_blank');
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}?prod=${product.id}`;
    navigator.clipboard.writeText(url);
    setIsCopied(true);
    onShowToast('Link produk berhasil disalin ke clipboard!');
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
      <div
        className="relative bg-white rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-white/80 hover:bg-white text-slate-600 hover:text-slate-900 rounded-full shadow-sm backdrop-blur-xs transition-colors"
          title="Tutup Modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Gallery Column */}
          <div className="p-6 bg-slate-50 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-200">
            <div>
              <div className="aspect-square rounded-xl overflow-hidden bg-white border border-slate-200 relative mb-4 flex items-center justify-center">
                {selectedImage || product.image_url ? (
                  <img
                    src={selectedImage || product.image_url}
                    alt={product.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
                    <Package className="w-12 h-12" />
                  </div>
                )}
                {discountPercent > 0 && (
                  <span className="absolute top-3 left-3 bg-[#D71920] text-white text-xs font-bold px-2.5 py-1 rounded-md shadow-xs">
                    HEMAT {discountPercent}%
                  </span>
                )}
                {product.badge && (
                  <span className="absolute top-3 right-3 bg-slate-900 text-white text-xs font-semibold px-2.5 py-1 rounded-md shadow-xs">
                    {product.badge}
                  </span>
                )}
              </div>

              {/* Thumbnails */}
              {images.filter(Boolean).length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {images.filter(Boolean).map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImage(img)}
                      className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${
                        selectedImage === img ? 'border-[#D71920] ring-2 ring-red-200' : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt={`${product.name} ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Share Accordion */}
            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Bagikan Produk:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleShareWhatsApp}
                    className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                    title="Bagikan ke WhatsApp"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleShareTelegram}
                    className="p-2 text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                    title="Bagikan ke Telegram"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleShareFacebook}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Bagikan ke Facebook"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleCopyLink}
                    className="p-2 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                    title="Salin Link Produk"
                  >
                    {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Product Info Column */}
          <div className="p-6 sm:p-8 flex flex-col justify-between">
            <div>
              {/* Category */}
              <div className="text-xs uppercase tracking-wider font-semibold text-[#D71920] mb-1">
                {product.category_name || 'Katalog Pasgar Arif S'}
              </div>

              {/* Title */}
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-tight mb-3">
                {product.name}
              </h2>

              {/* Price */}
              <div className="flex items-baseline gap-3 mb-4">
                <span className="text-2xl sm:text-3xl font-black text-[#D71920] tabular-nums">
                  {formatRupiah(effectivePrice)}
                </span>
                {discountPercent > 0 && (
                  <span className="text-sm text-slate-400 line-through tabular-nums">
                    {formatRupiah(product.price)}
                  </span>
                )}
              </div>

              {/* Stock info */}
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-lg text-xs font-medium text-slate-700 mb-6">
                <span>Status Stok:</span>
                <span className={product.stock > 0 ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'}>
                  {product.stock > 0 ? `Tersedia (${product.stock} unit)` : 'Stok Habis'}
                </span>
              </div>

              {/* Full Description */}
              <div className="mb-6">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                  Deskripsi Lengkap
                </h4>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                  {product.description}
                </p>
              </div>

              {/* Quantity Picker */}
              <div className="mb-6">
                <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                  Jumlah Pembelian
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex items-center border border-slate-300 rounded-lg bg-white overflow-hidden shadow-xs">
                    <button
                      type="button"
                      disabled={quantity <= 1 || isOutOfStock}
                      onClick={handleDecrease}
                      className="p-2.5 text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors"
                      title="Kurangi"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-12 text-center text-sm font-bold text-slate-900 tabular-nums">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      disabled={quantity >= product.stock || isOutOfStock}
                      onClick={handleIncrease}
                      className="p-2.5 text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors"
                      title="Tambah"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <span className="text-xs text-slate-500">
                    Subtotal: <strong className="text-slate-900">{formatRupiah(effectivePrice * quantity)}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                disabled={isOutOfStock}
                onClick={() => {
                  onAddToCart(product, quantity);
                  onClose();
                }}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm text-[#D71920] bg-red-50 hover:bg-red-100 border border-red-200 transition-colors disabled:opacity-50"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>+ Keranjang</span>
              </button>

              <button
                type="button"
                disabled={isOutOfStock}
                onClick={() => {
                  onBuyNow(product, quantity);
                  onClose();
                }}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm text-white bg-[#D71920] hover:bg-[#99131A] shadow-md hover:shadow-lg transition-all disabled:opacity-50"
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>Beli Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
