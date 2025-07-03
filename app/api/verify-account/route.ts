import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin-config';

/**
 * Verifies the Firebase ID token from the Authorization header.
 * @param request The NextRequest object.
 * @returns The user's UID if the token is valid, otherwise null.
 */
async function verifyUser(request: NextRequest): Promise<string | null> {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    const idToken = authHeader.split('Bearer ')[1];
    if (!idToken) {
        return null;
    }
    try {
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        return decodedToken.uid;
    } catch (error) {
        console.error(`Error verifying Firebase ID token:`, error);
        return null;
    }
}

export async function POST(request: NextRequest) {
    const uid = await verifyUser(request);
    if (!uid) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
    if (!PAYSTACK_SECRET_KEY) {
        console.error('Paystack secret key is not set.');
        return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
    }

    try {
        const { accountNumber, bankCode } = await request.json();

        if (!accountNumber || !bankCode) {
            return NextResponse.json({ error: 'Account number and bank code are required.' }, { status: 400 });
        }

        const response = await fetch(`https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`, {
            headers: {
                Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
            },
        });

        const data = await response.json();

        if (!response.ok || !data.status) {
            return NextResponse.json({ error: data.message || 'Failed to verify account.' }, { status: response.status });
        }

        return NextResponse.json({ accountName: data.data.account_name });

    } catch (error: any) {
        console.error('Error verifying bank account:', error);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}