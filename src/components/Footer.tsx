import React from 'react';
import { Phone, Clock, MapPin, ShieldCheck, Heart, Truck, CheckCircle2 } from 'lucide-react';
import { StoreSettings } from '../types';

interface FooterProps {
  settings: StoreSettings;
}

export const Footer: React.FC<FooterProps> = ({ settings }) => {
  return (
    <footer className="bg-white border-t border-slate-200 mt-16 text-slate-600">
      {/* Trust Badges Bar */}
      <div className="border-b border-slate-100 bg-slate-50 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-[#D71920] flex items-center justify-center shrink-0">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Pengiriman Cepat</h4>
                <p className="text-xs text-slate-500">Pesanan dikemas rapi & dikirim hari yang sama</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-[#D71920] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">100% Produk Berkualitas</h4>
                <p className="text-xs text-slate-500">Jaminan produk segar dan sembako berkualitas tinggi</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-[#D71920] flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Checkout WhatsApp Instan</h4>
                <p className="text-xs text-slate-500">Pesan tanpa ribet langsung ke CS WhatsApp kami</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Information */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand & Tagline */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#D71920] flex items-center justify-center text-white font-extrabold text-base">
                P
              </div>
              <span className="text-xl font-extrabold tracking-tight text-slate-900">
                {settings.store_name}
              </span>
            </div>
            <p className="text-sm text-slate-500 max-w-md font-medium leading-relaxed">
              {settings.tagline}
            </p>
            <p className="text-xs text-slate-500 leading-relaxed max-w-md">
              Pusat belanja online terpercaya untuk sembako pokok, buah segar, minuman herbal, camilan khas, serta perlengkapan kebutuhan harian Anda.
            </p>
          </div>

          {/* Store Contacts & Operation */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Kontak & Bantuan
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-600">
              <li className="flex items-start gap-2">
                <Phone className="w-4 h-4 text-[#D71920] shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-slate-800">WhatsApp Resmi:</div>
                  <a
                    href="https://wa.me/628567789981"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-[#D71920] transition-colors font-mono"
                  >
                    08567789981 (+62 856-7789-981)
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-[#D71920] shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-slate-800">Jam Operasional:</div>
                  <span>{settings.opening_hours}</span>
                </div>
              </li>
            </ul>
          </div>

          {/* Address */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Lokasi Toko
            </h4>
            <div className="flex items-start gap-2 text-xs text-slate-600">
              <MapPin className="w-4 h-4 text-[#D71920] shrink-0 mt-0.5" />
              <span>{settings.address}</span>
            </div>
            <div className="mt-4">
              <a
                href="https://wa.me/628567789981?text=Halo%20PASGAR%20ARIF%20S,%20saya%20mau%20tanya%20info%20produk"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-lg transition-colors"
              >
                <span>Chat Admin WhatsApp</span>
              </a>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-slate-200 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} {settings.store_name}. Hak Cipta Dilindungi.</p>
          <div className="flex items-center gap-4 text-xs">
            <span>Belanja Mudah</span>
            <span aria-hidden="true">·</span>
            <span>Cepat</span>
            <span aria-hidden="true">·</span>
            <span>Terpercaya</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
