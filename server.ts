import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { INITIAL_CATEGORIES, INITIAL_PRODUCTS, INITIAL_SETTINGS } from './src/data/initialData';
import { Product, Category, StoreSettings, Order } from './src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'store-db.json');

interface DatabaseSchema {
  settings: StoreSettings;
  categories: Category[];
  products: Product[];
  orders: Order[];
  visits: Record<string, number>;
}

// Ensure data folder and store-db.json exist with initial data
function initDb(): DatabaseSchema {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.products) && parsed.products.length > 0 && Array.isArray(parsed.categories)) {
        return parsed;
      }
    } catch (err) {
      console.warn('Failed to parse existing store-db.json, reinitializing:', err);
    }
  }

  const defaultData: DatabaseSchema = {
    settings: INITIAL_SETTINGS,
    categories: INITIAL_CATEGORIES,
    products: INITIAL_PRODUCTS,
    orders: [],
    visits: { [new Date().toISOString().slice(0, 10)]: 24 },
  };

  fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2), 'utf-8');
  return defaultData;
}

let db = initDb();

function saveDb() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save store-db.json:', err);
  }
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '15mb' }));

  // ========================================================
  // API ROUTES (Shared persistence across all devices & users)
  // ========================================================

  // 1. Get entire catalog
  app.get('/api/catalog', (_req: Request, res: Response) => {
    // Sort products newest first by default
    const sortedProducts = [...db.products].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const sortedCategories = [...db.categories].sort((a, b) => 
      (a.sort_order || 0) - (b.sort_order || 0)
    );

    res.json({
      success: true,
      settings: db.settings,
      categories: sortedCategories,
      products: sortedProducts,
      orders: db.orders,
      visits: db.visits,
      timestamp: Date.now(),
    });
  });

  // 2. Save / Update Product
  app.post('/api/products', (req: Request, res: Response) => {
    const product: Product = req.body;
    if (!product || !product.id || !product.name) {
      return res.status(400).json({ error: 'Data produk tidak lengkap.' });
    }

    const index = db.products.findIndex(p => p.id === product.id);
    const updatedProduct = {
      ...product,
      updated_at: new Date().toISOString(),
    };

    if (index >= 0) {
      db.products[index] = updatedProduct;
    } else {
      db.products.unshift(updatedProduct);
    }

    saveDb();
    console.log(`[Product Saved] ${product.name} (Total: ${db.products.length})`);
    res.json({ success: true, product: updatedProduct });
  });

  // 3. Delete Product
  app.delete('/api/products/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const initialLen = db.products.length;
    db.products = db.products.filter(p => p.id !== id);
    saveDb();
    console.log(`[Product Deleted] ID: ${id} (Before: ${initialLen}, After: ${db.products.length})`);
    res.json({ success: true });
  });

  // 4. Save / Update Category
  app.post('/api/categories', (req: Request, res: Response) => {
    const category: Category = req.body;
    if (!category || !category.id || !category.name) {
      return res.status(400).json({ error: 'Data kategori tidak lengkap.' });
    }

    const index = db.categories.findIndex(c => c.id === category.id);
    if (index >= 0) {
      db.categories[index] = category;
    } else {
      db.categories.push(category);
    }

    saveDb();
    console.log(`[Category Saved] ${category.name}`);
    res.json({ success: true, category });
  });

  // 5. Delete Category
  app.delete('/api/categories/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    db.categories = db.categories.filter(c => c.id !== id);
    saveDb();
    res.json({ success: true });
  });

  // 6. Save Store Settings & Promo Banner
  app.post('/api/settings', (req: Request, res: Response) => {
    const newSettings: StoreSettings = req.body;
    if (!newSettings || !newSettings.store_name) {
      return res.status(400).json({ error: 'Data pengaturan tidak valid.' });
    }

    db.settings = {
      ...db.settings,
      ...newSettings,
    };
    saveDb();
    console.log(`[Settings Saved] Banner: ${db.settings.banner_title}`);
    res.json({ success: true, settings: db.settings });
  });

  // 7. Save WhatsApp Order
  app.post('/api/orders', (req: Request, res: Response) => {
    const order: Order = req.body;
    if (!order || !order.id) {
      return res.status(400).json({ error: 'Data pesanan tidak valid.' });
    }

    db.orders.unshift(order);
    saveDb();
    console.log(`[Order Received] Pelanggan: ${order.customer_name}, Total: ${order.total}`);
    res.json({ success: true, order });
  });

  // 8. Record Visit
  app.post('/api/visit', (_req: Request, res: Response) => {
    const today = new Date().toISOString().slice(0, 10);
    db.visits[today] = (db.visits[today] || 0) + 1;
    saveDb();
    res.json({ success: true });
  });

  // 9. Reset Catalog to Factory Defaults
  app.post('/api/reset', (_req: Request, res: Response) => {
    db.settings = INITIAL_SETTINGS;
    db.categories = INITIAL_CATEGORIES;
    db.products = INITIAL_PRODUCTS;
    saveDb();
    console.log('[Catalog Reset to Default]');
    res.json({ success: true });
  });

  // ========================================================
  // FRONTEND INTEGRATION (Vite Dev Middleware / Production)
  // ========================================================
  if (process.env.NODE_ENV === 'production' && fs.existsSync(path.join(__dirname, 'dist'))) {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PASGAR ARIF S Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
