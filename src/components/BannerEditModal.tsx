import React, { useState, useRef } from 'react';
import { X, Upload, Image as ImageIcon, Sparkles, Check, Save, Eye, AlertCircle } from 'lucide-react';
import { StoreSettings } from '../types';
import { StoreDb } from '../lib/supabase';

interface BannerEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: StoreSettings;
  onSave: (updated: StoreSettings) => void;
  onShowToast: (message: string) => void;
}

export const BANNER_PRESETS = [
  {
    label: 'Toko Pasar Supermarket',
    description: 'Interior supermarket segar & modern',
    url: '/src/assets/images/hero_pasgar_banner_1793909855421.jpg',
  },
  {
    label: 'Paket Sembako & Minyak',
    description: 'Beras pulen, minyak goreng & bahan pokok',
    url: '/src/assets/images/product_sembako_premium_1793909855702.jpg',
  },
  {
    label: 'Buah & Sayur Tropis',
    description: 'Aneka buah-buahan segar kualitas premium',
    url: '/src/assets/images/product_fresh_fruits_1793909856421.jpg',
  },
  {
    label: 'Kopi Nusantara & Camilan',
    description: 'Kopi Toraja specialty & snack renyah',
    url: '/src/assets/images/product_kopi_snack_1793909856858.jpg',
  },
];

export const BannerEditModal: React.FC<BannerEditModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
  onShowToast,
}) => {
  const [imageUrl, setImageUrl] = useState(settings.banner_image_url);
  const [title, setTitle] = useState(settings.banner_title);
  const [subtitle, setSubtitle] = useState(settings.banner_subtitle);
  const [badge, setBadge] = useState(settings.banner_badge);
  const [bannerActive, setBannerActive] = useState(settings.banner_active);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle direct file upload from device
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      onShowToast('File harus berupa gambar (JPG, PNG, atau WebP).');
      return;
    }

    // Limit to reasonable size for base64 storage
    if (file.size > 5 * 1024 * 1024) {
      onShowToast('Ukuran gambar maksimal 5 MB.');
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImageUrl(reader.result);
        onShowToast('Gambar promo berhasil diunggah!');
      }
      setIsUploading(false);
    };
    reader.onerror = () => {
      setIsUploading(false);
      onShowToast('Gagal membaca file gambar.');
    };
    reader.readAsDataURL(file);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl.trim()) {
      onShowToast('Gambar promo banner wajib dipilih atau diunggah.');
      return;
    }

    const updated: StoreSettings = {
      ...settings,
      banner_image_url: imageUrl.trim(),
      banner_title: title.trim(),
      banner_subtitle: subtitle.trim(),
      banner_badge: badge.trim(),
      banner_active: bannerActive,
    };

    StoreDb.saveSettings(updated);
    onSave(updated);
    onShowToast('Banner promo berhasil diperbarui oleh Administrator!');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn overflow-y-auto">
      <div
        className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#D71920] flex items-center justify-center text-white">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">Edit Gambar Promo Banner</h3>
              <p className="text-xs text-slate-400">Khusus Administrator PASGAR ARIF S</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleFormSubmit} className="p-6 space-y-6 max-h-[82vh] overflow-y-auto">
          {/* Live Preview Box */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-[#D71920]" />
              <span>Pratinjau Banner Promo (Live Preview)</span>
            </label>
            <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-300 shadow-sm aspect-16/9 sm:aspect-21/9 max-h-56">
              <img
                src={imageUrl || settings.banner_image_url || BANNER_PRESETS[0].url}
                alt="Pratinjau Banner"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = BANNER_PRESETS[0].url;
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/70 to-transparent p-4 sm:p-6 flex flex-col justify-end text-white">
                {badge && (
                  <span className="inline-block text-[10px] font-black uppercase tracking-wider text-red-400 bg-red-950/80 border border-red-800/80 px-2 py-0.5 rounded-sm w-fit mb-1">
                    {badge}
                  </span>
                )}
                <h4 className="text-base sm:text-lg font-extrabold text-white line-clamp-1">
                  {title || 'Judul Banner'}
                </h4>
                <p className="text-xs text-slate-300 line-clamp-2 max-w-md">
                  {subtitle || 'Sub-judul keterangan promo'}
                </p>
              </div>
            </div>
          </div>

          {/* Image Selection Methods */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Ubah Gambar Banner (Pilih Salah Satu Metode)
            </label>

            {/* Method 1: Upload from device */}
            <div className="p-4 bg-red-50/60 border border-red-200/80 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <Upload className="w-4 h-4 text-[#D71920]" />
                  <span>Upload Foto dari HP / Komputer</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Mendukung foto kamera langsung, galeri HP, atau file gambar JPG/PNG
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-[#D71920] hover:bg-[#99131A] text-white text-xs font-bold rounded-lg shadow-xs transition-colors shrink-0"
              >
                {isUploading ? 'Mengunggah...' : 'Pilih File Gambar'}
              </button>
            </div>

            {/* Method 2: Curated Presets */}
            <div>
              <span className="block text-xs font-semibold text-slate-600 mb-2">
                Atau Pilih Preset Gambar Berkualitas Tinggi:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {BANNER_PRESETS.map((preset, idx) => {
                  const isSelected = imageUrl === preset.url;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setImageUrl(preset.url)}
                      className={`relative aspect-4/3 rounded-lg overflow-hidden border-2 text-left transition-all group ${
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

            {/* Method 3: Direct URL */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Atau Masukkan URL Gambar Kustom:
              </label>
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://... atau path gambar"
                className="w-full px-3.5 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg focus:border-[#D71920] focus:bg-white outline-hidden"
              />
            </div>
          </div>

          {/* Banner Text Customization */}
          <div className="space-y-4 pt-2 border-t border-slate-200">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Sesuaikan Teks Banner Promo
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Badge Promo
                </label>
                <input
                  type="text"
                  value={badge}
                  onChange={(e) => setBadge(e.target.value)}
                  placeholder="PROMO SPESIAL HARI INI"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:border-[#D71920] focus:bg-white outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Judul Utama Promo
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Katalog Belanja Lengkap & Segar"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:border-[#D71920] focus:bg-white outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Sub-judul Deskripsi Promo
              </label>
              <textarea
                rows={2}
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="Dapatkan produk sembako berkualitas, buah-buahan segar..."
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:border-[#D71920] focus:bg-white outline-hidden"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                id="banner-active-toggle"
                type="checkbox"
                checked={bannerActive}
                onChange={(e) => setBannerActive(e.target.checked)}
                className="w-4 h-4 text-[#D71920] rounded border-slate-300 focus:ring-[#D71920]"
              />
              <label htmlFor="banner-active-toggle" className="text-xs font-bold text-slate-800 cursor-pointer">
                Aktifkan dan Tampilkan Banner di Halaman Utama
              </label>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-slate-200 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2.5 bg-[#D71920] hover:bg-[#99131A] text-white text-xs font-bold rounded-xl shadow-md transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Perubahan Banner</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
