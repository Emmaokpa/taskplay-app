// app/api/admin/withdrawal-requests/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase/admin-config';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { sendEmail } from '@/lib/email';
import { WithdrawalRequestStatusUpdate } from '@/emails/WithdrawalRequestStatusUpdate';

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

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } } // Corrected: Direct destructuring of params
) {
    const isAdmin = await verifyAdmin(request);
    if (!isAdmin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id: requestId } = params; // Access params directly
    try {
        const { status, rejectionReason } = await request.json();

        // To be used for email notification after transaction
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
            requestDataForEmail = requestData; // Capture data for email
            if (requestData?.status !== 'pending') {
                throw new Error(`Request is already ${requestData?.status}.`);
            }

            const updateData: { [key: string]: any } = {
                status,
                processedAt: Timestamp.now(),
            };

            if (status === 'rejected') {
                updateData.rejectionReason = rejectionReason;

                // Refund the amount to the user's balance.
                // For simplicity, we refund to the main nairaBalance.
                const userRef = adminDb.collection('users').doc(requestData.userId);
                transaction.update(userRef, {
                    nairaBalance: FieldValue.increment(requestData.grossAmount),
                });
            }

            transaction.update(requestRef, updateData);
        });

        // Send status update email outside the transaction
        if (requestDataForEmail && requestDataForEmail.userEmail) {
            try {
                await sendEmail({
                    to: requestDataForEmail.userEmail,
                    subject: `Your Withdrawal Request has been ${status}`,
                    react: WithdrawalRequestStatusUpdate({
                        displayName: requestDataForEmail.displayName || 'User',
                        status,
                        netAmount: requestDataForEmail.netAmount,
                        rejectionReason: rejectionReason,
                        dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/profile`,
                    }),
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

// If you have a DELETE function in this file, it will also need the same fix.
// Example for DELETE:
// export async function DELETE(
//   request: NextRequest,
//   { params }: { params: { id: string } }
// ) {
//   const { id: requestId } = params;
//   // ... rest of your DELETE logic
// }