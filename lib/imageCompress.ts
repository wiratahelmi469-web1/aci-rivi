export interface CompressOptions {
  maxSide: number;
  maxBytes: number;
  initialQuality: number;
  minQuality?: number;
}

export interface CompressedImageResult {
  dataUrl: string;
  sizeBytes: number;
}

function estimateDataUrlBytes(dataUrl: string): number {
  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx === -1) return dataUrl.length;
  const base64 = dataUrl.slice(commaIdx + 1);
  return Math.ceil((base64.length * 3) / 4);
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('File gambar tidak dapat dibaca.'));
    };
    img.src = objectUrl;
  });
}

export async function compressImageFile(
  file: File,
  options: CompressOptions
): Promise<CompressedImageResult> {
  if (!file.type.startsWith('image/')) {
    throw new Error('File yang dipilih bukan gambar. Gunakan file JPG, PNG, atau WebP.');
  }

  const img = await loadImageFromFile(file);
  const origW = img.naturalWidth || img.width;
  const origH = img.naturalHeight || img.height;

  if (!origW || !origH) {
    throw new Error('Ukuran gambar tidak valid.');
  }

  let scale = Math.min(1, options.maxSide / Math.max(origW, origH));
  let width = Math.max(1, Math.round(origW * scale));
  let height = Math.max(1, Math.round(origH * scale));

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Browser tidak mendukung pemrosesan gambar.');
  }

  const minQuality = options.minQuality ?? 0.45;
  let quality = options.initialQuality;
  let dataUrl = '';
  let sizeBytes = Infinity;

  // Coba kompresi bertahap: turunkan kualitas dahulu, lalu ukuran jika masih melebihi batas
  for (let pass = 0; pass < 7; pass++) {
    canvas.width = width;
    canvas.height = height;

    // Isi latar putih agar gambar PNG transparan (mis. QRIS) tetap jelas saat jadi JPEG
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    dataUrl = canvas.toDataURL('image/jpeg', quality);
    sizeBytes = estimateDataUrlBytes(dataUrl);

    if (sizeBytes <= options.maxBytes) {
      break;
    }

    if (quality > minQuality + 0.05) {
      quality = Math.max(minQuality, quality - 0.1);
    } else {
      scale *= 0.82;
      width = Math.max(200, Math.round(origW * scale));
      height = Math.max(200, Math.round(origH * scale));
    }
  }

  return { dataUrl, sizeBytes };
}

export async function compressToppingPhoto(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Gunakan foto JPG, PNG, atau WebP.');
  }
  if (file.size > 2 * 1024 * 1024) {
    throw new Error('Ukuran foto maksimal 2 MB.');
  }

  const res = await compressImageFile(file, {
    maxSide: 800,
    maxBytes: 200 * 1024,
    initialQuality: 0.7,
    minQuality: 0.45,
  });
  return res.dataUrl;
}

export async function compressPaymentProof(file: File): Promise<string> {
  const res = await compressImageFile(file, {
    maxSide: 1000,
    maxBytes: 300 * 1024,
    initialQuality: 0.75,
    minQuality: 0.45,
  });
  return res.dataUrl;
}

export async function compressQrisPhoto(file: File): Promise<string> {
  const res = await compressImageFile(file, {
    maxSide: 1200,
    maxBytes: 400 * 1024,
    initialQuality: 0.9,
    minQuality: 0.65,
  });
  return res.dataUrl;
}
