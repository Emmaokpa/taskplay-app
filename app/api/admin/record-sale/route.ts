import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase/admin-config';
import { FieldValue } from 'firebase-admin/firestore';
import { UserProfile, AffiliateProduct } from '@/lib/types';

// This should match the rates on your affiliate page
const VIP_EARNING_RATES: { [key: string]: number } = {
  free: 0.20,
  silver: 0.30,
  gold: 0.40,
  diamond: 0.50,
  platinum: 0.60,
};

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

export async function POST(request: NextRequest) {
    const isAdmin = await verifyAdmin(request);
    if (!isAdmin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const { userId, productId, saleAmount } = await request.json();

        if (!userId || !productId || saleAmount === undefined) {
            return NextResponse.json({ error: 'Missing required fields: userId, productId, saleAmount' }, { status: 400 });
        }

        const numericSaleAmount = Number(saleAmount);
        if (isNaN(numericSaleAmount) || numericSaleAmount <= 0) {
            return NextResponse.json({ error: 'Invalid sale amount' }, { status: 400 });
        }

        await adminDb.runTransaction(async (transaction) => {
            const userRef = adminDb.collection('users').doc(userId);
            const productRef = adminDb.collection('affiliateProducts').doc(productId);

            const [userDoc, productDoc] = await transaction.getAll(userRef, productRef);

            if (!userDoc.exists) {
                throw new Error(`User with ID ${userId} not found.`);
            }
            if (!productDoc.exists) {
                throw new Error(`Product with ID ${productId} not found.`);
            }

            const userProfile = userDoc.data() as UserProfile;
            const product = productDoc.data() as AffiliateProduct;

            // Determine user's earning percentage
            const userTier = userProfile.subscription?.status === 'active'
                             ? userProfile.subscription.tier
                             : 'free';
            const earningPercentage = VIP_EARNING_RATES[userTier] || VIP_EARNING_RATES.free;

            // --- LOGIC CHANGE ---
            // Treat `baseCommission` as a percentage rate (e.g., a value of 10 means 10%).
            const commissionRate = (product.baseCommission || 0) / 100;
            if (isNaN(commissionRate)) {
                throw new Error(`Invalid 'baseCommission' for product "${product.title}". It must be a number.`);
            }

            // Calculate the actual commission based on the sale amount from the form.
            const totalCommissionForSale = numericSaleAmount * commissionRate;
            const userPortionOfCommission = totalCommissionForSale * earningPercentage;

            // 1. Update the product's total sales and earnings
            transaction.update(productRef, {
                totalSales: FieldValue.increment(1),
                totalEarnings: FieldValue.increment(userPortionOfCommission),
            });

            // 2. Update the user's affiliate earnings
            transaction.update(userRef, {
                affiliateEarnings: FieldValue.increment(userPortionOfCommission),
            });
        });

        return NextResponse.json({ message: 'Sale recorded successfully' }, { status: 200 });

    } catch (error: any) {
        console.error('Error recording affiliate sale:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}