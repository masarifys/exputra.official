import { NextResponse } from 'next/server';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get('domain');
    const apiKey = process.env.WHOISFREAKS_API_KEY;

    const response = await fetch(`https://api.whoisfreaks.com/v1.0/domain/availability?apiKey=${apiKey}&domain=${domain}`);
    const data = await response.json();

    return NextResponse.json({ domain, isAvailable: data.isAvailable });
}
