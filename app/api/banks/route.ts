import { NextResponse } from 'next/server';

export async function GET() {
  const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

  if (!PAYSTACK_SECRET_KEY) {
    console.error('Paystack secret key is not set in environment variables.');
    return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
  }

  try {
    // Fetching only for Nigeria
    const response = await fetch('https://api.paystack.co/bank?country=nigeria', {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      },
      // Using Next.js's built-in caching for fetch
      next: { revalidate: 86400 }, // Cache for 24 hours (86400 seconds)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch banks from Paystack.');
    }

    const data = await response.json();

    if (data.status && Array.isArray(data.data)) {
      // Sort banks alphabetically by name for a better user experience
      const sortedBanks = data.data.sort((a: any, b: any) => a.name.localeCompare(b.name));
      return NextResponse.json(sortedBanks);
    } else {
      throw new Error('Unexpected response format from Paystack.');
    }
  } catch (error: any) {
    console.error('Error fetching banks:', error);
    return NextResponse.json({ error: 'Failed to fetch bank list.' }, { status: 500 });
  }
}