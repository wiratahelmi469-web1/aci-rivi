export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function isValidWhatsApp(phone: string): boolean {
  const trimmed = phone.trim();
  return /^(08|62)[0-9]{8,12}$/.test(trimmed);
}

export function getWhatsAppValidationError(phone: string): string | undefined {
  const trimmed = phone.trim();
  if (!trimmed) return 'Nomor WhatsApp wajib diisi';
  if (!/^[0-9]+$/.test(trimmed)) {
    return 'Nomor WhatsApp hanya boleh berisi angka';
  }
  if (!trimmed.startsWith('08') && !trimmed.startsWith('62')) {
    return 'Nomor WhatsApp harus diawali 08 atau 62';
  }
  if (trimmed.length < 10 || trimmed.length > 14) {
    return 'Nomor WhatsApp harus 10–14 digit';
  }
  return undefined;
}

export function getFirstName(fullName: string | undefined | null): string {
  if (!fullName) return 'Pelanggan';
  const first = fullName.trim().split(/\s+/)[0];
  return first || 'Pelanggan';
}
