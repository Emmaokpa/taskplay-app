import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase/admin-config';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { UserProfile } from '@/lib/types';
import { sendEmail } from '@/lib/email';
import { WithdrawalRequestAdminNotification } from '@/emails/WithdrawalRequestAdminNotification';
import { WithdrawalRequestUserConfirmation } from '@/emails/WithdrawalRequestUserConfirmation';

const MINIMUM_WITHDRAWAL_AMOUNT = 1000; // Example: ₦1000
const WITHDRAWAL_FEE_PERCENTAGE = 0.05; // 5%

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

export async function POST(request: NextRequest) {
    const uid = await verifyUser(request);
    if (!uid) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { amount } = await request.json();
        const grossAmount = Number(amount);

        // Storing these for email notifications later
        let userEmailForNotification: string | null = null;
        let displayNameForNotification: string | null = null;

        if (isNaN(grossAmount) || grossAmount <= 0) {
            return NextResponse.json({ error: 'Invalid withdrawal amount.' }, { status: 400 });
        }

        if (grossAmount < MINIMUM_WITHDRAWAL_AMOUNT) {
            return NextResponse.json({ error: `Minimum withdrawal amount is ₦${MINIMUM_WITHDRAWAL_AMOUNT}.` }, { status: 400 });
        }

        const userRef = adminDb.collection('users').doc(uid);
        const requestsRef = adminDb.collection('withdrawalRequests');

        await adminDb.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) {
                throw new Error('User not found.');
            }

            const userProfile = userDoc.data() as UserProfile;
            userEmailForNotification = userProfile.email;
            displayNameForNotification = userProfile.displayName || 'User';

            // 1. Check for payout details
            if (!userProfile.payoutDetails) {
                throw new Error('Payout details are not set up. Please add your bank account information in your profile.');
            }

            // 2. Check for sufficient balance
            const referralEarnings = userProfile.referralEarnings || 0;
            const affiliateEarnings = userProfile.affiliateEarnings || 0;
            const nairaBalance = userProfile.nairaBalance || 0;
            const totalBalance = referralEarnings + affiliateEarnings + nairaBalance;

            if (totalBalance < grossAmount) {
                throw new Error('Insufficient balance.');
            }
            
            // 3. Check for existing pending requests
            const pendingRequestQuery = requestsRef
                .where('userId', '==', uid)
                .where('status', '==', 'pending');
            const pendingSnapshot = await transaction.get(pendingRequestQuery);
            if (!pendingSnapshot.empty) {
                throw new Error('You already have a pending withdrawal request. Please wait for it to be processed.');
            }

            // 4. Calculate fee and create withdrawal request document
            const fee = grossAmount * WITHDRAWAL_FEE_PERCENTAGE;
            const netAmount = grossAmount - fee;

            const newRequestRef = requestsRef.doc();
            transaction.create(newRequestRef, {
                userId: uid,
                userEmail: userProfile.email,
                displayName: userProfile.displayName || null,
                grossAmount: grossAmount,
                fee: fee,
                netAmount: netAmount,
                status: 'pending',
                requestedAt: Timestamp.now(),
                payoutDetails: userProfile.payoutDetails,
            });

            // 5. Deduct from balances in a specific order
            let amountToDeduct = grossAmount;
            const updates: { [key: string]: FieldValue } = {};

            const referralDeduction = Math.min(amountToDeduct, referralEarnings);
            if (referralDeduction > 0) {
                updates.referralEarnings = FieldValue.increment(-referralDeduction);
                amountToDeduct -= referralDeduction;
            }

            if (amountToDeduct > 0) {
                const affiliateDeduction = Math.min(amountToDeduct, affiliateEarnings);
                if (affiliateDeduction > 0) {
                    updates.affiliateEarnings = FieldValue.increment(-affiliateDeduction);
                    amountToDeduct -= affiliateDeduction;
                }
            }

            if (amountToDeduct > 0) {
                updates.nairaBalance = FieldValue.increment(-amountToDeduct);
            }
            
            transaction.update(userRef, updates);
        });

        // Send email notifications outside the transaction
        if (userEmailForNotification && displayNameForNotification) {
            const adminEmail = process.env.ADMIN_EMAIL;
            const fee = grossAmount * WITHDRAWAL_FEE_PERCENTAGE;
            const netAmount = grossAmount - fee;

            try {
                // Notify admin
                if (adminEmail) {
                    await sendEmail({
                        to: adminEmail,
                        subject: 'New Withdrawal Request',
                        react: WithdrawalRequestAdminNotification({
                            displayName: displayNameForNotification,
                            userEmail: userEmailForNotification,
                            grossAmount: grossAmount,
                            netAmount: netAmount,
                            adminDashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/admin/withdrawals`,
                        }),
                    });
                }

                // Notify user
                await sendEmail({
                    to: userEmailForNotification,
                    subject: 'Withdrawal Request Received',
                    react: WithdrawalRequestUserConfirmation({
                        displayName: displayNameForNotification,
                        grossAmount, fee, netAmount,
                        dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/profile`,
                    }),
                });
            } catch (emailError) {
                console.error('Failed to send withdrawal request emails:', emailError);
                // Do not fail the main request if emails fail
            }
        }

        return NextResponse.json({ message: 'Withdrawal request submitted successfully.' }, { status: 201 });

    } catch (error: any) {
        console.error('Error requesting withdrawal:', error);
        return NextResponse.json({ error: error.message || 'Internal server error.' }, { status: 500 });
    }
}