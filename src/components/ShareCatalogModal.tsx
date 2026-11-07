import React, { useState } from 'react';
import { X, Copy, Check, MessageCircle, Send, Share2, ExternalLink, QrCode } from 'lucide-react';
import { StoreSettings } from '../types';

interface ShareCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: StoreSettings;
  onShowToast: (message: string) => void;
  onViewCatalogMode: () => void;
}

export const ShareCatalogModal: React.FC<ShareCatalogModalProps> = ({
  isOpen,
  onClose,
  settings,
  onShowToast,
  onViewCatalogMode,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Generate public catalog link
  const origin = window.location.origin;
  const catalogUrl = `${origin}?view=katalog`;
  const shareMessage = `Katalog Resmi *${settings.store_name}* - ${settings.tagline}\nBelanja mudah dan cepat lewat WhatsApp! Lihat katalog lengkap disini:\n${catalogUrl}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(catalogUrl);
    setCopied(true);
    onShowToast('Link katalog publik berhasil disalin!');
    setTimeout(() => setCopied(false), 2000);
  };

  const shareToWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareMessage)}`, '_blank');
  };

  const shareToTelegram = () => {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(catalogUrl)}&text=${encodeURIComponent(shareMessage)}`, '_blank');
  };

  const shareToFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(catalogUrl)}`, '_blank');
  };

  const shareToInstagram = () => {
    navigator.clipboard.writeText(catalogUrl);
    onShowToast('Link katalog disalin! Buka Instagram & tempel di Bio atau Story Anda.');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div
        className="relative bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-red-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#D71920] flex items-center justify-center text-white">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Bagikan Link Katalog</h3>
              <p className="text-xs text-slate-500">Tautan aman untuk pelanggan umum (tanpa menu admin)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Link Box */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              URL Link Katalog Publik
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3.5 py-2.5 bg-slate-100 border border-slate-300 rounded-xl text-xs sm:text-sm font-mono text-slate-700 select-all truncate">
                {catalogUrl}
              </div>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-[#D71920] hover:bg-[#99131A] text-white text-xs font-bold rounded-xl shadow-xs transition-colors shrink-0"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Tersalin' : 'Salin'}</span>
              </button>
            </div>
          </div>

          {/* Share Channels */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
              Bagikan Langsung Melalui:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* WhatsApp */}
              <button
                onClick={shareToWhatsApp}
                className="flex flex-col items-center justify-center p-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all group"
              >
                <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                  <MessageCircle className="w-5 h-5 fill-current" />
                </div>
                <span className="text-xs font-bold text-emerald-900">WhatsApp</span>
              </button>

              {/* Telegram */}
              <button
                onClick={shareToTelegram}
                className="flex flex-col items-center justify-center p-3 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-xl transition-all group"
              >
                <div className="w-10 h-10 rounded-full bg-sky-500 text-white flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                  <Send className="w-5 h-5 fill-current" />
                </div>
                <span className="text-xs font-bold text-sky-900">Telegram</span>
              </button>

              {/* Facebook */}
              <button
                onClick={shareToFacebook}
                className="flex flex-col items-center justify-center p-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-all group"
              >
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                  <Share2 className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-blue-900">Facebook</span>
              </button>

              {/* Instagram */}
              <button
                onClick={shareToInstagram}
                className="flex flex-col items-center justify-center p-3 bg-pink-50 hover:bg-pink-100 border border-pink-200 rounded-xl transition-all group"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                  <QrCode className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-pink-900">Instagram</span>
              </button>
            </div>
          </div>

          {/* Preview Notice */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1">
            <div className="font-bold text-slate-800">Keamanan Katalog Publik Dijamin:</div>
            <p>
              Tautan ini hanya menyajikan data produk aktif, harga eceran, dan tombol belanja WhatsApp. Dashboard admin dan pengaturan toko tersembunyi secara permanen.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={() => {
              onClose();
              onViewCatalogMode();
            }}
            className="flex items-center gap-1.5 text-xs font-bold text-[#D71920] hover:underline"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Lihat Tampilan Pelanggan Sekarang</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg transition-colors"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};
