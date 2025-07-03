import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';

// This object maps Paystack plan codes to your internal subscription tiers and benefits.
const PLAN_DETAILS: { [key: string]: { tier: string; gamesPerDay: number } } = {
[process.env.NEXT_PUBLIC_PAYSTACK_SILVER_PLAN!]: { tier: 'silver', gamesPerDay: 10 }, // Stays 10
  [process.env.NEXT_PUBLIC_PAYSTACK_GOLD_PLAN!]: { tier: 'gold', gamesPerDay: 12 },   // Changed from 25
  [process.env.NEXT_PUBLIC_PAYSTACK_DIAMOND_PLAN!]: { tier: 'diamond', gamesPerDay: 20 }, // Changed from 60
  [process.env.NEXT_PUBLIC_PAYSTACK_PLATINUM_PLAN!]: { tier: 'platinum', gamesPerDay: 20 }, // Changed from 150
};

export async function POST(req: NextRequest) {
  const secret = process.env.PAYSTACK_SECRET_KEY!;

  // 1. Verify the webhook signature for security
  const signature = req.headers.get('x-paystack-signature');
  const body = await req.text(); // Read the body as text to verify the signature

  const hash = crypto
    .createHmac('sha512', secret)
    .update(body)
    .digest('hex');

  if (hash !== signature) {
    console.error('Invalid Paystack webhook signature.');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // 2. Parse the event payload
  const event = JSON.parse(body);

  // 3. Handle the 'charge.success' event
  if (event.event === 'charge.success') {
    const { customer, plan, reference } = event.data;

    // Ensure it's a subscription payment (plan object should exist)
    if (!plan || !plan.plan_code) {
      console.log('Webhook received for a non-plan charge, ignoring.');
      return NextResponse.json({ status: 'success, but not a plan payment' });
    }

    const userEmail = customer.email;
    const planCode = plan.plan_code;

    try {
      // 4. Find the user in Firestore by email
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', userEmail));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        console.error(`Webhook Error: User with email ${userEmail} not found.`);
        return NextResponse.json({ error: 'User not found' }, { status: 200 });
      }

      const userDoc = querySnapshot.docs[0];
      const userDocRef = doc(db, 'users', userDoc.id);

      // 5. Determine subscription details from the plan code
      const subscriptionDetails = PLAN_DETAILS[planCode];
      if (!subscriptionDetails) {
        console.error(`Webhook Error: Plan code ${planCode} not found in our configuration.`);
        return NextResponse.json({ error: 'Plan not found' }, { status: 200 });
      }

      const now = new Date();
      const expiresAt = new Date(now.setDate(now.getDate() + 30)); // Subscription lasts 30 days

      // 6. Update the user's document with subscription info
      await updateDoc(userDocRef, {
        subscription: {
          tier: subscriptionDetails.tier,
          planCode: planCode,
          reference: reference,
          status: 'active',
          gamesPerDay: subscriptionDetails.gamesPerDay,
          subscribedAt: Timestamp.now(),
          expiresAt: Timestamp.fromDate(expiresAt),
        },
      });

      console.log(`Successfully updated subscription for ${userEmail} to ${subscriptionDetails.tier} tier.`);

    } catch (error: any) {
      console.error('Error processing webhook:', error);
      return NextResponse.json({ error: 'Internal server error while processing webhook' }, { status: 200 });
    }
  }

  // Acknowledge receipt of the webhook to Paystack for any event type
  return NextResponse.json({ status: 'received' });
}
