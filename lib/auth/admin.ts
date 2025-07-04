// lib/auth/admin.ts
import { NextRequest } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin-config';

export async function verifyAdmin(request: NextRequest): Promise<boolean> {
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
        // Ensure the custom claim 'admin' is true
        return decodedToken.admin === true;
    } catch (error) {
        console.error(`Error verifying Firebase ID token:`, error);
        return false;
    }
}