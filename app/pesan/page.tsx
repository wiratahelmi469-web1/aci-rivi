import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { PesanClient } from './PesanClient';

export default async function PesanPage() {
  const session = await auth();
  const role = session?.user?.role?.toLowerCase();
  if (
    role === 'staff' ||
    role === 'pegawai' ||
    role === 'employee' ||
    role === 'admin'
  ) {
    redirect('/pegawai');
  }
  if (!session?.user?.id) {
    redirect('/masuk?next=%2Fpesan');
  }
  return <PesanClient />;
}
