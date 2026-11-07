import { CartItem } from '../types';

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount).replace(/\s+/g, ' ');
}

export function formatNumber(amount: number): string {
  return new Intl.NumberFormat('id-ID').format(amount);
}

export function calculateDiscountPercent(originalPrice: number, discountPrice?: number | null): number {
  if (!discountPrice || discountPrice >= originalPrice) return 0;
  return Math.round(((originalPrice - discountPrice) / originalPrice) * 100);
}

export function getEffectivePrice(originalPrice: number, discountPrice?: number | null): number {
  if (discountPrice && discountPrice > 0 && discountPrice < originalPrice) {
    return discountPrice;
  }
  return originalPrice;
}

export interface CheckoutDetails {
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  notes?: string;
  items: CartItem[];
  total: number;
  whatsappNumber?: string;
}

export function buildWhatsAppOrderMessage(details: CheckoutDetails): string {
  const itemsText = details.items
    .map((item, index) => {
      const unitPrice = getEffectivePrice(item.product.price, item.product.discount_price);
      const subtotal = unitPrice * item.quantity;
      return `${index + 1}. ${item.product.name}\n   Harga: ${formatRupiah(unitPrice)}\n   Jumlah: ${item.quantity}\n   Subtotal: ${formatRupiah(subtotal)}`;
    })
    .join('\n\n');

  const notesText = details.notes?.trim() ? details.notes.trim() : '-';

  return `HALO PASGAR ARIF S.
Saya ingin melakukan pemesanan:
Nama pelanggan: ${details.customerName}
Nomor WhatsApp: ${details.customerPhone}
Alamat pengiriman: ${details.customerAddress}
Metode pengiriman: Dikirim Sales (Kurir Resmi PASGAR ARIF S)

DAFTAR PESANAN:
${itemsText}

TOTAL PESANAN: ${formatRupiah(details.total)}

Catatan tambahan: ${notesText}
Mohon konfirmasi ketersediaan barang. Siap dikirim oleh sales toko.`;
}

export function generateWhatsAppUrl(details: CheckoutDetails): string {
  const targetNumber = details.whatsappNumber || '628567789981';
  const cleanNumber = targetNumber.replace(/\D/g, '');
  const message = buildWhatsAppOrderMessage(details);
  return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
}

export function generateProductWhatsAppUrl(productName: string, price: number, whatsappNumber = '628567789981'): string {
  const cleanNumber = whatsappNumber.replace(/\D/g, '');
  const message = `HALO PASGAR ARIF S.
Saya tertarik dan ingin memesan produk:
Nama Produk: ${productName}
Harga: ${formatRupiah(price)}

Mohon info stok dan cara pemesanan selanjutnya. Terima kasih!`;
  return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
}
