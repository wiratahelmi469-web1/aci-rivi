import { Clock3, CookingPot, CreditCard, LogIn } from 'lucide-react';

const langkah = [
  {
    title: 'Masuk',
    detail: 'Masuk atau buat akun pelanggan untuk mulai memesan.',
    Icon: LogIn,
  },
  {
    title: 'Racik topping',
    detail: 'Pilih topping dan atur jumlahnya sesuai selera.',
    Icon: CookingPot,
  },
  {
    title: 'Pilih jam & bayar',
    detail: 'Tentukan waktu ambil yang tersedia, lalu selesaikan pembayaran QRIS.',
    Icon: CreditCard,
  },
  {
    title: 'Ambil tanpa antre',
    detail: 'Datang sesuai jadwal dan tunjukkan nomor pesananmu.',
    Icon: Clock3,
  },
];

export function CaraPesan() {
  return (
    <section aria-labelledby="cara-pesan">
      <div className="mb-4">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-red-600">Mudah dan praktis</p>
        <h2 id="cara-pesan" className="mt-1 text-2xl font-extrabold tracking-tight text-stone-900 sm:text-3xl">
          Cara Pesan
        </h2>
      </div>
      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {langkah.map(({ title, detail, Icon }, index) => (
          <li key={title} className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-red-600">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="font-mono text-sm font-bold text-stone-300">0{index + 1}</span>
            </div>
            <h3 className="mt-4 text-base font-bold text-stone-900">{title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-stone-600">{detail}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
