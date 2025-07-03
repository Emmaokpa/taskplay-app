// src/app/api/admin/affiliate-products/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';

// Import initialized admin services
import { adminDb, adminAuth } from '@/lib/firebase/admin-config';


/**
 * Verifies the Firebase ID token from the Authorization header and checks for the 'admin: true' custom claim.
 * @param request The NextRequest object.
 * @returns true if the token is valid and user is admin, false otherwise.
 */
async function verifyAdmin(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn('[API Route] Unauthorized attempt: Missing or invalid Authorization header.');
    return false;
  }

  const idToken = authHeader.split('Bearer ')[1];
  if (!idToken) {
    console.warn('[API Route] Unauthorized attempt: ID token missing after Bearer.');
    return false;
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    console.log(`[API Route] Firebase ID Token Decoded for UID: ${decodedToken.uid}`);

    if (decodedToken.admin === true) {
      console.log(`[API Route] User ${decodedToken.uid} is authorized as admin.`);
      return true;
    } else {
      console.warn(`[API Route] User ${decodedToken.uid} is not an admin. Custom claim 'admin' is false or missing.`);
      return false;
    }
  } catch (error: any) {
    console.error(`[API Route] Error verifying Firebase ID token: ${error.code} - ${error.message}`);
    return false;
  }
}

// GET: Fetch all affiliate products
export async function GET(request: NextRequest) {
  console.log('GET /api/admin/affiliate-products requested.');
  const isAdmin = await verifyAdmin(request);
  if (!isAdmin) {
    console.log('GET /api/admin/affiliate-products: Unauthorized access.');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    // >>> CORRECTED LINE: Use adminDb here <<<
    const productsRef = adminDb.collection('affiliateProducts'); 
    const querySnapshot = await productsRef.orderBy('createdAt', 'desc').get(); // Admin SDK has similar methods
    const products = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log(`[API Route] Successfully fetched ${products.length} affiliate products.`);
    return NextResponse.json(products);
  } catch (error: any) {
    console.error('[API Route] Error fetching affiliate products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

// POST: Create a new affiliate product
export async function POST(request: NextRequest) {
  console.log('POST /api/admin/affiliate-products requested.');
  const isAdmin = await verifyAdmin(request);
  if (!isAdmin) {
    console.log('POST /api/admin/affiliate-products: Unauthorized access.');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const {
      title,
      description,
      imageUrl,
      baseLink,
      price,
      baseCommission,
      isActive
    } = await request.json();

    if (!title || !baseLink || baseCommission === undefined || price === undefined) {
      console.warn('POST /api/admin/affiliate-products: Missing required fields.');
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const newProduct = {
      title,
      description: description || '',
      imageUrl: imageUrl || '',
      baseLink,
      price: Number(price),
      baseCommission: Number(baseCommission),
      isActive: isActive !== undefined ? isActive : true,
      totalClicks: 0,
      totalSales: 0,
      totalEarnings: 0,
      createdAt: Timestamp.now(), // Still use client SDK Timestamp for type consistency
      updatedAt: Timestamp.now(), // Still use client SDK Timestamp for type consistency
    };

    // >>> CORRECTED LINE: Use adminDb here <<<
    const docRef = await adminDb.collection('affiliateProducts').add(newProduct); 
    console.log(`[API Route] New affiliate product created with ID: ${docRef.id}`);
    return NextResponse.json({ id: docRef.id, ...newProduct }, { status: 201 });
  } catch (error: any) {
    console.error('[API Route] Error creating affiliate product:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}