import { NextRequest, NextResponse } from 'next/server';

type WhoisFreaksAvailabilityItem = {
  domain: string;
  domainAvailability: boolean;
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const domain = searchParams.get('domain')?.trim();

  if (!domain) {
    return NextResponse.json(
      { message: 'domain query parameter is required' },
      { status: 400 }
    );
  }

  const apiKey = process.env.WHOISFREAKS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { message: 'WHOISFREAKS_API_KEY is not configured' },
      { status: 500 }
    );
  }

  try {
    const url = new URL('https://api.whoisfreaks.com/v1.0/domain/availability');
    url.searchParams.set('domain', domain);
    url.searchParams.set('apiKey', apiKey);

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return NextResponse.json(
        { message: `WhoisFreaks request failed with status ${res.status}`, body: text },
        { status: 502 }
      );
    }

    const data = await res.json() as unknown;

    const first = Array.isArray(data)
      ? (data[0] as WhoisFreaksAvailabilityItem | undefined)
      : undefined;

    if (!first || typeof first.domainAvailability !== 'boolean') {
      return NextResponse.json(
        { message: 'Unexpected response format from WhoisFreaks', data },
        { status: 502 }
      );
    }

    return NextResponse.json({
      domain,
      isAvailable: first.domainAvailability,
      source: 'whoisfreaks',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to check domain availability';
    return NextResponse.json({ message }, { status: 500 });
  }
}
