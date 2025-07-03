import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

    // We need to find the Paystack customer code first
    const customerRes = await fetch(`https://api.paystack.co/customer/${email}`, {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      },
    });

    const customerData = await customerRes.json();

    if (!customerRes.ok || customerData.status === false) {
      return NextResponse.json({ error: `Paystack customer not found: ${customerData.message}` }, { status: 404 });
    }

    const customerCode = customerData.data.customer_code;

    // Now generate the management link using the customer code
    const manageLinkRes = await fetch(`https://api.paystack.co/customer/${customerCode}/manage/link`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      },
    });

    const manageLinkData = await manageLinkRes.json();

    if (!manageLinkRes.ok || manageLinkData.status === false) {
      return NextResponse.json({ error: `Paystack error: ${manageLinkData.message}` }, { status: manageLinkRes.status });
    }

    return NextResponse.json({ manage_link: manageLinkData.data.link });

  } catch (error: any) {
    console.error('Error creating subscription management link:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
