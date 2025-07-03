import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase/admin-config';
import { WithdrawalRequest } from '@/lib/types';
import { Timestamp } from 'firebase-admin/firestore';

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

export async function GET(request: NextRequest) {
    const uid = await verifyUser(request);
    if (!uid) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const requestsSnapshot = await adminDb
            .collection('withdrawalRequests')
            .where('userId', '==', uid)
            .orderBy('requestedAt', 'desc')
            .limit(10) // Get the 10 most recent requests
            .get();

        const history = requestsSnapshot.docs.map(doc => {
            const data = doc.data() as WithdrawalRequest;
            // Convert Firestore Timestamps to serializable strings for the client
            return {
                ...data,
                id: doc.id,
                requestedAt: (data.requestedAt as Timestamp).toDate().toISOString(),
                processedAt: data.processedAt ? (data.processedAt as Timestamp).toDate().toISOString() : undefined,
            };
        });

        return NextResponse.json(history);

    } catch (error: any) {
        console.error('Error fetching withdrawal history:', error);
        return NextResponse.json({ error: 'Failed to fetch withdrawal history.' }, { status: 500 });
    }
}