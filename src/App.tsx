import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  ShoppingBag,
  Sparkles,
  Flame,
  ThumbsUp,
  Tag,
  ArrowRight,
  Filter,
  SlidersHorizontal,
  Home,
  Grid,
  Share2,
  Phone,
  CheckCircle2,
  RefreshCw,
  Edit2
} from 'lucide-react';
import { Product, Category, StoreSettings, CartItem, Order } from './types';
import { StoreDb } from './lib/supabase';
import { INITIAL_CATEGORIES, INITIAL_PRODUCTS } from './data/initialData';
import { Header } from './components/Header';
import { ProductCard } from './components/ProductCard';
import { ProductDetailModal } from './components/ProductDetailModal';
import { CartDrawer } from './components/CartDrawer';
import { ShareCatalogModal } from './components/ShareCatalogModal';
import { PublicCatalogView } from './components/PublicCatalogView';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminLoginModal } from './components/AdminLoginModal';
import { BannerEditModal } from './components/BannerEditModal';
import { Footer } from './components/Footer';
import { Toast } from './components/Toast';

const STORAGE_KEY_CART = 'pasgar_cart_items';
const STORAGE_KEY_ADMIN_AUTH = 'pasgar_admin_auth';

export default function App() {
  // Global Store Data State - initialized synchronously from local storage for instant render
  const [settings, setSettings] = useState<StoreSettings>(() => StoreDb.getSettings());
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('pasgar_products');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.sort((a: Product, b: Product) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        }
      }
    } catch {}
    return INITIAL_PRODUCTS;
  });
  const [categories, setCategories] = useState<Category[]>(() => {
    try {
      const saved = localStorage.getItem('pasgar_categories');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.sort((a: Category, b: Category) => (a.sort_order || 0) - (b.sort_order || 0));
        }
      }
    } catch {}
    return INITIAL_CATEGORIES;
  });
  const [orders, setOrders] = useState<Order[]>([]);

  // Cart State (Persistent)
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CART);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // UI Navigation & View State
  const [currentView, setCurrentView] = useState<'store' | 'katalog' | 'admin'>('store');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'default' | 'price-low' | 'price-high' | 'name-az'>('default');

  // Modals & Drawers
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [isBannerEditModalOpen, setIsBannerEditModalOpen] = useState(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEY_ADMIN_AUTH) === 'true';
  });

  // Feedback Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Save cart whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CART, JSON.stringify(cartItems));
    } catch (e) {
      console.error('Failed to save cart:', e);
    }
  }, [cartItems]);

  // Load initial data and record visit
  const loadData = async () => {
    try {
      // Sync from server to guarantee multi-device and shared link freshness
      await StoreDb.syncFromServer();
      const [prods, cats, ords] = await Promise.all([
        StoreDb.getProducts(true),
        StoreDb.getCategories(),
        StoreDb.getOrders(),
      ]);
      setProducts(prods);
      setCategories(cats);
      setOrders(ords);
      setSettings(StoreDb.getSettings());
      StoreDb.recordVisit();
    } catch (err) {
      console.error('Error loading store data:', err);
    }
  };

  useEffect(() => {
    loadData();

    // Check URL parameters for direct deep-linking
    const urlParams = new URLSearchParams(window.location.search);
    const viewParam = urlParams.get('view');
    const adminParam = urlParams.get('admin');
    const path = window.location.pathname;

    if (viewParam === 'katalog' || path === '/katalog') {
      setCurrentView('katalog');
    } else if (adminParam === 'true' || path === '/admin') {
      if (localStorage.getItem(STORAGE_KEY_ADMIN_AUTH) === 'true') {
        setCurrentView('admin');
      } else {
        setIsAdminLoginOpen(true);
      }
    }

    // Auto-sync listener across tabs and component events (event-driven instead of constant polling)
    const handleAutoSync = () => {
      loadData();
    };

    window.addEventListener('pasgar_data_updated', handleAutoSync);
    window.addEventListener('storage', handleAutoSync);
    window.addEventListener('focus', handleAutoSync);

    return () => {
      window.removeEventListener('pasgar_data_updated', handleAutoSync);
      window.removeEventListener('storage', handleAutoSync);
      window.removeEventListener('focus', handleAutoSync);
    };
  }, []);

  // Auto-refresh data when user switches view (e.g. from admin to store or to katalog)
  useEffect(() => {
    loadData();
  }, [currentView]);

  // Check for ?prod=ID deep linking once products load
  useEffect(() => {
    if (products.length > 0) {
      const urlParams = new URLSearchParams(window.location.search);
      const prodId = urlParams.get('prod');
      if (prodId) {
        const found = products.find(p => p.id === prodId && p.is_active);
        if (found) {
          setDetailProduct(found);
        }
      }
    }
  }, [products]);

  // Cart Handlers
  const handleAddToCart = (product: Product, quantity = 1) => {
    setCartItems(prev => {
      const index = prev.findIndex(item => item.product.id === product.id);
      if (index >= 0) {
        const updated = [...prev];
        const newQty = Math.min(updated[index].quantity + quantity, product.stock);
        updated[index] = { ...updated[index], quantity: newQty };
        return updated;
      }
      return [...prev, { product, quantity: Math.min(quantity, product.stock) }];
    });
    setToastMessage(`"${product.name}" ditambahkan ke keranjang.`);
  };

  const handleBuyNow = (product: Product, quantity = 1) => {
    handleAddToCart(product, quantity);
    setIsCartOpen(true);
  };

  const handleUpdateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveItem(productId);
      return;
    }
    setCartItems(prev =>
      prev.map(item =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const handleRemoveItem = (productId: string) => {
    setCartItems(prev => prev.filter(item => item.product.id !== productId));
    setToastMessage('Item dihapus dari keranjang.');
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  // Admin Auth Handlers
  const handleAdminLoginSuccess = (email: string) => {
    setIsAdminLoggedIn(true);
    localStorage.setItem(STORAGE_KEY_ADMIN_AUTH, 'true');
    setCurrentView('admin');
    setToastMessage(`Selamat datang, Administrator (${email})`);
  };

  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false);
    localStorage.removeItem(STORAGE_KEY_ADMIN_AUTH);
    setCurrentView('store');
    setToastMessage('Anda telah keluar dari mode administrator.');
  };

  // Filtered active products for public storefront (sorted newest first)
  const activeProducts = useMemo(() => {
    return [...products]
      .filter(p => p.is_active)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [products]);

  // Search & Category Filtered Products
  const filteredProducts = useMemo(() => {
    let result = activeProducts.filter(product => {
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
      // Default: sort newest products first
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return result;
  }, [activeProducts, searchQuery, selectedCategory, sortBy]);

  // Curated collections
  const bestSellerProducts = useMemo(() => {
    return activeProducts.filter(p => p.badge?.toLowerCase().includes('terlaris') || p.is_featured).slice(0, 4);
  }, [activeProducts]);

  const newArrivals = useMemo(() => {
    return [...activeProducts].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 4);
  }, [activeProducts]);

  const recommendedProducts = useMemo(() => {
    return activeProducts.filter(p => p.badge?.toLowerCase().includes('rekomendasi') || p.discount_price).slice(0, 4);
  }, [activeProducts]);

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // -------------------------------------------------------------
  // CONDITIONAL VIEW 1: SANITIZED PUBLIC CATALOG VIEW (?view=katalog)
  // -------------------------------------------------------------
  if (currentView === 'katalog') {
    return (
      <PublicCatalogView
        settings={settings}
        products={products}
        categories={categories}
        cartItems={cartItems}
        onAddToCart={handleAddToCart}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onClearCart={handleClearCart}
        onShowToast={(msg) => setToastMessage(msg)}
        onSwitchToFullStore={() => setCurrentView('store')}
      />
    );
  }

  // -------------------------------------------------------------
  // CONDITIONAL VIEW 2: SECRET ADMIN DASHBOARD (/admin)
  // -------------------------------------------------------------
  if (currentView === 'admin' && isAdminLoggedIn) {
    return (
      <AdminDashboard
        settings={settings}
        products={products}
        categories={categories}
        orders={orders}
        onRefreshData={loadData}
        onCloseAdmin={() => setCurrentView('store')}
        onLogout={handleAdminLogout}
        onShowToast={(msg) => setToastMessage(msg)}
        onOpenShareModal={() => setIsShareModalOpen(true)}
      />
    );
  }

  // -------------------------------------------------------------
  // CONDITIONAL VIEW 3: FULL PRODUCTION STOREFRONT
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col font-sans selection:bg-[#D71920] selection:text-white">
      {/* Top Header */}
      <Header
        settings={settings}
        cartCount={cartCount}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenShare={() => setIsShareModalOpen(true)}
        onOpenAdminLogin={() => {
          if (isAdminLoggedIn) {
            setCurrentView('admin');
          } else {
            setIsAdminLoginOpen(true);
          }
        }}
        isAdminLoggedIn={isAdminLoggedIn}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onNavigateHome={() => {
          setSelectedCategory(null);
          setSearchQuery('');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        activeCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-16 sm:pb-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 space-y-8 sm:space-y-12">
          
          {/* ======================================================== */}
          {/* HERO CAMPAIGN BANNER (16:9 / Split focal showcase) */}
          {/* ======================================================== */}
          {settings.banner_active && !searchQuery && selectedCategory === null && (
            <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-200/80 shadow-md">
              {/* Admin-only quick edit banner button */}
              {isAdminLoggedIn && (
                <button
                  type="button"
                  onClick={() => setIsBannerEditModalOpen(true)}
                  className="absolute top-3.5 right-3.5 z-20 flex items-center gap-1.5 px-3 py-1.5 bg-black/75 hover:bg-black/95 text-white text-xs font-bold rounded-lg border border-white/25 backdrop-blur-md shadow-md transition-all group cursor-pointer"
                  title="Hanya Admin: Edit Foto Promo & Teks Banner"
                >
                  <Edit2 className="w-3.5 h-3.5 text-red-400 group-hover:rotate-12 transition-transform" />
                  <span>Edit Banner Promo (Admin)</span>
                </button>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch min-h-[320px] sm:min-h-[380px]">
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
                      <span>Lihat Semua Katalog</span>
                      <ArrowRight className="w-4 h-4" />
                    </a>

                    <button
                      onClick={() => setIsShareModalOpen(true)}
                      className="inline-flex items-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs sm:text-sm rounded-xl backdrop-blur-xs border border-white/20 transition-colors"
                    >
                      <Share2 className="w-4 h-4 text-red-300" />
                      <span>Bagikan Katalog</span>
                    </button>
                  </div>
                </div>

                {/* Right Image Zone */}
                <div className="lg:col-span-5 relative min-h-[220px] lg:min-h-full">
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

          {/* ======================================================== */}
          {/* CATEGORIES HORIZONTAL NAVIGATION (Section 2) */}
          {/* ======================================================== */}
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

            {/* Category Cards Carousel */}
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

          {/* ======================================================== */}
          {/* FEATURED: PRODUK TERBARU (New Arrivals - Master Prompt Req 2) */}
          {/* ======================================================== */}
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
                    onAddToCart={(p) => handleAddToCart(p, 1)}
                    onBuyNow={(p) => handleBuyNow(p, 1)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* ======================================================== */}
          {/* FEATURED: PRODUK TERLARIS (Only on unfiltered view) */}
          {/* ======================================================== */}
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
                    onAddToCart={(p) => handleAddToCart(p, 1)}
                    onBuyNow={(p) => handleBuyNow(p, 1)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* ======================================================== */}
          {/* FEATURED: REKOMENDASI PRODUK */}
          {/* ======================================================== */}
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
                    onAddToCart={(p) => handleAddToCart(p, 1)}
                    onBuyNow={(p) => handleBuyNow(p, 1)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* ======================================================== */}
          {/* DAFTAR SELURUH PRODUK (With Sort & Filters) */}
          {/* ======================================================== */}
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
                    onAddToCart={(p) => handleAddToCart(p, 1)}
                    onBuyNow={(p) => handleBuyNow(p, 1)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar (Thumb friendly for Android & iOS) */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-2 flex items-center justify-around shadow-lg">
        <button
          onClick={() => {
            setSelectedCategory(null);
            setSearchQuery('');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="flex flex-col items-center text-slate-600 hover:text-[#D71920] py-1"
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] font-bold mt-0.5">Beranda</span>
        </button>

        <a
          href="#daftar-produk"
          className="flex flex-col items-center text-slate-600 hover:text-[#D71920] py-1"
        >
          <Grid className="w-5 h-5" />
          <span className="text-[10px] font-bold mt-0.5">Katalog</span>
        </a>

        <button
          onClick={() => setIsShareModalOpen(true)}
          className="flex flex-col items-center text-slate-600 hover:text-[#D71920] py-1"
        >
          <Share2 className="w-5 h-5" />
          <span className="text-[10px] font-bold mt-0.5">Share</span>
        </button>

        <button
          onClick={() => setIsCartOpen(true)}
          className="relative flex flex-col items-center text-[#D71920] py-1"
        >
          <ShoppingBag className="w-5 h-5" />
          <span className="text-[10px] font-bold mt-0.5">Keranjang</span>
          {cartCount > 0 && (
            <span className="absolute top-0.5 right-1 px-1.5 py-0.2 bg-[#D71920] text-white rounded-full text-[9px] font-black">
              {cartCount}
            </span>
          )}
        </button>
      </div>

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={detailProduct}
        onClose={() => setDetailProduct(null)}
        onAddToCart={(p, q) => handleAddToCart(p, q)}
        onBuyNow={(p, q) => handleBuyNow(p, q)}
        onShowToast={(msg) => setToastMessage(msg)}
      />

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onClearCart={handleClearCart}
        onShowToast={(msg) => setToastMessage(msg)}
        whatsappNumber={settings.whatsapp_number}
      />

      {/* Share Catalog Modal */}
      <ShareCatalogModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        settings={settings}
        onShowToast={(msg) => setToastMessage(msg)}
        onViewCatalogMode={() => setCurrentView('katalog')}
      />

      {/* Admin Login Modal */}
      <AdminLoginModal
        isOpen={isAdminLoginOpen}
        onClose={() => setIsAdminLoginOpen(false)}
        onSuccess={handleAdminLoginSuccess}
        onShowToast={(msg) => setToastMessage(msg)}
      />

      {/* Edit Banner Promo Modal (Eksklusif Khusus Admin) */}
      {isAdminLoggedIn && (
        <BannerEditModal
          isOpen={isBannerEditModalOpen}
          onClose={() => setIsBannerEditModalOpen(false)}
          settings={settings}
          onSave={(updated) => {
            setSettings(updated);
          }}
          onShowToast={(msg) => setToastMessage(msg)}
        />
      )}

      {/* Store Footer */}
      <Footer settings={settings} />

      {/* Notification Toast */}
      <Toast
        message={toastMessage}
        onClose={() => setToastMessage(null)}
      />
    </div>
  );
}
