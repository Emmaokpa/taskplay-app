// app/api/admin/affiliate-products/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin-config';
import { Timestamp } from 'firebase-admin/firestore';
import { verifyAdmin } from '@/lib/auth/admin';

// Helper to type Promise-based params
type IdParams = { params: Promise<{ id: string }> };

// PUT: Update an affiliate product by ID
export async function PUT(
  request: NextRequest,
  context: IdParams
) {
  const { id } = await context.params;

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
export async function DELETE(
  request: NextRequest,
  context: IdParams
) {
  const { id } = await context.params;

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
