'use client';

import { useRouter } from 'next/navigation';
import { CatatLangsungView } from '@/components/staff/CatatLangsungView';

export default function PegawaiKasirPage() {
  const router = useRouter();
  return (
    <CatatLangsungView
      onBatal={() => router.push('/pegawai')}
      onLihatPesananMasuk={() => router.push('/pegawai/pesanan')}
    />
  );
}
