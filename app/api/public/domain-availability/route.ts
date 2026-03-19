import { NextResponse } from 'next/server';

type DomainResponse = {
    domain?: string;
    domainAvailability?: boolean;
};

type NormalizedDomainResponse = {
    domain: string;
    isAvailable: boolean;
    source: 'whoisfreaks';
};

export async function GET(request: Request) {
    const url = new URL(request.url);
    const domain = url.searchParams.get('domain');

    if (!domain) {
        return NextResponse.json({ message: 'Domain parameter is required' }, { status: 400 });
    }

    const response = await fetch(`https://api.whoisfreaks.com/?domain=${domain}`);
    const data: DomainResponse | DomainResponse[] = await response.json();

    let normalizedData: NormalizedDomainResponse[];

    if (Array.isArray(data)) {
        normalizedData = data.map(item => ({
            domain: item.domain || '',
            isAvailable: item.domainAvailability === true,
            source: 'whoisfreaks',
        }));
    } else if (typeof data === 'object' && data !== null) {
        normalizedData = [{
            domain: data.domain || '',
            isAvailable: data.domainAvailability === true,
            source: 'whoisfreaks',
        }];
    } else {
        // Unexpected shape
        return NextResponse.json({ message: 'Unexpected response shape' }, { status: 502 });
    }

    return NextResponse.json(normalizedData, { headers: { 'Cache-Control': 'no-store' } });
}