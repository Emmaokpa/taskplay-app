// app/affiliate/page.tsx
'use client';

import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";
import Image from "next/image";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { DollarSign, Copy, Check, Tag } from "lucide-react";

import { UserProfile, AffiliateProduct } from "@/lib/types";

const VIP_EARNING_RATES: { [key: string]: number } = {
  free: 0.20,
  silver: 0.30,
  gold: 0.40,
  diamond: 0.50,
  platinum: 0.60,
};

const AffiliateProductsPage = () => {
  const { user, isLoading, idToken } = useAuth(); // <--- Get idToken here
  const router = useRouter();
  const [affiliateProducts, setAffiliateProducts] = useState<AffiliateProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [copiedProductId, setCopiedProductId] = useState<string | null>(null);

  const handleCopyLink = (product: AffiliateProduct) => {
    if (!user) {
      toast.error("Please log in to get your affiliate link.");
      return;
    }
    // Construct the unique affiliate link for the user
    const affiliateLink = `${product.baseLink}?ref=${user.uid}`;
    navigator.clipboard.writeText(affiliateLink);
    setCopiedProductId(product.id);
    toast.success("Link copied to clipboard!");
    // Reset the copied state after 2 seconds
    setTimeout(() => setCopiedProductId(null), 2000);
  };

  // Redirect if not logged in
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  // Fetch affiliate products from your API route
  useEffect(() => {
    const fetchAffiliateProducts = async () => {
      setProductsLoading(true);
      setProductsError(null);
      try {
        if (!idToken) { // Ensure idToken is available before fetching
          console.log("No ID token found, waiting for auth...");
          setProductsLoading(false); // Stop loading if no token
          return; 
        }

        const response = await fetch('/api/affiliate-products', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`, // <--- Send the ID token here
          },
        });

        if (!response.ok) {
          // If the server returns a 401 (Unauthorized), it means token verification failed
          if (response.status === 401) {
            toast.error("Authentication failed. Please log in again.");
            router.push('/login'); // Redirect to login
            return;
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: AffiliateProduct[] = await response.json();
        setAffiliateProducts(data);
      } catch (error: any) {
        console.error("Failed to fetch affiliate products:", error);
        setProductsError("Failed to load affiliate products. Please try again later.");
        toast.error("Could not load products. Please refresh.");
      } finally {
        setProductsLoading(false);
      }
    };

    // Only fetch if user and idToken are available
    if (user && idToken) { 
      fetchAffiliateProducts();
    }
  }, [user, idToken]); // <--- Add idToken to dependency array

  if (isLoading || !user) {
    return <div className="flex justify-center items-center min-h-screen text-lg">Loading affiliate products...</div>;
  }

  const userTier = user.subscription?.status === 'active' 
                   ? user.subscription.tier
                   : 'free';
  const earningPercentage = VIP_EARNING_RATES[userTier] || VIP_EARNING_RATES.free;
  const formattedEarningPercentage = (earningPercentage * 100).toFixed(0);

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
          Affiliate Products
        </h1>
        <p className="mt-4 text-xl text-muted-foreground">
          Promote these products and earn commissions!
        </p>
        <p className="mt-2 text-xl text-primary font-semibold">
          Your current earning rate: {formattedEarningPercentage}%
        </p>
      </div>

      {productsLoading ? (
        <div className="flex justify-center items-center h-48">
          <p>Loading available products...</p>
        </div>
      ) : productsError ? (
        <div className="text-center text-red-500">
          <p>{productsError}</p>
        </div>
      ) : affiliateProducts.length === 0 ? (
        <div className="text-center text-muted-foreground">
          <p>No active affiliate products available at the moment. Please check back later!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {affiliateProducts.map((product) => {
            const userCommissionRate = (product.baseCommission || 0) * earningPercentage;
           return (
              <Card key={product.id} className="flex flex-col overflow-hidden">
                <div className="relative w-full h-48 bg-muted">
                  <Image
                    src={product.imageUrl}
                    alt={product.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    style={{ objectFit: 'cover' }}
                    className="transition-transform duration-300 hover:scale-105"
                  />
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl font-semibold line-clamp-1">{product.title}</CardTitle>
                  <CardDescription className="line-clamp-2">{product.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow pt-2 space-y-2">
                  <div className="flex items-center text-muted-foreground text-lg font-medium">
                    <Tag className="h-5 w-5 mr-2 text-gray-400" />
                    <span>Price: ₦{product.price?.toFixed(2) || 'N/A'}</span>
                  </div>
                  <div className="flex items-center text-primary font-bold text-lg">                    
                    <span>Your Commission: {userCommissionRate.toFixed(1)}% of sale price</span>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button onClick={() => handleCopyLink(product)} className="w-full" disabled={!user}>
                    {copiedProductId === product.id ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                    {user ? (copiedProductId === product.id ? 'Copied!' : 'Copy Affiliate Link') : 'Login to Get Link'}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AffiliateProductsPage;