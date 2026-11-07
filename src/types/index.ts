export interface Product {
  id: string;
  name: string;
  slug: string;
  category_id: string;
  category_name?: string;
  description: string;
  price: number;
  discount_price?: number | null;
  stock: number;
  image_url: string;
  gallery: string[];
  badge?: string;
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  image_url?: string;
  sort_order: number;
  created_at: string;
}

export interface OrderItem {
  product_id: string;
  product_name: string;
  price: number;
  quantity: number;
  subtotal: number;
  image_url?: string;
}

export interface Order {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  items: OrderItem[];
  total: number;
  notes?: string;
  status: 'baru' | 'diproses' | 'selesai' | 'dibatalkan';
  created_at: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface AdminUser {
  id: string;
  email: string;
  role: 'admin' | 'superadmin';
  created_at: string;
}

export interface StoreSettings {
  store_name: string;
  tagline: string;
  whatsapp_number: string;
  address: string;
  opening_hours: string;
  banner_title: string;
  banner_subtitle: string;
  banner_badge: string;
  banner_image_url: string;
  banner_active: boolean;
}
