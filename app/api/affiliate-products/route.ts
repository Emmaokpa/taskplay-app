// app/api/affiliate-products/route.ts
import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase/admin-config';

/**
 * GET: Fetch all ACTIVE affiliate products for authenticated users.
 * This endpoint now requires and verifies a Firebase ID token from the frontend.
 */
export async function GET(request: Request) { // Changed to standard Request
  try {
    // 1. Get and validate the Authorization header
    const authorization = request.headers.get('Authorization');
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: No token provided or invalid format' }, { status: 401 });
    }

    // 2. Extract and verify the ID token
    const idToken = authorization.split('Bearer ')[1];
    await adminAuth.verifyIdToken(idToken);

    // 3. Fetch data using the Admin SDK
    const productsRef = adminDb.collection('affiliateProducts');
    const querySnapshot = await productsRef
      .where('isActive', '==', true)
      .orderBy('createdAt', 'desc')
      .get();

    const products = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json(products);

  } catch (error: any) {
    if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') {
      console.warn('Token verification failed:', error.message);
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }
    console.error('Error fetching active affiliate products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}