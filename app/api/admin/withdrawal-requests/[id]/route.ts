// app/api/admin/withdrawal-requests/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin-config';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { sendEmail } from '@/lib/email';
import { WithdrawalRequestStatusUpdate } from '@/emails/WithdrawalRequestStatusUpdate';
import React from 'react';
import { verifyAdmin } from '@/lib/auth/admin';

type IdParams = { params: Promise<{ id: string }> };

export async function PUT(
  request: NextRequest,
  { params }: IdParams
) {
  const isAdmin = await verifyAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { id: requestId } = await params;

  try {
    const { status, rejectionReason } = await request.json();

    let requestDataForEmail: any = null;

    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status provided.' }, { status: 400 });
    }
    if (status === 'rejected' && !rejectionReason) {
      return NextResponse.json({ error: 'Rejection reason is required for rejected status.' }, { status: 400 });
    }

    const requestRef = adminDb.collection('withdrawalRequests').doc(requestId);

    await adminDb.runTransaction(async (transaction) => {
      const requestDoc = await transaction.get(requestRef);
      if (!requestDoc.exists) {
        throw new Error('Withdrawal request not found.');
      }

      const requestData = requestDoc.data();
      requestDataForEmail = requestData;

      if (requestData?.status !== 'pending') {
        throw new Error(`Request is already ${requestData?.status}.`);
      }

      const updateData: { [key: string]: any } = {
        status,
        processedAt: Timestamp.now(),
      };

      if (status === 'rejected') {
        updateData.rejectionReason = rejectionReason;

        const userRef = adminDb.collection('users').doc(requestData.userId);
        transaction.update(userRef, {
          nairaBalance: FieldValue.increment(requestData.grossAmount),
        });
      }

      transaction.update(requestRef, updateData);
    });

    if (requestDataForEmail && requestDataForEmail.userEmail) {
      try {
        await sendEmail({
          to: requestDataForEmail.userEmail,
          subject: `Your Withdrawal Request has been ${status}`,
          react: WithdrawalRequestStatusUpdate({
            displayName: requestDataForEmail.displayName || 'User',
            status,
            netAmount: requestDataForEmail.netAmount,
            rejectionReason,
            dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/profile`,
          }) as React.ReactElement,
        });
      } catch (emailError) {
        console.error(`Failed to send withdrawal ${status} email for request ${requestId}:`, emailError);
      }
    }

    return NextResponse.json({ message: `Request successfully ${status}.` });
  } catch (error: any) {
    console.error(`Error updating withdrawal request ${requestId}:`, error);
    return NextResponse.json({ error: error.message || 'Internal server error.' }, { status: 500 });
  }
}
