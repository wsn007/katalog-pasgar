import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Product, Category, Order, StoreSettings } from '../types';
import { INITIAL_CATEGORIES, INITIAL_PRODUCTS, INITIAL_SETTINGS } from '../data/initialData';

// Local storage keys
const STORAGE_KEY_PRODUCTS = 'pasgar_products';
const STORAGE_KEY_CATEGORIES = 'pasgar_categories';
const STORAGE_KEY_ORDERS = 'pasgar_orders';
const STORAGE_KEY_SETTINGS = 'pasgar_settings';
const STORAGE_KEY_SUPABASE_CONFIG = 'pasgar_supabase_config';
const STORAGE_KEY_VISITS = 'pasgar_visits';

interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export function getSupabaseConfig(): SupabaseConfig {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  if (envUrl && envKey) {
    return { url: envUrl, anonKey: envKey };
  }

  try {
    const saved = localStorage.getItem(STORAGE_KEY_SUPABASE_CONFIG);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.url && parsed.anonKey) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error reading saved Supabase config:', err);
  }

  return { url: '', anonKey: '' };
}

export function saveSupabaseConfig(url: string, anonKey: string): void {
  localStorage.setItem(STORAGE_KEY_SUPABASE_CONFIG, JSON.stringify({ url, anonKey }));
}

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (!config.url || !config.anonKey) {
    return null;
  }
  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(config.url, config.anonKey);
    } catch (err) {
      console.error('Failed to create Supabase client:', err);
      return null;
    }
  }
  return supabaseInstance;
}

// Full Supabase SQL Migration Script for user to copy & paste into Supabase SQL Editor
export const SUPABASE_SQL_SCHEMA = `-- ========================================================
-- PASGAR ARIF S - DATABASE SCHEMA & ROW LEVEL SECURITY (RLS)
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)
-- ========================================================

-- 1. Create CATEGORIES Table
CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  image_url TEXT,
  sort_order INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create PRODUCTS Table
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category_id TEXT REFERENCES public.categories(id) ON DELETE SET NULL,
  category_name TEXT,
  description TEXT,
  price NUMERIC NOT NULL,
  discount_price NUMERIC,
  stock INTEGER DEFAULT 0,
  image_url TEXT NOT NULL,
  gallery TEXT[] DEFAULT '{}',
  badge TEXT,
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create ORDERS Table (From WhatsApp Checkout)
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT NOT NULL,
  items JSONB NOT NULL,
  total NUMERIC NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'baru',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create ADMIN Table
CREATE TABLE IF NOT EXISTS public.admin (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies: Categories
-- Anyone can read categories
CREATE POLICY "Public can view categories"
  ON public.categories FOR SELECT
  USING (true);

-- Authenticated admins can insert, update, and delete
CREATE POLICY "Admins can manage categories"
  ON public.categories FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin WHERE id = auth.uid()));

-- 7. RLS Policies: Products
-- Public can only view active products
CREATE POLICY "Public can view active products"
  ON public.products FOR SELECT
  USING (is_active = true OR auth.role() = 'authenticated');

-- Authenticated admins have full CRUD access
CREATE POLICY "Admins can manage all products"
  ON public.products FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin WHERE id = auth.uid()));

-- 8. RLS Policies: Orders
-- Customers can submit orders via checkout
CREATE POLICY "Public can create orders"
  ON public.orders FOR INSERT
  WITH CHECK (true);

-- Authenticated admins can view and update orders
CREATE POLICY "Admins can view and manage orders"
  ON public.orders FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin WHERE id = auth.uid()));
`;

// ==========================================
// DATA ADAPTER (Supabase + LocalStorage Fallback)
// ==========================================

// Dispatch real-time data update event across tabs and components
export function notifyDataUpdated(): void {
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pasgar_data_updated', { detail: { timestamp: Date.now() } }));
      localStorage.setItem('pasgar_last_sync', Date.now().toString());
    }
  } catch (e) {
    // ignore
  }
}

export class StoreDb {
  private static isSyncing = false;

  private static initLocal(): void {
    if (!localStorage.getItem(STORAGE_KEY_PRODUCTS)) {
      localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
    }
    if (!localStorage.getItem(STORAGE_KEY_CATEGORIES)) {
      localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(INITIAL_CATEGORIES));
    }
    if (!localStorage.getItem(STORAGE_KEY_SETTINGS)) {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(INITIAL_SETTINGS));
    }
    if (!localStorage.getItem(STORAGE_KEY_ORDERS)) {
      localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify([]));
    }
  }

  // Fetch full catalog from server database to sync all devices and browsers
  static async syncFromServer(): Promise<{
    products: Product[];
    categories: Category[];
    settings: StoreSettings;
    orders: Order[];
  } | null> {
    if (this.isSyncing) return null;
    this.isSyncing = true;
    try {
      const res = await fetch('/api/catalog');
      if (res.ok) {
        const data = await res.json();
        if (data && data.success) {
          if (Array.isArray(data.products)) {
            localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(data.products));
          }
          if (Array.isArray(data.categories)) {
            localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(data.categories));
          }
          if (data.settings && data.settings.store_name) {
            localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(data.settings));
          }
          if (Array.isArray(data.orders)) {
            localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(data.orders));
          }
          return {
            products: data.products,
            categories: data.categories,
            settings: data.settings,
            orders: data.orders,
          };
        }
      }
    } catch (e) {
      // Backend not reached or offline, fallback to local storage
    } finally {
      this.isSyncing = false;
    }
    return null;
  }

  // Categories
  static async getCategories(): Promise<Category[]> {
    this.initLocal();
    try {
      const serverData = await this.syncFromServer();
      if (serverData && serverData.categories) {
        return serverData.categories;
      }
    } catch {
      // fallback
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .order('sort_order', { ascending: true });
        if (!error && data && data.length > 0) {
          localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(data));
          return data;
        }
      } catch (err) {
        console.warn('Supabase fetch categories failed:', err);
      }
    }

    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY_CATEGORIES) || '[]');
      return data.sort((a: Category, b: Category) => (a.sort_order || 0) - (b.sort_order || 0));
    } catch {
      return INITIAL_CATEGORIES;
    }
  }

  static async saveCategory(category: Category): Promise<void> {
    this.initLocal();
    try {
      const list: Category[] = JSON.parse(localStorage.getItem(STORAGE_KEY_CATEGORIES) || '[]');
      const index = list.findIndex(c => c.id === category.id);
      if (index >= 0) {
        list[index] = category;
      } else {
        list.push(category);
      }
      localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(list));
    } catch (e) {
      console.error('Error saving category locally:', e);
    }

    // Persist to Server
    try {
      await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(category),
      });
    } catch (err) {
      console.warn('Server saveCategory failed:', err);
    }

    // Persist to Supabase if configured
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('categories').upsert(category);
      } catch (err) {
        console.warn('Supabase saveCategory failed:', err);
      }
    }
    notifyDataUpdated();
  }

  static async deleteCategory(id: string): Promise<void> {
    this.initLocal();
    try {
      const list: Category[] = JSON.parse(localStorage.getItem(STORAGE_KEY_CATEGORIES) || '[]');
      const filtered = list.filter(c => c.id !== id);
      localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(filtered));
    } catch (e) {
      console.error('Error deleting category from localStorage:', e);
    }

    // Persist delete to Server
    try {
      await fetch(`/api/categories/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('Server deleteCategory failed:', err);
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('categories').delete().eq('id', id);
      } catch (err) {
        console.warn('Supabase deleteCategory failed:', err);
      }
    }
    notifyDataUpdated();
  }

  // Products
  static async getProducts(includeInactive = false): Promise<Product[]> {
    this.initLocal();
    try {
      const serverData = await this.syncFromServer();
      if (serverData && serverData.products) {
        return includeInactive ? serverData.products : serverData.products.filter(p => p.is_active);
      }
    } catch {
      // fallback
    }

    let localList: Product[] = [];
    try {
      localList = JSON.parse(localStorage.getItem(STORAGE_KEY_PRODUCTS) || '[]');
    } catch {
      localList = INITIAL_PRODUCTS;
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        let query = supabase.from('products').select('*');
        if (!includeInactive) {
          query = query.eq('is_active', true);
        }
        const { data, error } = await query.order('created_at', { ascending: false });
        if (!error && data && data.length > 0) {
          const map = new Map<string, Product>();
          data.forEach(p => map.set(p.id, p));
          localList.forEach(p => {
            if (!map.has(p.id)) {
              map.set(p.id, p);
            }
          });
          const merged = Array.from(map.values()).sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(merged));
          return includeInactive ? merged : merged.filter(p => p.is_active);
        }
      } catch (err) {
        console.warn('Supabase getProducts failed, fallback to local:', err);
      }
    }

    // Always sort newest first
    const sorted = [...localList].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    if (includeInactive) {
      return sorted;
    }
    return sorted.filter(p => p.is_active);
  }

  static async saveProduct(product: Product): Promise<void> {
    this.initLocal();
    const updated = {
      ...product,
      updated_at: new Date().toISOString(),
    };

    try {
      const list: Product[] = JSON.parse(localStorage.getItem(STORAGE_KEY_PRODUCTS) || '[]');
      const index = list.findIndex(p => p.id === product.id);
      if (index >= 0) {
        list[index] = updated;
      } else {
        list.unshift(updated);
      }
      localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(list));
    } catch (e) {
      console.error('Error saving product locally:', e);
    }

    // Persist to Server database
    try {
      await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
    } catch (err) {
      console.warn('Server saveProduct failed:', err);
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('products').upsert(updated);
      } catch (err) {
        console.warn('Supabase saveProduct failed, persisting local:', err);
      }
    }

    notifyDataUpdated();
  }

  static async deleteProduct(id: string): Promise<void> {
    this.initLocal();
    try {
      const list: Product[] = JSON.parse(localStorage.getItem(STORAGE_KEY_PRODUCTS) || '[]');
      const filtered = list.filter(p => p.id !== id);
      localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(filtered));
    } catch (e) {
      console.error('Error deleting product from localStorage:', e);
    }

    // Persist delete to Server
    try {
      await fetch(`/api/products/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('Server deleteProduct failed:', err);
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('products').delete().eq('id', id);
      } catch (err) {
        console.warn('Supabase deleteProduct failed:', err);
      }
    }

    notifyDataUpdated();
  }

  // Orders
  static async createOrder(order: Order): Promise<void> {
    this.initLocal();
    const orders: Order[] = JSON.parse(localStorage.getItem(STORAGE_KEY_ORDERS) || '[]');
    orders.unshift(order);
    localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(orders));

    // Persist to Server
    try {
      await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order),
      });
    } catch (err) {
      console.warn('Server createOrder failed:', err);
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('orders').insert(order);
      } catch (err) {
        console.warn('Supabase createOrder failed, persisting local:', err);
      }
    }
    notifyDataUpdated();
  }

  static async getOrders(): Promise<Order[]> {
    this.initLocal();
    try {
      const serverData = await this.syncFromServer();
      if (serverData && serverData.orders) {
        return serverData.orders;
      }
    } catch {}

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data) {
          localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(data));
          return data;
        }
      } catch (err) {
        console.warn('Supabase getOrders failed, fallback to local:', err);
      }
    }

    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY_ORDERS) || '[]');
    } catch {
      return [];
    }
  }

  static async updateOrderStatus(orderId: string, status: Order['status']): Promise<void> {
    this.initLocal();
    const orders: Order[] = JSON.parse(localStorage.getItem(STORAGE_KEY_ORDERS) || '[]');
    const idx = orders.findIndex(o => o.id === orderId);
    if (idx >= 0) {
      orders[idx].status = status;
      localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(orders));
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('orders').update({ status }).eq('id', orderId);
      } catch (err) {
        console.warn('Supabase updateOrderStatus failed:', err);
      }
    }
    notifyDataUpdated();
  }

  // Settings
  static getSettings(): StoreSettings {
    this.initLocal();
    try {
      const data = localStorage.getItem(STORAGE_KEY_SETTINGS);
      return data ? { ...INITIAL_SETTINGS, ...JSON.parse(data) } : INITIAL_SETTINGS;
    } catch {
      return INITIAL_SETTINGS;
    }
  }

  static saveSettings(settings: StoreSettings): void {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));

    // Persist to Server
    fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    }).catch(err => {
      console.warn('Server saveSettings failed:', err);
    });

    notifyDataUpdated();
  }

  // Analytics
  static recordVisit(): void {
    fetch('/api/visit', { method: 'POST' }).catch(() => {});
    try {
      const today = new Date().toISOString().slice(0, 10);
      const visits = JSON.parse(localStorage.getItem(STORAGE_KEY_VISITS) || '{}');
      visits[today] = (visits[today] || 0) + 1;
      localStorage.setItem(STORAGE_KEY_VISITS, JSON.stringify(visits));
    } catch {
      // ignore
    }
  }

  static getVisitStats(): { total: number; today: number } {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const visits: Record<string, number> = JSON.parse(localStorage.getItem(STORAGE_KEY_VISITS) || '{}');
      const total = Object.values(visits).reduce((sum, count) => sum + count, 0);
      return {
        total: Math.max(total, 128),
        today: Math.max(visits[today] || 1, 14),
      };
    } catch {
      return { total: 128, today: 14 };
    }
  }

  // Reset to default
  static async resetToDefault(): Promise<void> {
    localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
    localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(INITIAL_CATEGORIES));
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(INITIAL_SETTINGS));

    try {
      await fetch('/api/reset', { method: 'POST' });
    } catch {}
    notifyDataUpdated();
  }
}
