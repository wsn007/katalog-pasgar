import React, { useState } from 'react';
import { ShoppingBag, Eye, Zap, Check, Package } from 'lucide-react';
import { Product } from '../types';
import { formatRupiah, calculateDiscountPercent, getEffectivePrice } from '../lib/format';

interface ProductCardProps {
  product: Product;
  onViewDetail: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onBuyNow: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onViewDetail,
  onAddToCart,
  onBuyNow,
}) => {
  const [imageError, setImageError] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const discountPercent = calculateDiscountPercent(product.price, product.discount_price);
  const effectivePrice = getEffectivePrice(product.price, product.discount_price);
  const isOutOfStock = product.stock <= 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOutOfStock) return;
    onAddToCart(product);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);
  };

  const handleBuyNow = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOutOfStock) return;
    onBuyNow(product);
  };

  return (
    <div
      onClick={() => onViewDetail(product)}
      className="group relative bg-white rounded-xl border border-slate-200/80 shadow-xs hover:shadow-lg transition-all duration-200 flex flex-col overflow-hidden cursor-pointer"
    >
      {/* Product Image Box */}
      <div className="relative aspect-4/3 w-full bg-slate-100 overflow-hidden flex items-center justify-center">
        {!imageError && product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            referrerPolicy="no-referrer"
            loading="lazy"
            onError={() => setImageError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-red-50 to-slate-100 text-slate-400 p-4 text-center">
            <Package className="w-10 h-10 text-[#D71920]/60 mb-1" />
            <span className="text-xs font-medium text-slate-500 line-clamp-1">{product.name}</span>
          </div>
        )}

        {/* Discount Badge */}
        {discountPercent > 0 && (
          <div className="absolute top-2.5 left-2.5 bg-[#D71920] text-white text-[11px] font-bold px-2 py-0.5 rounded-md shadow-xs">
            HEMAT {discountPercent}%
          </div>
        )}

        {/* Custom Status Badge or Out of stock */}
        {isOutOfStock ? (
          <div className="absolute top-2.5 right-2.5 bg-slate-800/90 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md backdrop-blur-xs">
            Stok Habis
          </div>
        ) : product.badge ? (
          <div className="absolute top-2.5 right-2.5 bg-white/90 text-slate-800 text-[10px] font-semibold px-2 py-0.5 rounded-md shadow-xs border border-slate-200/60 backdrop-blur-xs">
            {product.badge}
          </div>
        ) : null}
      </div>

      {/* Product Content */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Category & Stock Metadata (Zero-Pill clean inline text) */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1.5">
            <span className="truncate max-w-[140px] font-medium text-slate-600">
              {product.category_name || 'Umum'}
            </span>
            <span aria-hidden="true">·</span>
            <span className={product.stock <= 5 && product.stock > 0 ? 'text-amber-600 font-semibold' : 'text-slate-500'}>
              Stok: {product.stock}
            </span>
          </div>

          {/* Product Name */}
          <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-[#D71920] transition-colors line-clamp-2 leading-snug">
            {product.name}
          </h3>

          {/* Short Description */}
          <p className="mt-1 text-xs text-slate-500 line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        </div>

        {/* Price & Action Buttons */}
        <div className="mt-4 pt-3 border-t border-slate-100">
          {/* Price Block */}
          <div className="mb-3">
            <div className="flex items-baseline gap-2">
              <span className="text-base sm:text-lg font-extrabold text-[#D71920] tabular-nums tracking-tight">
                {formatRupiah(effectivePrice)}
              </span>
              {discountPercent > 0 && (
                <span className="text-xs text-slate-400 line-through tabular-nums">
                  {formatRupiah(product.price)}
                </span>
              )}
            </div>
          </div>

          {/* Action Button Row */}
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            {/* Tombol Detail */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onViewDetail(product);
              }}
              className="flex items-center justify-center gap-1 py-2 px-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              title="Lihat Detail Produk"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Detail</span>
            </button>

            {/* Tombol Tambah Keranjang */}
            <button
              type="button"
              disabled={isOutOfStock}
              onClick={handleAddToCart}
              className={`flex items-center justify-center gap-1 py-2 px-2 text-xs font-semibold rounded-lg transition-all ${
                isOutOfStock
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : justAdded
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-[#D71920] bg-red-50 hover:bg-red-100 border border-red-200'
              }`}
              title="Tambah ke Keranjang Belanja"
            >
              {justAdded ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">Masuk!</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">+Keranjang</span>
                </>
              )}
            </button>

            {/* Tombol Beli Sekarang */}
            <button
              type="button"
              disabled={isOutOfStock}
              onClick={handleBuyNow}
              className={`flex items-center justify-center gap-1 py-2 px-2 text-xs font-bold rounded-lg transition-all ${
                isOutOfStock
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-[#D71920] hover:bg-[#99131A] text-white shadow-xs hover:shadow-sm'
              }`}
              title="Beli Sekarang via WhatsApp"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span className="truncate">Beli</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
