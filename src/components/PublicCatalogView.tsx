import React, { useState, useMemo } from 'react';
import {
  Search,
  ShoppingBag,
  X,
  Phone,
  Sparkles,
  Flame,
  ThumbsUp,
  ArrowRight,
  SlidersHorizontal,
  Grid,
  Share2,
} from 'lucide-react';
import { Product, Category, StoreSettings, CartItem } from '../types';
import { ProductCard } from './ProductCard';
import { ProductDetailModal } from './ProductDetailModal';
import { CartDrawer } from './CartDrawer';
import { Footer } from './Footer';

interface PublicCatalogViewProps {
  settings: StoreSettings;
  products: Product[];
  categories: Category[];
  cartItems: CartItem[];
  onAddToCart: (product: Product, quantity?: number) => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  onShowToast: (message: string) => void;
  onSwitchToFullStore?: () => void;
}

export const PublicCatalogView: React.FC<PublicCatalogViewProps> = ({
  settings,
  products,
  categories,
  cartItems,
  onAddToCart,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onShowToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'default' | 'price-low' | 'price-high' | 'name-az'>('default');
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // Filter only active products (newest first)
  const activeProducts = useMemo(() => {
    return [...products]
      .filter((p) => p.is_active)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [products]);

  // Filter by search & category & sort
  const filteredProducts = useMemo(() => {
    let result = activeProducts.filter((product) => {
      const matchSearch =
        searchQuery === '' ||
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat =
        selectedCategory === null || product.category_id === selectedCategory;
      return matchSearch && matchCat;
    });

    if (sortBy === 'price-low') {
      result.sort((a, b) => (a.discount_price || a.price) - (b.discount_price || b.price));
    } else if (sortBy === 'price-high') {
      result.sort((a, b) => (b.discount_price || b.price) - (a.discount_price || a.price));
    } else if (sortBy === 'name-az') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return result;
  }, [activeProducts, searchQuery, selectedCategory, sortBy]);

  // Curated collections for the public catalog
  const bestSellerProducts = useMemo(() => {
    return activeProducts.filter((p) => p.badge?.toLowerCase().includes('terlaris') || p.is_featured).slice(0, 4);
  }, [activeProducts]);

  const newArrivals = useMemo(() => {
    return [...activeProducts].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 4);
  }, [activeProducts]);

  const recommendedProducts = useMemo(() => {
    return activeProducts.filter((p) => p.badge?.toLowerCase().includes('rekomendasi') || p.discount_price).slice(0, 4);
  }, [activeProducts]);

  const handleBuyNow = (product: Product, quantity = 1) => {
    onAddToCart(product, quantity);
    setIsCartOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col font-sans selection:bg-[#D71920] selection:text-white">
      {/* ======================================================== */}
      {/* PUBLIC CATALOG HEADER (Clean Customer View - No Admin Controls) */}
      {/* ======================================================== */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        {/* Banner Tagline */}
        <div className="bg-[#99131A] text-white text-xs py-1.5 px-4 text-center font-medium flex items-center justify-center gap-2">
          <span className="bg-white/20 text-white font-bold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">
            Katalog Resmi Publik
          </span>
          <span>{settings.tagline}</span>
          <span className="hidden sm:inline text-red-200">·</span>
          <span className="hidden sm:inline text-red-100">WhatsApp: 08567789981</span>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 md:gap-8">
          {/* Brand Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => {
                setSelectedCategory(null);
                setSearchQuery('');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="text-left group focus:outline-hidden"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#D71920] flex items-center justify-center text-white font-extrabold text-base tracking-tighter shadow-sm">
                  P
                </div>
                <div>
                  <span className="text-xl font-extrabold tracking-tight text-slate-900 group-hover:text-[#D71920] transition-colors whitespace-nowrap block leading-none">
                    {settings.store_name}
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">Katalog Resmi & Belanja WhatsApp</span>
                </div>
              </div>
            </button>
          </div>

          {/* Integrated Search Bar */}
          <div className="hidden md:flex flex-1 items-center justify-center max-w-xl mx-4">
            <div className="relative w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari sembako, buah segar, kopi, camilan di katalog..."
                className="w-full pl-10 pr-10 py-2 text-sm bg-slate-100 text-slate-800 placeholder-slate-400 rounded-full border border-transparent focus:border-[#D71920] focus:bg-white focus:outline-hidden transition-all shadow-inner"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                  title="Hapus pencarian"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Actions: Direct WhatsApp & Cart (Strictly No Admin Menu) */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <a
              href={`https://wa.me/${settings.whatsapp_number}?text=${encodeURIComponent(`Halo ${settings.store_name}, saya melihat katalog online dan ingin bertanya tentang produk.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors whitespace-nowrap shadow-xs"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-600" />
              <span>Chat WhatsApp</span>
            </a>

            <button
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-white bg-[#D71920] hover:bg-[#99131A] rounded-lg shadow-sm hover:shadow-md transition-all whitespace-nowrap"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden sm:inline">Keranjang</span>
              {cartCount > 0 && (
                <span className="px-1.5 py-0.2 bg-white text-[#D71920] rounded-full text-xs font-black min-w-5 h-5 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="md:hidden px-4 pb-3">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari produk pada katalog ini..."
              className="w-full pl-9 pr-9 py-2 text-xs bg-slate-100 text-slate-800 placeholder-slate-400 rounded-lg border border-transparent focus:border-[#D71920] focus:bg-white outline-hidden transition-all"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ======================================================== */}
      {/* MAIN CATALOG CONTENT */}
      {/* ======================================================== */}
      <main className="flex-1 pb-16 sm:pb-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 space-y-8 sm:space-y-12">

          {/* 1. HERO CAMPAIGN BANNER (Active Promo from Store Settings) */}
          {settings.banner_active && !searchQuery && selectedCategory === null && (
            <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-200/80 shadow-md">
              <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch min-h-[300px] sm:min-h-[360px]">
                {/* Left Text Zone */}
                <div className="lg:col-span-7 p-6 sm:p-10 lg:p-12 flex flex-col justify-between z-10 bg-gradient-to-r from-slate-950/95 via-slate-900/90 to-transparent text-white">
                  <div>
                    {settings.banner_badge && (
                      <span className="inline-block text-xs font-black uppercase tracking-wider text-red-400 bg-red-950/80 border border-red-800/80 px-3 py-1 rounded-md mb-3">
                        {settings.banner_badge}
                      </span>
                    )}
                    <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight mb-3 text-balance">
                      {settings.banner_title}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
                      {settings.banner_subtitle}
                    </p>
                  </div>

                  <div className="pt-6 flex flex-wrap items-center gap-3">
                    <a
                      href="#daftar-produk"
                      className="inline-flex items-center gap-2 px-5 py-3 bg-[#D71920] hover:bg-[#99131A] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all"
                    >
                      <span>Lihat Semua Produk</span>
                      <ArrowRight className="w-4 h-4" />
                    </a>

                    <a
                      href={`https://wa.me/${settings.whatsapp_number}?text=${encodeURIComponent(`Halo ${settings.store_name}, saya tertarik dengan promo: ${settings.banner_title}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-md transition-colors"
                    >
                      <Phone className="w-4 h-4" />
                      <span>Tanya via WhatsApp</span>
                    </a>
                  </div>
                </div>

                {/* Right Image Zone */}
                <div className="lg:col-span-5 relative min-h-[200px] lg:min-h-full">
                  {settings.banner_image_url ? (
                    <img
                      src={settings.banner_image_url}
                      alt={settings.banner_title || 'Banner Promo'}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover object-center"
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 lg:hidden" />
                </div>
              </div>
            </div>
          )}

          {/* 2. CATEGORIES NAVIGATION */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                  Kategori Belanja
                </h2>
                <p className="text-xs text-slate-500">Pilih kategori produk kebutuhan harian Anda</p>
              </div>
              {selectedCategory && (
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="text-xs font-bold text-[#D71920] hover:underline"
                >
                  Tampilkan Semua
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  selectedCategory === null
                    ? 'bg-white border-[#D71920] ring-2 ring-red-100 shadow-xs'
                    : 'bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-2xs'
                }`}
              >
                <div className="w-9 h-9 rounded-lg bg-red-50 text-[#D71920] flex items-center justify-center mb-2">
                  <Grid className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-extrabold text-xs text-slate-900">Semua Produk</div>
                  <span className="text-[11px] text-slate-400">{activeProducts.length} pilihan</span>
                </div>
              </button>

              {categories.map((cat) => {
                const count = activeProducts.filter(p => p.category_id === cat.id).length;
                const isSelected = selectedCategory === cat.id;

                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(isSelected ? null : cat.id)}
                    className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-white border-[#D71920] ring-2 ring-red-100 shadow-xs'
                        : 'bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-2xs'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-lg overflow-hidden bg-slate-100 mb-2 border border-slate-200 shrink-0">
                      {cat.image_url ? (
                        <img
                          src={cat.image_url}
                          alt={cat.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#D71920] font-bold text-xs bg-red-50">
                          {cat.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="font-extrabold text-xs text-slate-900 line-clamp-1">{cat.name}</div>
                      <span className="text-[11px] text-slate-400">{count} produk</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 3. FEATURED: PRODUK TERBARU (New Arrivals) */}
          {!searchQuery && selectedCategory === null && newArrivals.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-red-100 text-[#D71920] flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                    <span>Produk Terbaru</span>
                    <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                      Katalog Baru
                    </span>
                  </h2>
                </div>
                <a
                  href="#daftar-produk"
                  className="text-xs font-bold text-[#D71920] hover:underline flex items-center gap-1"
                >
                  <span>Lihat Semua</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                {newArrivals.map(prod => (
                  <ProductCard
                    key={prod.id}
                    product={prod}
                    onViewDetail={setDetailProduct}
                    onAddToCart={(p) => onAddToCart(p, 1)}
                    onBuyNow={(p) => handleBuyNow(p, 1)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* 4. FEATURED: PRODUK TERLARIS */}
          {!searchQuery && selectedCategory === null && bestSellerProducts.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-[#D71920]" />
                  <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                    Produk Terlaris
                  </h2>
                </div>
                <span className="text-xs text-slate-500">Paling banyak dipesan minggu ini</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                {bestSellerProducts.map(prod => (
                  <ProductCard
                    key={prod.id}
                    product={prod}
                    onViewDetail={setDetailProduct}
                    onAddToCart={(p) => onAddToCart(p, 1)}
                    onBuyNow={(p) => handleBuyNow(p, 1)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* 5. FEATURED: REKOMENDASI PRODUK */}
          {!searchQuery && selectedCategory === null && recommendedProducts.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                  <ThumbsUp className="w-5 h-5 text-emerald-600" />
                  <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                    Rekomendasi Spesial
                  </h2>
                </div>
                <span className="text-xs text-slate-500">Pilihan mutu terbaik untuk Anda</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                {recommendedProducts.map(prod => (
                  <ProductCard
                    key={prod.id}
                    product={prod}
                    onViewDetail={setDetailProduct}
                    onAddToCart={(p) => onAddToCart(p, 1)}
                    onBuyNow={(p) => handleBuyNow(p, 1)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* 6. DAFTAR SELURUH PRODUK (Catalog Grid) */}
          <section id="daftar-produk" className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                  {selectedCategory
                    ? `Kategori: ${categories.find(c => c.id === selectedCategory)?.name}`
                    : searchQuery
                    ? `Hasil Pencarian: "${searchQuery}"`
                    : 'Daftar Seluruh Produk'}
                </h2>
                <p className="text-xs text-slate-500">
                  Menampilkan {filteredProducts.length} produk siap dipesan
                </p>
              </div>

              {/* Sorting Filter */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-700 font-medium focus:border-[#D71920] outline-hidden shadow-2xs"
                >
                  <option value="default">Urutkan: Produk Terbaru</option>
                  <option value="price-low">Harga: Termurah</option>
                  <option value="price-high">Harga: Termahal</option>
                  <option value="name-az">Nama: A - Z</option>
                </select>
              </div>
            </div>

            {/* Product Grid */}
            {filteredProducts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto my-6">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
                  <Search className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-800 text-sm mb-1">Produk Tidak Ditemukan</h3>
                <p className="text-xs text-slate-500 mb-4">
                  Tidak ada barang yang sesuai dengan kata kunci atau filter saat ini.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory(null);
                  }}
                  className="px-4 py-2 bg-[#D71920] text-white text-xs font-bold rounded-lg shadow-xs"
                >
                  Lihat Semua Produk
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                {filteredProducts.map(prod => (
                  <ProductCard
                    key={prod.id}
                    product={prod}
                    onViewDetail={setDetailProduct}
                    onAddToCart={(p) => onAddToCart(p, 1)}
                    onBuyNow={(p) => handleBuyNow(p, 1)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={detailProduct}
        onClose={() => setDetailProduct(null)}
        onAddToCart={(p, q) => onAddToCart(p, q)}
        onBuyNow={(p, q) => handleBuyNow(p, q)}
        onShowToast={onShowToast}
      />

      {/* Cart Drawer & WhatsApp Checkout */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={onUpdateQuantity}
        onRemoveItem={onRemoveItem}
        onClearCart={onClearCart}
        onShowToast={onShowToast}
        whatsappNumber={settings.whatsapp_number}
      />

      {/* Clean Footer */}
      <Footer settings={settings} />
    </div>
  );
};
