// components/SubscriptionButton.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button'; // Assuming you are using Shadcn UI
import { toast } from 'sonner';

interface SubscriptionButtonProps {
  tier: 'silver' | 'gold' | 'diamond' | 'platinum';
  email: string; // Assuming you have access to the user's email
}

const SubscriptionButton: React.FC<SubscriptionButtonProps> = ({ tier, email }) => {
  const [loading, setLoading] = useState(false);

  const subscribe = async () => {
    setLoading(true);
    try {
      // Map tier to Paystack plan code (replace with your actual codes)
      const planMap: Record<string, string> = {
        silver: process.env.NEXT_PUBLIC_PAYSTACK_SILVER_PLAN!,
        gold: process.env.NEXT_PUBLIC_PAYSTACK_GOLD_PLAN!,
        diamond: process.env.NEXT_PUBLIC_PAYSTACK_DIAMOND_PLAN!,
        platinum: process.env.NEXT_PUBLIC_PAYSTACK_PLATINUM_PLAN!,

      };
      const plan = planMap[tier];

      if (!plan) {
        toast.error('Invalid subscription tier.');
        return;
      }

      const response = await fetch('/api/paystack', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, plan }),
      });

      const data = await response.json();

      if (response.ok && data.authorization_url) {
        // Redirect user to Paystack for payment
        window.location.href = data.authorization_url;
      } else {
        toast.error(`Payment initialization failed: ${data.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(`Payment initialization failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={subscribe} disabled={loading} className="w-full capitalize">
      {loading ? 'Processing...' : `Choose ${tier} Plan`}

    </Button>
  );
};

export default SubscriptionButton;
