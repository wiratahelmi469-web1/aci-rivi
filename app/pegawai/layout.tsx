import type { Metadata } from 'next';
import { StaffShell } from '@/components/staff/StaffShell';

export const metadata: Metadata = {
  title: 'Area Pegawai — Aci Rivi',
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function PegawaiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <StaffShell>{children}</StaffShell>;
}
