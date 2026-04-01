import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const apiKey = process.env.API_CO_ID_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, message: 'API_CO_ID_KEY is not configured', data: { banks: [] } });
    }

    const res = await fetch('https://use.api.co.id/validation/bank/available', {
      headers: {
        'x-api-co-id': apiKey
      },
      next: { revalidate: 86400 } // Cache for 24 hours
    });

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching banks:', error);
    return NextResponse.json({ success: false, message: 'Internal server error', data: { banks: [] } }, { status: 500 });
  }
}
