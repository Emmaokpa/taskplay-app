import { NextRequest, NextResponse } from 'next/server';

// Import initialized admin services
import { adminDb, adminAuth } from '@/lib/firebase/admin-config';

import { Timestamp } from 'firebase-admin/firestore';

/**
 * Verifies the Firebase ID token and checks if the user has the 'admin: true' custom claim.
 * @param request The NextRequest object containing headers.
 * @returns true if the token is valid and user is admin, false otherwise.
 */
async function verifyAdmin(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn('[API Route ID] Unauthorized attempt: Missing or invalid Authorization header.');
    return false;
  }

  const idToken = authHeader.split('Bearer ')[1];
  if (!idToken) {
    console.warn('[API Route ID] Unauthorized attempt: ID token missing after Bearer.');
    return false;
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    console.log(`[API Route ID] Firebase ID Token Decoded for UID: ${decodedToken.uid}`);

    if (decodedToken.admin === true) {
      console.log(`[API Route ID] User ${decodedToken.uid} is authorized as admin.`);
      return true;
    } else {
      console.warn(`[API Route ID] User ${decodedToken.uid} is not an admin. Custom claim 'admin' is false or missing.`);
      return false;
    }
  } catch (error: any) {
    console.error(`[API Route ID] Error verifying Firebase ID token: ${error.code} - ${error.message}`);
    return false;
  }
}

// PUT: Update an affiliate product by ID
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  console.log(`PUT /api/admin/affiliate-products/${id} requested.`);
  const isAdmin = await verifyAdmin(request);
  if (!isAdmin) {
    console.log(`PUT /api/admin/affiliate-products/${id}: Unauthorized access.`);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    // >>> CORRECTED LINE: Use adminDb here <<<
    const productRef = adminDb.collection('affiliateProducts').doc(id); // Admin SDK way to get a document reference

    const docSnap = await productRef.get(); // Admin SDK method to get a snapshot
    if (!docSnap.exists) { // Admin SDK uses .exists property directly
      console.warn(`PUT /api/admin/affiliate-products/${id}: Product not found.`);
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const updateData: { [key: string]: any } = { ...body, updatedAt: Timestamp.now() };

    // Ensure numeric fields are stored as numbers if they are being updated
    if (body.price !== undefined) {
      updateData.price = Number(body.price);
    }
    if (body.baseCommission !== undefined) {
      updateData.baseCommission = Number(body.baseCommission);
    }

    await productRef.update(updateData); // Admin SDK method to update

    console.log(`[API Route ID] Product ${id} updated successfully.`);
    return NextResponse.json({ id, ...updateData });
  } catch (error: any) {
    console.error(`[API Route ID] Error updating product ${id}:`, error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

// DELETE: Delete an affiliate product by ID
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  console.log(`DELETE /api/admin/affiliate-products/${id} requested.`);
  const isAdmin = await verifyAdmin(request);
  if (!isAdmin) {
    console.log(`DELETE /api/admin/affiliate-products/${id}: Unauthorized access.`);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    // >>> CORRECTED LINE: Use adminDb here <<<
    const productRef = adminDb.collection('affiliateProducts').doc(id); // Admin SDK way to get a document reference
    const docSnap = await productRef.get(); // Admin SDK method to get a snapshot

    if (!docSnap.exists) { // Admin SDK uses .exists property directly
      console.warn(`DELETE /api/admin/affiliate-products/${id}: Product not found.`);
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    await productRef.delete(); // Admin SDK method to delete

    console.log(`[API Route ID] Product ${id} deleted successfully.`);
    return NextResponse.json({ message: 'Product deleted successfully' });
  } catch (error: any) {
    console.error(`[API Route ID] Error deleting product ${id}:`, error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}