import React from 'react';
import { ShoppingBag, Search, Share2, Shield, X } from 'lucide-react';
import { StoreSettings } from '../types';

interface HeaderProps {
  settings: StoreSettings;
  cartCount: number;
  onOpenCart: () => void;
  onOpenShare: () => void;
  onOpenAdminLogin: () => void;
  isAdminLoggedIn: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onNavigateHome: () => void;
  activeCategory: string | null;
  onSelectCategory: (id: string | null) => void;
  isPublicCatalogMode?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  cartCount,
  onOpenCart,
  onOpenShare,
  onOpenAdminLogin,
  isAdminLoggedIn,
  searchQuery,
  onSearchChange,
  onNavigateHome,
  isPublicCatalogMode = false,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs transition-all">
      {/* Top Notification Bar */}
      <div className="bg-[#99131A] text-white text-xs py-1.5 px-4 text-center font-medium flex items-center justify-center gap-2">
        {isPublicCatalogMode && (
          <span className="bg-white/20 text-white font-bold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider mr-1">
            Katalog Publik
          </span>
        )}
        <span>{settings.tagline}</span>
        <span className="hidden sm:inline text-red-200">·</span>
        <span className="hidden sm:inline text-red-100">WhatsApp: 08567789981</span>
      </div>

      {/* Main Top Bar Contract: Zone 1 (Brand) - Zone 2 (Nav/Search) - Zone 3 (Action/Cart) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 md:gap-8">
        
        {/* Zone 1: Brand Wordmark (Single text element wordmark) */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onNavigateHome}
            className="text-left group focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#D71920] rounded-sm"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#D71920] flex items-center justify-center text-white font-extrabold text-base tracking-tighter shadow-sm group-hover:bg-[#99131A] transition-colors">
                P
              </div>
              <span className="text-xl font-extrabold tracking-tight text-slate-900 group-hover:text-[#D71920] transition-colors whitespace-nowrap">
                {settings.store_name}
              </span>
            </div>
          </button>
        </div>

        {/* Zone 2: Navigation & Integrated Search Bar */}
        <div className="hidden md:flex flex-1 items-center justify-center max-w-xl mx-4">
          <div className="relative w-full">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Cari sembako, buah segar, kopi, camilan..."
              className="w-full pl-10 pr-10 py-2 text-sm bg-slate-100 text-slate-800 placeholder-slate-400 rounded-full border border-transparent focus:border-[#D71920] focus:bg-white focus:outline-hidden transition-all shadow-inner"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                title="Hapus pencarian"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Zone 3: Primary Actions (Share Katalog & Cart) */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Share Katalog Button */}
          <button
            onClick={onOpenShare}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#D71920] bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors whitespace-nowrap shadow-xs"
            title="Bagikan Link Katalog"
          >
            <Share2 className="w-3.5 h-3.5 text-[#D71920]" />
            <span className="hidden sm:inline">Share Katalog</span>
          </button>

          {/* Admin shortcut (strictly hidden in public catalog mode) */}
          {!isPublicCatalogMode && (
            <button
              onClick={onOpenAdminLogin}
              className={`p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors ${isAdminLoggedIn ? 'text-[#D71920] bg-red-50' : ''}`}
              title={isAdminLoggedIn ? 'Buka Admin Dashboard' : 'Login Admin'}
            >
              <Shield className="w-4 h-4" />
            </button>
          )}

          {/* Shopping Bag Button with Counter */}
          <button
            onClick={onOpenCart}
            className="relative flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-white bg-[#D71920] hover:bg-[#99131A] rounded-lg shadow-sm hover:shadow-md transition-all whitespace-nowrap focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#D71920]"
          >
            <ShoppingBag className="w-4 h-4" />
            <span className="hidden sm:inline">Keranjang</span>
            {cartCount > 0 && (
              <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[11px] font-black bg-white text-[#D71920] rounded-full min-w-5 h-5 leading-none shadow-xs">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Search Row (visible on small screens) */}
      <div className="md:hidden px-4 pb-3 pt-1">
        <div className="relative w-full">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari produk di PASGAR ARIF S..."
            className="w-full pl-9 pr-8 py-2 text-sm bg-slate-100 text-slate-800 placeholder-slate-400 rounded-lg border border-transparent focus:border-[#D71920] focus:bg-white focus:outline-hidden"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
