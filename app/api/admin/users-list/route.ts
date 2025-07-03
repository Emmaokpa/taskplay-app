import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase/admin-config';

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

    try {
        const usersSnapshot = await adminDb.collection('users').orderBy('email').get();
        const users = usersSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                uid: doc.id,
                email: data.email,
                displayName: data.displayName || null,
            };
        });
        return NextResponse.json(users);
    } catch (error) {
        console.error('Error fetching users list:', error);
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }
}