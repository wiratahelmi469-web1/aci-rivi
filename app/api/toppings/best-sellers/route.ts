import { NextResponse } from 'next/server';
import { getBestSellingToppings } from '@/lib/toppings-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rows = await getBestSellingToppings();

    return NextResponse.json(
      { toppingIds: rows.map((row) => row.id) },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    console.error(
      'best sellers GET error:',
      err instanceof Error ? err.message : err
    );
    return NextResponse.json(
      { error: 'Gagal memuat topping terlaris.' },
      { status: 500 }
    );
  }
}
