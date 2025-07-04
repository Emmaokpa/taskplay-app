import { NextRequest, NextResponse } from 'next/server';
import Paystack from 'paystack';
import { v4 as uuidv4 } from 'uuid';

const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
if (!paystackSecretKey) {
  throw new Error('PAYSTACK_SECRET_KEY environment variable is not set.');
}
const paystack = Paystack(paystackSecretKey);

export async function POST(req: NextRequest) {
  try {
    const { email, plan } = await req.json();

    // console.log('Received email:', email);
    // console.log('Received plan from request body:', plan);

    if (!email || !plan) {
      return NextResponse.json({ error: 'Email and plan are required.' }, { status: 400 });
    }

    const validPlans = [
      process.env.NEXT_PUBLIC_PAYSTACK_SILVER_PLAN,
      process.env.NEXT_PUBLIC_PAYSTACK_GOLD_PLAN,
      process.env.NEXT_PUBLIC_PAYSTACK_DIAMOND_PLAN,
      process.env.NEXT_PUBLIC_PAYSTACK_PLATINUM_PLAN,
    ];

    // console.log('Valid Plans from Environment:', validPlans);

    if (!validPlans.includes(plan)) {
      // console.error('Invalid plan selected by user:', plan);
      return NextResponse.json({ error: 'Invalid plan selected.' }, { status: 400 });
    }

    let amount = 0; // Amount in kobo

    // Determine amount based on the plan.
    switch (plan) {
       case process.env.NEXT_PUBLIC_PAYSTACK_SILVER_PLAN:
        amount = (parseInt(process.env.PAYSTACK_SILVER_AMOUNT || '4000', 10)) * 100;
        break;
      case process.env.NEXT_PUBLIC_PAYSTACK_GOLD_PLAN:
        amount = (parseInt(process.env.PAYSTACK_GOLD_AMOUNT || '7000', 10)) * 100;
        break;
      case process.env.NEXT_PUBLIC_PAYSTACK_DIAMOND_PLAN:
        amount = (parseInt(process.env.PAYSTACK_DIAMOND_AMOUNT || '12000', 10)) * 100;
        break;
      case process.env.NEXT_PUBLIC_PAYSTACK_PLATINUM_PLAN:
        amount = (parseInt(process.env.PAYSTACK_PLATINUM_AMOUNT || '20000', 10)) * 100;
        break;
    }

    // console.log('Selected Plan Code to send to Paystack:', plan);
    // console.log('Calculated Amount (in kobo):', amount);

    const reference = uuidv4();
    // console.log('Generated Reference:', reference);

    const response = await paystack.transaction.initialize({
      email,
      plan,
      amount,
      reference,
      name: email, // or provide a real name if available
    });

    // console.log('Paystack API Response:', response);

    if (response.status === false) {
      console.error('Paystack API Error:', response.message);
      return NextResponse.json({ error: `Paystack error: ${response.message}` }, { status: 400 });
    }

    const responseData = {
      authorization_url: response.data.authorization_url,
      access_code: response.data.access_code,
      reference: response.data.reference,
    };

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error('Caught Paystack error in try-catch:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}