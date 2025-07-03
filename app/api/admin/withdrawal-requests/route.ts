import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase/admin-config';
import { WithdrawalRequest } from '@/lib/types';
import { Timestamp } from 'firebase-admin/firestore';

async function verifyAdmin(request: NextRequest): Promise<boolean> {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return false;
    }
    const idToken = authHeader.split('Bearer ')[1];
    if (!idToken) {
        return false;
    }
    try {
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        return decodedToken.admin === true;
    } catch (error) {
        console.error(`Error verifying Firebase ID token:`, error);
        return false;
    }
}

export async function GET(request: NextRequest) {
    const isAdmin = await verifyAdmin(request);
    if (!isAdmin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    try {
        let query = adminDb.collection('withdrawalRequests').orderBy('requestedAt', 'desc');

        if (status && ['pending', 'approved', 'rejected'].includes(status)) {
            query = query.where('status', '==', status);
        }

        const snapshot = await query.get();
        const requests = snapshot.docs.map(doc => {
            const data = doc.data() as WithdrawalRequest;
            return {
                ...data,
                id: doc.id,
                requestedAt: (data.requestedAt as Timestamp).toDate().toISOString(),
                processedAt: data.processedAt ? (data.processedAt as Timestamp).toDate().toISOString() : undefined,
            };
        });

        return NextResponse.json(requests);
    } catch (error: any) {
        console.error('Error fetching withdrawal requests:', error);
        return NextResponse.json({ error: 'Failed to fetch withdrawal requests' }, { status: 500 });
    }
}