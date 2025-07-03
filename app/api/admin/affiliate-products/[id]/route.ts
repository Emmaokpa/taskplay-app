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
    return false;
  }

  const idToken = authHeader.split('Bearer ')[1];
  if (!idToken) {
    return false;
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    return decodedToken.admin === true;
  } catch (error: any) {
    // Log errors for debugging, but don't expose details to the client.
    console.error(`Error verifying admin token: ${error.message}`);
    return false;
  }
}

// PUT: Update an affiliate product by ID
export async function PUT(request: NextRequest, context: { params: { id: string } }) {
  const { id } = context.params;
  const isAdmin = await verifyAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const productRef = adminDb.collection('affiliateProducts').doc(id);

    const docSnap = await productRef.get();
    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const updateData: { [key: string]: any } = { ...body, updatedAt: Timestamp.now() };

    // Sanitize numeric fields
    if (body.price !== undefined) {
      updateData.price = Number(body.price);
    }
    if (body.baseCommission !== undefined) {
      updateData.baseCommission = Number(body.baseCommission);
    }

    await productRef.update(updateData);

    return NextResponse.json({ id, ...updateData });
  } catch (error: any) {
    console.error(`Error updating product ${id}:`, error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

// DELETE: Delete an affiliate product by ID
export async function DELETE(request: NextRequest, context: { params: { id: string } }) {
  const { id } = context.params;
  const isAdmin = await verifyAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const productRef = adminDb.collection('affiliateProducts').doc(id);
    const docSnap = await productRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    await productRef.delete();

    return NextResponse.json({ message: 'Product deleted successfully' });
  } catch (error: any) {
    console.error(`Error deleting product ${id}:`, error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}