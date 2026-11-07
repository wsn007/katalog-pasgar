import React, { useState, useRef } from 'react';
import {
  Shield,
  LayoutDashboard,
  Package,
  Layers,
  ShoppingBag,
  Settings,
  Database,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Star,
  CheckCircle,
  AlertCircle,
  LogOut,
  ExternalLink,
  Search,
  Copy,
  Check,
  Save,
  RotateCcw,
  Sparkles,
  Share2,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import { Product, Category, Order, StoreSettings } from '../types';
import { StoreDb, SUPABASE_SQL_SCHEMA, getSupabaseConfig, saveSupabaseConfig, getSupabaseClient } from '../lib/supabase';
import { formatRupiah } from '../lib/format';
import { BANNER_PRESETS } from './BannerEditModal';

interface AdminDashboardProps {
  settings: StoreSettings;
  products: Product[];
  categories: Category[];
  orders: Order[];
  onRefreshData: () => Promise<void>;
  onCloseAdmin: () => void;
  onLogout: () => void;
  onShowToast: (message: string) => void;
  onOpenShareModal: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  settings,
  products,
  categories,
  orders,
  onRefreshData,
  onCloseAdmin,
  onLogout,
  onShowToast,
  onOpenShareModal,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'categories' | 'orders' | 'banner' | 'database'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [productFilter, setProductFilter] = useState<'all' | 'active' | 'inactive' | 'featured'>('all');

  // Product Form State (for Add / Edit)
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productForm, setProductForm] = useState({
    name: '',
    category_id: '',
    price: '',
    discount_price: '',
    stock: '',
    image_url: '',
    description: '',
    badge: '',
    is_featured: false,
    is_active: true,
  });

  // Category Form State
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    sort_order: 1,
    image_url: '',
  });

  // Banner Settings State
  const [bannerForm, setBannerForm] = useState({
    banner_title: settings.banner_title,
    banner_subtitle: settings.banner_subtitle,
    banner_badge: settings.banner_badge,
    banner_image_url: settings.banner_image_url,
    banner_active: settings.banner_active,
    whatsapp_number: settings.whatsapp_number,
    store_name: settings.store_name,
    tagline: settings.tagline,
    address: settings.address,
    opening_hours: settings.opening_hours,
  });

  // In-app Delete Confirmation Modal State (safe for sandboxed iframes)
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    type: 'product' | 'category' | 'reset';
    id: string;
    name: string;
  }>({
    isOpen: false,
    type: 'product',
    id: '',
    name: '',
  });
  const [isDeleting, setIsDeleting] = useState(false);

  // Supabase Config State
  const initialSupabase = getSupabaseConfig();
  const [supabaseUrl, setSupabaseUrl] = useState(initialSupabase.url);
  const [supabaseKey, setSupabaseKey] = useState(initialSupabase.anonKey);
  const [sqlCopied, setSqlCopied] = useState(false);

  // Statistics calculation
  const totalProducts = products.length;
  const activeProductsCount = products.filter(p => p.is_active).length;
  const inactiveProductsCount = totalProducts - activeProductsCount;
  const outOfStockCount = products.filter(p => p.stock <= 0).length;
  const totalCategories = categories.length;
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, ord) => sum + (ord.total || 0), 0);
  const visitStats = StoreDb.getVisitStats();

  // Curated stock photos for fast image picking in admin
  const PRESET_IMAGES = [
    { label: 'Sembako Beras & Minyak', url: '/src/assets/images/product_sembako_premium_1793909855702.jpg' },
    { label: 'Buah Segar Tropis', url: '/src/assets/images/product_fresh_fruits_1793909856421.jpg' },
    { label: 'Kopi Toraja & Camilan', url: '/src/assets/images/product_kopi_snack_1793909856858.jpg' },
    { label: 'Interior Toko Pasgar', url: '/src/assets/images/hero_pasgar_banner_1793909855421.jpg' },
  ];

  // ============================
  // PRODUCT CRUD HANDLERS
  // ============================
  const openAddProduct = () => {
    setEditingProductId(null);
    setProductForm({
      name: '',
      category_id: categories[0]?.id || '',
      price: '',
      discount_price: '',
      stock: '20',
      image_url: PRESET_IMAGES[0].url,
      description: '',
      badge: '',
      is_featured: false,
      is_active: true,
    });
    setIsEditingProduct(true);
  };

  const openEditProduct = (prod: Product) => {
    setEditingProductId(prod.id);
    setProductForm({
      name: prod.name,
      category_id: prod.category_id,
      price: prod.price.toString(),
      discount_price: prod.discount_price ? prod.discount_price.toString() : '',
      stock: prod.stock.toString(),
      image_url: prod.image_url,
      description: prod.description,
      badge: prod.badge || '',
      is_featured: prod.is_featured,
      is_active: prod.is_active,
    });
    setIsEditingProduct(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name.trim() || !productForm.price) {
      onShowToast('Nama dan harga produk wajib diisi.');
      return;
    }

    const priceNum = parseFloat(productForm.price) || 0;
    const discountNum = productForm.discount_price ? parseFloat(productForm.discount_price) : null;
    const stockNum = parseInt(productForm.stock, 10) || 0;
    const selectedCat = categories.find(c => c.id === productForm.category_id);

    const productPayload: Product = {
      id: editingProductId || 'prod-' + Date.now(),
      name: productForm.name.trim(),
      slug: productForm.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
      category_id: productForm.category_id,
      category_name: selectedCat?.name || 'Umum',
      description: productForm.description.trim(),
      price: priceNum,
      discount_price: discountNum,
      stock: stockNum,
      image_url: productForm.image_url.trim() || PRESET_IMAGES[0].url,
      gallery: [productForm.image_url.trim() || PRESET_IMAGES[0].url],
      badge: productForm.badge.trim() || undefined,
      is_featured: productForm.is_featured,
      is_active: productForm.is_active,
      created_at: editingProductId
        ? (products.find(p => p.id === editingProductId)?.created_at || new Date().toISOString())
        : new Date().toISOString(),
    };

    await StoreDb.saveProduct(productPayload);
    await onRefreshData();
    setIsEditingProduct(false);
    onShowToast(editingProductId ? 'Produk berhasil diperbarui!' : 'Produk baru berhasil ditambahkan!');
  };

  const handleProductImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      onShowToast('Ukuran file foto produk maksimal 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setProductForm(prev => ({ ...prev, image_url: reader.result as string }));
        onShowToast('Foto produk berhasil diunggah!');
      }
    };
    reader.onerror = () => {
      onShowToast('Gagal membaca file gambar.');
    };
    reader.readAsDataURL(file);
  };

  // Safe In-App Delete Triggers (No window.confirm!)
  const requestDeleteProduct = (id: string, name: string) => {
    setDeleteConfirmation({
      isOpen: true,
      type: 'product',
      id,
      name,
    });
  };

  const requestDeleteCategory = (id: string, name: string) => {
    setDeleteConfirmation({
      isOpen: true,
      type: 'category',
      id,
      name,
    });
  };

  const requestResetCatalog = () => {
    setDeleteConfirmation({
      isOpen: true,
      type: 'reset',
      id: '',
      name: 'Seluruh Katalog ke Data Standar Pabrik',
    });
  };

  const handleExecuteDelete = async () => {
    setIsDeleting(true);
    try {
      if (deleteConfirmation.type === 'product' && deleteConfirmation.id) {
        await StoreDb.deleteProduct(deleteConfirmation.id);
        await onRefreshData();
        onShowToast(`Produk "${deleteConfirmation.name}" berhasil dihapus.`);
      } else if (deleteConfirmation.type === 'category' && deleteConfirmation.id) {
        await StoreDb.deleteCategory(deleteConfirmation.id);
        await onRefreshData();
        onShowToast(`Kategori "${deleteConfirmation.name}" berhasil dihapus.`);
      } else if (deleteConfirmation.type === 'reset') {
        StoreDb.resetToDefault();
        await onRefreshData();
        onShowToast('Katalog berhasil direset ke standar pabrik.');
      }
    } catch (err) {
      console.error('Delete execution error:', err);
      onShowToast('Gagal menghapus item. Silakan coba lagi.');
    } finally {
      setIsDeleting(false);
      setDeleteConfirmation({ isOpen: false, type: 'product', id: '', name: '' });
    }
  };

  const handleToggleProductActive = async (prod: Product) => {
    const updated = { ...prod, is_active: !prod.is_active };
    await StoreDb.saveProduct(updated);
    await onRefreshData();
    onShowToast(`Produk "${prod.name}" sekarang ${updated.is_active ? 'AKTIF' : 'NONAKTIF'}.`);
  };

  const handleToggleProductFeatured = async (prod: Product) => {
    const updated = { ...prod, is_featured: !prod.is_featured };
    await StoreDb.saveProduct(updated);
    await onRefreshData();
    onShowToast(`Status unggulan "${prod.name}" diperbarui.`);
  };

  // ============================
  // CATEGORY CRUD HANDLERS
  // ============================
  const openAddCategory = () => {
    setEditingCategoryId(null);
    setCategoryForm({
      name: '',
      sort_order: categories.length + 1,
      image_url: PRESET_IMAGES[0].url,
    });
    setIsEditingCategory(true);
  };

  const openEditCategory = (cat: Category) => {
    setEditingCategoryId(cat.id);
    setCategoryForm({
      name: cat.name,
      sort_order: cat.sort_order || 1,
      image_url: cat.image_url || '',
    });
    setIsEditingCategory(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) return;

    const payload: Category = {
      id: editingCategoryId || 'cat-' + Date.now(),
      name: categoryForm.name.trim(),
      slug: categoryForm.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
      sort_order: Number(categoryForm.sort_order) || 1,
      image_url: categoryForm.image_url.trim() || undefined,
      created_at: new Date().toISOString(),
    };

    await StoreDb.saveCategory(payload);
    await onRefreshData();
    setIsEditingCategory(false);
    onShowToast(editingCategoryId ? 'Kategori berhasil diubah!' : 'Kategori baru berhasil dibuat!');
  };

  // ============================
  // SETTINGS & BANNER HANDLERS
  // ============================
  const bannerFileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);

  const handleBannerFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      onShowToast('File harus berupa gambar (JPG, PNG, atau WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      onShowToast('Ukuran gambar maksimal 5 MB.');
      return;
    }

    setIsUploadingBanner(true);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setBannerForm(prev => ({ ...prev, banner_image_url: reader.result as string }));
        onShowToast('Foto banner promo berhasil diunggah!');
      }
      setIsUploadingBanner(false);
    };
    reader.onerror = () => {
      setIsUploadingBanner(false);
      onShowToast('Gagal membaca file gambar.');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSettings = async () => {
    const updated: StoreSettings = {
      ...settings,
      ...bannerForm,
    };
    StoreDb.saveSettings(updated);
    await onRefreshData();
    onShowToast('Pengaturan katalog & banner promo berhasil disimpan!');
  };

  const handleSaveSupabaseConfig = () => {
    saveSupabaseConfig(supabaseUrl.trim(), supabaseKey.trim());
    onShowToast('Konfigurasi Supabase disimpan! Memperbarui koneksi...');
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setSqlCopied(true);
    onShowToast('Script SQL Supabase berhasil disalin ke clipboard!');
    setTimeout(() => setSqlCopied(false), 2000);
  };

  const handleResetCatalog = () => {
    requestResetCatalog();
  };

  // Filtered product list for table
  const displayedProducts = products.filter(p => {
    const matchSearch = searchQuery === '' || p.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchSearch) return false;
    if (productFilter === 'active') return p.is_active;
    if (productFilter === 'inactive') return !p.is_active;
    if (productFilter === 'featured') return p.is_featured;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Admin Top Bar */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#D71920] flex items-center justify-center text-white font-bold text-sm">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white">
                  ADMINISTRATOR PASGAR ARIF S
                </span>
                <span className="text-[10px] bg-red-900/60 text-red-200 border border-red-800 px-2 py-0.5 rounded-full font-mono">
                  Rahasia
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Panel Kontrol Produk & Katalog Penjualan</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenShareModal}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5 text-red-400" />
              <span>Share Link Katalog</span>
            </button>

            <button
              onClick={onCloseAdmin}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              title="Buka Toko Pelanggan"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Lihat Web Toko</span>
            </button>

            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-300 hover:text-white bg-rose-950/40 hover:bg-rose-900/70 border border-rose-900/50 rounded-lg transition-colors"
              title="Keluar Admin"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Admin Subnav Tabs */}
      <nav className="bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex gap-1 sm:gap-4 overflow-x-auto py-2.5 scrollbar-none">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition-colors ${
              activeTab === 'overview'
                ? 'bg-[#D71920] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard Statistik</span>
          </button>

          <button
            onClick={() => setActiveTab('products')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition-colors ${
              activeTab === 'products'
                ? 'bg-[#D71920] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Manajemen Produk ({totalProducts})</span>
          </button>

          <button
            onClick={() => setActiveTab('categories')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition-colors ${
              activeTab === 'categories'
                ? 'bg-[#D71920] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Kategori ({totalCategories})</span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition-colors ${
              activeTab === 'orders'
                ? 'bg-[#D71920] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Pesanan Masuk ({totalOrders})</span>
          </button>

          <button
            onClick={() => setActiveTab('banner')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition-colors ${
              activeTab === 'banner'
                ? 'bg-[#D71920] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Banner & Info Toko</span>
          </button>

          <button
            onClick={() => setActiveTab('database')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition-colors ${
              activeTab === 'database'
                ? 'bg-[#D71920] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Supabase & SQL</span>
          </button>
        </div>
      </nav>

      {/* Main Admin Body */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* ========================================================== */}
        {/* TAB 1: OVERVIEW & STATISTIK */}
        {/* ========================================================== */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                <span className="text-xs font-semibold text-slate-500 uppercase">Total Produk</span>
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 tabular-nums">
                  {totalProducts}
                </div>
                <div className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
                  <span className="text-emerald-600 font-bold">{activeProductsCount} aktif</span>
                  <span>·</span>
                  <span className="text-slate-400">{inactiveProductsCount} nonaktif</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                <span className="text-xs font-semibold text-slate-500 uppercase">Kategori Toko</span>
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 tabular-nums">
                  {totalCategories}
                </div>
                <div className="text-xs text-slate-500 mt-2">
                  Terorganisir untuk navigasi mudah
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                <span className="text-xs font-semibold text-slate-500 uppercase">Stok Habis / Kritis</span>
                <div className="text-2xl sm:text-3xl font-extrabold text-rose-600 mt-1 tabular-nums">
                  {outOfStockCount}
                </div>
                <div className="text-xs text-slate-500 mt-2">
                  Perlu pengisian ulang stok
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                <span className="text-xs font-semibold text-slate-500 uppercase">Statistik Kunjungan</span>
                <div className="text-2xl sm:text-3xl font-extrabold text-[#D71920] mt-1 tabular-nums">
                  {visitStats.total}
                </div>
                <div className="text-xs text-slate-500 mt-2">
                  {visitStats.today} kunjungan hari ini
                </div>
              </div>
            </div>

            {/* Quick Actions & Recent Orders Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Quick Actions */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wide">
                  Aksi Cepat Admin
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={openAddProduct}
                    className="w-full flex items-center justify-between p-3 bg-red-50 hover:bg-red-100 text-[#D71920] rounded-xl font-bold text-xs transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      <span>Tambah Produk Baru</span>
                    </span>
                    <span>→</span>
                  </button>

                  <button
                    onClick={openAddCategory}
                    className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl font-bold text-xs transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Layers className="w-4 h-4" />
                      <span>Tambah Kategori Baru</span>
                    </span>
                    <span>→</span>
                  </button>

                  <button
                    onClick={onOpenShareModal}
                    className="w-full flex items-center justify-between p-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl font-bold text-xs transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Share2 className="w-4 h-4" />
                      <span>Bagikan Link Katalog Pelanggan</span>
                    </span>
                    <span>→</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('database')}
                    className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl font-bold text-xs transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Database className="w-4 h-4" />
                      <span>Pengaturan Database Supabase</span>
                    </span>
                    <span>→</span>
                  </button>
                </div>
              </div>

              {/* Recent Orders Overview */}
              <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wide">
                      Pesanan Masuk Terbaru ({orders.length})
                    </h3>
                    <p className="text-xs text-slate-500">Hasil pesanan checkout WhatsApp pelanggan</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('orders')}
                    className="text-xs font-bold text-[#D71920] hover:underline"
                  >
                    Lihat Semua
                  </button>
                </div>

                {orders.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    Belum ada pesanan masuk. Saat pelanggan checkout via WhatsApp, data pesanan otomatis tercatat disini.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {orders.slice(0, 3).map(order => (
                      <div key={order.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row justify-between gap-2 text-xs">
                        <div>
                          <div className="font-bold text-slate-900">{order.customer_name}</div>
                          <div className="text-slate-500">WA: {order.customer_phone}</div>
                          <div className="text-slate-500 truncate max-w-xs">{order.customer_address}</div>
                        </div>
                        <div className="text-right sm:self-center">
                          <div className="font-extrabold text-[#D71920] text-sm tabular-nums">
                            {formatRupiah(order.total)}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {new Date(order.created_at).toLocaleDateString('id-ID')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* TAB 2: MANAJEMEN PRODUK */}
        {/* ========================================================== */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            {/* Top Toolbar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={openAddProduct}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#D71920] hover:bg-[#99131A] text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Produk</span>
                </button>

                {/* Filter buttons */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  <button
                    onClick={() => setProductFilter('all')}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${productFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'}`}
                  >
                    Semua ({totalProducts})
                  </button>
                  <button
                    onClick={() => setProductFilter('active')}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${productFilter === 'active' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600'}`}
                  >
                    Aktif ({activeProductsCount})
                  </button>
                  <button
                    onClick={() => setProductFilter('inactive')}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${productFilter === 'inactive' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-600'}`}
                  >
                    Nonaktif ({inactiveProductsCount})
                  </button>
                  <button
                    onClick={() => setProductFilter('featured')}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${productFilter === 'featured' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600'}`}
                  >
                    Unggulan
                  </button>
                </div>
              </div>

              {/* Search in products */}
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama produk..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-100 text-slate-800 rounded-xl border border-transparent focus:border-[#D71920] focus:bg-white outline-hidden"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Product Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[11px] border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Produk</th>
                      <th className="py-3 px-4">Kategori</th>
                      <th className="py-3 px-4">Harga Normal</th>
                      <th className="py-3 px-4">Harga Diskon</th>
                      <th className="py-3 px-4">Stok</th>
                      <th className="py-3 px-4">Unggulan</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayedProducts.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400">
                          Tidak ada produk ditemukan.
                        </td>
                      </tr>
                    ) : (
                      displayedProducts.map(prod => (
                        <tr key={prod.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              {prod.image_url ? (
                                <img
                                  src={prod.image_url}
                                  alt={prod.name}
                                  referrerPolicy="no-referrer"
                                  className="w-10 h-10 rounded-lg object-cover bg-slate-100 shrink-0 border border-slate-200"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-slate-100 shrink-0 border border-slate-200 flex items-center justify-center text-slate-400">
                                  <Package className="w-5 h-5" />
                                </div>
                              )}
                              <div>
                                <div className="font-bold text-slate-900 line-clamp-1">{prod.name}</div>
                                {prod.badge && (
                                  <span className="text-[10px] text-red-600 font-semibold">{prod.badge}</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {prod.category_name || '-'}
                          </td>
                          <td className="py-3 px-4 font-mono tabular-nums text-slate-700">
                            {formatRupiah(prod.price)}
                          </td>
                          <td className="py-3 px-4 font-mono tabular-nums text-[#D71920] font-bold">
                            {prod.discount_price ? formatRupiah(prod.discount_price) : '-'}
                          </td>
                          <td className="py-3 px-4">
                            <span className={prod.stock <= 5 ? 'text-rose-600 font-bold' : 'text-slate-700 font-mono'}>
                              {prod.stock} unit
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <button
                              onClick={() => handleToggleProductFeatured(prod)}
                              className={`p-1 rounded-md transition-colors ${
                                prod.is_featured ? 'text-amber-500 hover:bg-amber-50' : 'text-slate-300 hover:text-slate-400'
                              }`}
                              title={prod.is_featured ? 'Hapus dari Unggulan' : 'Jadikan Unggulan'}
                            >
                              <Star className="w-4 h-4 fill-current" />
                            </button>
                          </td>
                          <td className="py-3 px-4">
                            <button
                              onClick={() => handleToggleProductActive(prod)}
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors ${
                                prod.is_active
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {prod.is_active ? 'Aktif' : 'Nonaktif'}
                            </button>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => openEditProduct(prod)}
                                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                                title="Edit Produk"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => requestDeleteProduct(prod.id, prod.name)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Hapus Produk"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* TAB 3: MANAJEMEN KATEGORI */}
        {/* ========================================================== */}
        {activeTab === 'categories' && (
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm uppercase">Daftar Kategori Katalog</h3>
                <p className="text-xs text-slate-500">Kelola dan atur urutan kategori produk</p>
              </div>
              <button
                onClick={openAddCategory}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#D71920] hover:bg-[#99131A] text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Kategori</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map(cat => {
                const prodCount = products.filter(p => p.category_id === cat.id).length;
                return (
                  <div key={cat.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {cat.image_url ? (
                        <img
                          src={cat.image_url}
                          alt={cat.name}
                          referrerPolicy="no-referrer"
                          className="w-12 h-12 rounded-xl object-cover bg-slate-100 border border-slate-200"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-red-50 text-[#D71920] font-bold text-xs flex items-center justify-center border border-slate-200">
                          {cat.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{cat.name}</div>
                        <div className="text-xs text-slate-500 font-medium">
                          Urutan: {cat.sort_order} · {prodCount} produk
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditCategory(cat)}
                        className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                        title="Edit Kategori"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => requestDeleteCategory(cat.id, cat.name)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Hapus Kategori"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* TAB 4: PESANAN MASUK (ORDERS) */}
        {/* ========================================================== */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm uppercase">Riwayat Pesanan Pelanggan</h3>
                <p className="text-xs text-slate-500">Semua pesanan yang masuk melalui WhatsApp Checkout</p>
              </div>
              <div className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg">
                Total Omset Masuk: <span className="text-[#D71920] font-mono">{formatRupiah(totalRevenue)}</span>
              </div>
            </div>

            {orders.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
                Belum ada data pesanan tercatat. Ketika pelanggan melakukan pemesanan WhatsApp, detail pesanan akan otomatis tersimpan disini untuk Anda kelola.
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map(order => (
                  <div key={order.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900 text-sm">{order.customer_name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 uppercase">
                            {order.status}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          WA: <strong className="text-slate-800">{order.customer_phone}</strong> · Alamat: {order.customer_address}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-extrabold text-base text-[#D71920] tabular-nums">
                          {formatRupiah(order.total)}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {new Date(order.created_at).toLocaleString('id-ID')}
                        </div>
                      </div>
                    </div>

                    {/* Order items list */}
                    <div className="bg-slate-50 p-3 rounded-xl space-y-1.5 text-xs">
                      <div className="font-bold text-slate-700">Daftar Barang:</div>
                      {order.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between text-slate-600">
                          <span>{it.quantity}x {it.product_name}</span>
                          <span className="font-mono">{formatRupiah(it.subtotal)}</span>
                        </div>
                      ))}
                      {order.notes && (
                        <div className="pt-2 text-[11px] text-slate-500 border-t border-slate-200">
                          Catatan: "{order.notes}"
                        </div>
                      )}
                    </div>

                    {/* Order Action Buttons */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 font-medium">Ubah Status:</span>
                        {(['baru', 'diproses', 'selesai', 'dibatalkan'] as const).map(st => (
                          <button
                            key={st}
                            onClick={async () => {
                              await StoreDb.updateOrderStatus(order.id, st);
                              await onRefreshData();
                              onShowToast(`Status pesanan diubah ke ${st}.`);
                            }}
                            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors ${
                              order.status === st
                                ? 'bg-slate-900 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>

                      <a
                        href={`https://wa.me/${order.customer_phone.replace(/\D/g, '')}?text=Halo%20kak%20${encodeURIComponent(order.customer_name)},%20kami%20dari%20PASGAR%20ARIF%20S%20ingin%20mengonfirmasi%20pesanan%20Anda`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition-colors"
                      >
                        Hubungi via WA
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================== */}
        {/* TAB 5: BANNER & INFORMASI TOKO */}
        {/* ========================================================== */}
        {activeTab === 'banner' && (
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-2xs space-y-6 max-w-3xl">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base uppercase flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-[#D71920]" />
                <span>Pengaturan Banner & Identitas Toko</span>
              </h3>
              <p className="text-xs text-slate-500">Sesuaikan foto promo utama, teks banner, dan identitas toko</p>
            </div>

            {/* LIVE BANNER PREVIEW & IMAGE EDITOR */}
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-[#D71920]" />
                  <span>Pratinjau Banner Promo Saat Ini</span>
                </span>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bannerForm.banner_active}
                    onChange={(e) => setBannerForm({ ...bannerForm, banner_active: e.target.checked })}
                    className="w-4 h-4 text-[#D71920] rounded border-slate-300 focus:ring-[#D71920]"
                  />
                  <span>Tampilkan Banner di Beranda</span>
                </label>
              </div>

              {/* Preview frame */}
              <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-300 shadow-xs aspect-16/9 sm:aspect-21/9 max-h-56">
                <img
                  src={bannerForm.banner_image_url || BANNER_PRESETS[0].url}
                  alt="Banner Promo"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = BANNER_PRESETS[0].url;
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/70 to-transparent p-4 sm:p-6 flex flex-col justify-end text-white">
                  {bannerForm.banner_badge && (
                    <span className="inline-block text-[10px] font-black uppercase tracking-wider text-red-400 bg-red-950/80 border border-red-800/80 px-2 py-0.5 rounded-sm w-fit mb-1">
                      {bannerForm.banner_badge}
                    </span>
                  )}
                  <h4 className="text-base sm:text-lg font-extrabold text-white line-clamp-1">
                    {bannerForm.banner_title}
                  </h4>
                  <p className="text-xs text-slate-300 line-clamp-2 max-w-md">
                    {bannerForm.banner_subtitle}
                  </p>
                </div>
              </div>

              {/* Upload image from device */}
              <div className="pt-2">
                <div className="p-4 bg-white border border-red-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                  <div>
                    <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                      <Upload className="w-4 h-4 text-[#D71920]" />
                      <span>Upload Foto Banner dari HP / Komputer</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Pilih foto dari kamera ponsel, galeri, atau laptop Anda (JPG, PNG, WebP)
                    </p>
                  </div>
                  <input
                    ref={bannerFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleBannerFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={isUploadingBanner}
                    onClick={() => bannerFileInputRef.current?.click()}
                    className="px-4 py-2 bg-[#D71920] hover:bg-[#99131A] text-white text-xs font-bold rounded-lg shadow-xs transition-colors shrink-0"
                  >
                    {isUploadingBanner ? 'Mengunggah...' : 'Pilih Foto Baru'}
                  </button>
                </div>
              </div>

              {/* Choose from high-res presets */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Atau Pilih Preset Gambar Berkualitas Tinggi:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {BANNER_PRESETS.map((preset, idx) => {
                    const isSelected = bannerForm.banner_image_url === preset.url;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setBannerForm({ ...bannerForm, banner_image_url: preset.url })}
                        className={`relative aspect-4/3 rounded-lg overflow-hidden border-2 text-left transition-all ${
                          isSelected
                            ? 'border-[#D71920] ring-2 ring-red-200 shadow-xs'
                            : 'border-slate-200 hover:border-slate-400 opacity-80 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={preset.url}
                          alt={preset.label}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-2 flex flex-col justify-end text-white">
                          <span className="text-[10px] font-bold leading-tight line-clamp-1">{preset.label}</span>
                        </div>
                        {isSelected && (
                          <div className="absolute top-1 right-1 bg-[#D71920] text-white rounded-full p-0.5">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Image URL input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Atau Input URL Gambar Langsung:
                </label>
                <input
                  type="text"
                  value={bannerForm.banner_image_url}
                  onChange={(e) => setBannerForm({ ...bannerForm, banner_image_url: e.target.value })}
                  placeholder="https://... atau path gambar"
                  className="w-full px-3.5 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:border-[#D71920] outline-hidden"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nama Toko (Wordmark)
                </label>
                <input
                  type="text"
                  value={bannerForm.store_name}
                  onChange={(e) => setBannerForm({ ...bannerForm, store_name: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:border-[#D71920] outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Tagline Toko
                </label>
                <input
                  type="text"
                  value={bannerForm.tagline}
                  onChange={(e) => setBannerForm({ ...bannerForm, tagline: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:border-[#D71920] outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nomor WhatsApp Checkout (Internasional 62...)
                </label>
                <input
                  type="text"
                  value={bannerForm.whatsapp_number}
                  onChange={(e) => setBannerForm({ ...bannerForm, whatsapp_number: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:border-[#D71920] outline-hidden font-mono"
                />
                <p className="text-[11px] text-slate-500 mt-1">Default resmi: 628567789981</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Judul Banner Promosi
                </label>
                <input
                  type="text"
                  value={bannerForm.banner_title}
                  onChange={(e) => setBannerForm({ ...bannerForm, banner_title: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:border-[#D71920] outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Sub-judul Banner
                </label>
                <textarea
                  rows={2}
                  value={bannerForm.banner_subtitle}
                  onChange={(e) => setBannerForm({ ...bannerForm, banner_subtitle: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:border-[#D71920] outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Badge Promosi Banner
                </label>
                <input
                  type="text"
                  value={bannerForm.banner_badge}
                  onChange={(e) => setBannerForm({ ...bannerForm, banner_badge: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:border-[#D71920] outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Alamat Lengkap Toko
                </label>
                <input
                  type="text"
                  value={bannerForm.address}
                  onChange={(e) => setBannerForm({ ...bannerForm, address: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:border-[#D71920] outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Jam Operasional
                </label>
                <input
                  type="text"
                  value={bannerForm.opening_hours}
                  onChange={(e) => setBannerForm({ ...bannerForm, opening_hours: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:border-[#D71920] outline-hidden"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={requestResetCatalog}
                className="text-xs text-rose-600 hover:underline font-bold"
              >
                Reset Katalog ke Default
              </button>

              <button
                type="button"
                onClick={handleSaveSettings}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#D71920] hover:bg-[#99131A] text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Pengaturan</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* TAB 6: SUPABASE DATABASE & SQL MIGRATION */}
        {/* ========================================================== */}
        {activeTab === 'database' && (
          <div className="space-y-6">
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base uppercase">Konfigurasi Supabase & Database</h3>
                  <p className="text-xs text-slate-500">
                    Aplikasi mendukung penyimpanan cloud Supabase aktif secara langsung dengan Row Level Security (RLS).
                  </p>
                </div>
                <div className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Adapter Database Siap</span>
                </div>
              </div>

              {/* Supabase Credentials Box */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Kredensial Akun Supabase Anda (Opsional jika ingin cloud database langsung)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      VITE_SUPABASE_URL
                    </label>
                    <input
                      type="text"
                      value={supabaseUrl}
                      onChange={(e) => setSupabaseUrl(e.target.value)}
                      placeholder="https://xyzcompany.supabase.co"
                      className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg outline-hidden focus:border-[#D71920]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      VITE_SUPABASE_ANON_KEY
                    </label>
                    <input
                      type="password"
                      value={supabaseKey}
                      onChange={(e) => setSupabaseKey(e.target.value)}
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                      className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg outline-hidden focus:border-[#D71920]"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleSaveSupabaseConfig}
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Simpan & Terapkan Kredensial Supabase</span>
                  </button>
                </div>
              </div>

              {/* SQL Migration Script Generator */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Script SQL Schema & Row Level Security (RLS)
                    </h4>
                    <p className="text-xs text-slate-500">
                      Salin script SQL ini dan jalankan di Supabase SQL Editor untuk membuat tabel dan aturan hak akses otomatis.
                    </p>
                  </div>
                  <button
                    onClick={handleCopySql}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#D71920] hover:bg-[#99131A] text-white font-bold text-xs rounded-lg shadow-xs transition-colors"
                  >
                    {sqlCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{sqlCopied ? 'Tersalin' : 'Salin Script SQL'}</span>
                  </button>
                </div>

                <pre className="p-4 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono overflow-x-auto max-h-96 leading-relaxed">
                  {SUPABASE_SQL_SCHEMA}
                </pre>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================== */}
      {/* PRODUCT ADD / EDIT MODAL */}
      {/* ========================================================== */}
      {isEditingProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn overflow-y-auto">
          <div
            className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-extrabold text-slate-900 text-base">
                {editingProductId ? 'Edit Produk' : 'Tambah Produk Baru'}
              </h3>
              <button
                onClick={() => setIsEditingProduct(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nama Produk <span className="text-[#D71920]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  placeholder="Contoh: Beras Ramos Pulen 5kg"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:border-[#D71920] outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Kategori <span className="text-[#D71920]">*</span>
                  </label>
                  <select
                    value={productForm.category_id}
                    onChange={(e) => setProductForm({ ...productForm, category_id: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:border-[#D71920] outline-hidden"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Stok Barang <span className="text-[#D71920]">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={productForm.stock}
                    onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:border-[#D71920] outline-hidden font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Harga Normal (Rp) <span className="text-[#D71920]">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                    placeholder="Contoh: 65000"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:border-[#D71920] outline-hidden font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Harga Diskon (Rp, Opsional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={productForm.discount_price}
                    onChange={(e) => setProductForm({ ...productForm, discount_price: e.target.value })}
                    placeholder="Contoh: 54000"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:border-[#D71920] outline-hidden font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Foto Produk
                </label>
                
                {/* Live Preview & Upload Controls */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 mb-2">
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-200 border border-slate-300 shrink-0 flex items-center justify-center">
                    {productForm.image_url ? (
                      <img
                        src={productForm.image_url}
                        alt="Preview"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                  
                  <div className="flex-1 space-y-1.5 w-full">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-2xs">
                      <Upload className="w-3.5 h-3.5 text-red-400" />
                      <span>Upload dari Perangkat / Galeri HP</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleProductImageFileUpload}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Format JPG, PNG, atau WEBP. Langsung tersimpan otomatis.
                    </p>
                  </div>
                </div>

                <input
                  type="text"
                  value={productForm.image_url}
                  onChange={(e) => setProductForm({ ...productForm, image_url: e.target.value })}
                  placeholder="Atau masukkan URL foto produk (https://...)"
                  className="w-full px-3.5 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:border-[#D71920] outline-hidden"
                />
                
                {/* Fast Preset Image Picker */}
                <div className="mt-2 flex items-center gap-1.5 overflow-x-auto pb-1">
                  <span className="text-[11px] text-slate-500 whitespace-nowrap font-medium">Pilihan Cepat:</span>
                  {PRESET_IMAGES.map((img, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setProductForm({ ...productForm, image_url: img.url })}
                      className="text-[10px] bg-slate-100 hover:bg-red-50 hover:text-[#D71920] text-slate-700 px-2.5 py-1 rounded-md whitespace-nowrap border border-slate-200 transition-colors"
                    >
                      {img.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Deskripsi Produk
                </label>
                <textarea
                  rows={3}
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  placeholder="Jelaskan kualitas, ukuran kemasan, keunggulan, atau cara penyimpanan..."
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:border-[#D71920] outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Badge Khusus (Opsional)
                </label>
                <input
                  type="text"
                  value={productForm.badge}
                  onChange={(e) => setProductForm({ ...productForm, badge: e.target.value })}
                  placeholder="Contoh: Terlaris / Segar Baru / Rekomendasi"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:border-[#D71920] outline-hidden"
                />
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={productForm.is_featured}
                    onChange={(e) => setProductForm({ ...productForm, is_featured: e.target.checked })}
                    className="w-4 h-4 text-[#D71920] rounded border-slate-300 focus:ring-[#D71920]"
                  />
                  <span className="text-xs font-bold text-slate-800">Produk Unggulan</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={productForm.is_active}
                    onChange={(e) => setProductForm({ ...productForm, is_active: e.target.checked })}
                    className="w-4 h-4 text-[#D71920] rounded border-slate-300 focus:ring-[#D71920]"
                  />
                  <span className="text-xs font-bold text-slate-800">Status Aktif (Tampil di Katalog)</span>
                </label>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingProduct(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#D71920] hover:bg-[#99131A] text-white text-xs font-bold rounded-lg transition-colors shadow-xs"
                >
                  Simpan Produk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* CATEGORY ADD / EDIT MODAL */}
      {/* ========================================================== */}
      {isEditingCategory && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div
            className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-extrabold text-slate-900 text-base">
                {editingCategoryId ? 'Edit Kategori' : 'Tambah Kategori Baru'}
              </h3>
              <button
                onClick={() => setIsEditingCategory(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nama Kategori <span className="text-[#D71920]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  placeholder="Contoh: Sembako & Kebutuhan Pokok"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:border-[#D71920] outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Urutan Tampil
                </label>
                <input
                  type="number"
                  min="1"
                  value={categoryForm.sort_order}
                  onChange={(e) => setCategoryForm({ ...categoryForm, sort_order: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:border-[#D71920] outline-hidden font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  URL Gambar Kategori (Opsional)
                </label>
                <input
                  type="text"
                  value={categoryForm.image_url}
                  onChange={(e) => setCategoryForm({ ...categoryForm, image_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:border-[#D71920] outline-hidden"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingCategory(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#D71920] hover:bg-[#99131A] text-white text-xs font-bold rounded-lg transition-colors shadow-xs"
                >
                  Simpan Kategori
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* IN-APP DELETE CONFIRMATION MODAL (Safe for iframe sandboxes) */}
      {/* ========================================================== */}
      {deleteConfirmation.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div
            className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-red-100 text-[#D71920] flex items-center justify-center mx-auto">
                <Trash2 className="w-7 h-7" />
              </div>

              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  {deleteConfirmation.type === 'product'
                    ? 'Konfirmasi Hapus Produk'
                    : deleteConfirmation.type === 'category'
                    ? 'Konfirmasi Hapus Kategori'
                    : 'Konfirmasi Reset Katalog'}
                </h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Apakah Anda yakin ingin menghapus{' '}
                  <strong className="text-slate-900">"{deleteConfirmation.name}"</strong>?
                  {deleteConfirmation.type === 'category' && (
                    <span className="block mt-1 text-slate-500">
                      (Produk pada kategori ini akan tetap tersimpan).
                    </span>
                  )}
                </p>
              </div>

              <div className="pt-2 flex items-center justify-center gap-3">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setDeleteConfirmation({ isOpen: false, type: 'product', id: '', name: '' })}
                  className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleExecuteDelete}
                  className="flex-1 py-2.5 px-4 bg-[#D71920] hover:bg-[#99131A] text-white text-xs font-bold rounded-xl shadow-md transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isDeleting ? 'Menghapus...' : 'Ya, Hapus'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
