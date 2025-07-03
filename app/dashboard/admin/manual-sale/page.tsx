'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useAuth } from '@/components/auth-provider';
import { AffiliateProduct } from '@/lib/types';
import { toast } from 'sonner';

// Shadcn UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Icons & Utils
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// A simplified user type for the dropdown
interface UserSelectItem {
  uid: string;
  email: string;
  displayName: string | null;
}

export default function ManualSalePage() {
  const { idToken } = useAuth();
  const [users, setUsers] = useState<UserSelectItem[]>([]);
  const [products, setProducts] = useState<AffiliateProduct[]>([]);
  
  const [selectedUserId, setSelectedUserId] = useState('');
  const [isUserSelectOpen, setIsUserSelectOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [saleAmount, setSaleAmount] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!idToken) return;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [usersResponse, productsResponse] = await Promise.all([
          fetch('/api/admin/users-list', {
            headers: { 'Authorization': `Bearer ${idToken}` },
          }),
          fetch('/api/admin/affiliate-products', {
            headers: { 'Authorization': `Bearer ${idToken}` },
          }),
        ]);

        if (!usersResponse.ok) throw new Error('Failed to fetch users');
        if (!productsResponse.ok) throw new Error('Failed to fetch products');

        const usersData = await usersResponse.json();
        const productsData = await productsResponse.json();

        setUsers(usersData);
        setProducts(productsData.filter((p: AffiliateProduct) => p.isActive)); // Only show active products
        toast.success("Users and products loaded.");
      } catch (err: any) {
        setError(err.message);
        toast.error("Failed to load data", { description: err.message });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [idToken]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !selectedProductId || !saleAmount) {
      toast.error("Please select a user, a product, and enter a sale amount.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/admin/record-sale', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          userId: selectedUserId,
          productId: selectedProductId,
          saleAmount: parseFloat(saleAmount),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to record sale');
      }

      toast.success("Sale recorded successfully!");
      // Reset form
      setSelectedUserId('');
      setSelectedProductId('');
      setSaleAmount('');
    } catch (err: any) {
      toast.error("Error recording sale", { description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="p-8">Loading form data...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Record Manual Affiliate Sale</CardTitle>
          <CardDescription>
            Use this form to manually credit an affiliate for a sale confirmed on an external platform like Temu.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="user-select">Affiliate User</Label>
              <Popover open={isUserSelectOpen} onOpenChange={setIsUserSelectOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={isUserSelectOpen}
                    className="w-full justify-between font-normal"
                  >
                    {selectedUserId
                      ? users.find((user) => user.uid === selectedUserId)?.email
                      : "Select a user..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command>
                    <CommandInput placeholder="Search user by email or name..." />
                    <CommandEmpty>No user found.</CommandEmpty>
                    <CommandGroup className="max-h-[300px] overflow-y-auto">
                      {users.map((user) => (
                        <CommandItem
                          key={user.uid}
                          value={`${user.email} ${user.displayName || ''}`}
                          onSelect={() => {
                            setSelectedUserId(user.uid === selectedUserId ? '' : user.uid);
                            setIsUserSelectOpen(false);
                          }}
                        >
                          <Check className={cn("mr-2 h-4 w-4", selectedUserId === user.uid ? "opacity-100" : "opacity-0")} />
                          {user.displayName || user.email} ({user.email})
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-select">Product Sold</Label>
              <Select value={selectedProductId} onValueChange={setSelectedProductId} required>
                <SelectTrigger id="product-select">
                  <SelectValue placeholder="Select a product..." />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sale-amount">Total Sale Amount (₦)</Label>
              <Input
                id="sale-amount"
                type="number"
                step="0.01"
                placeholder="e.g., 15000.00"
                value={saleAmount}
                onChange={(e) => setSaleAmount(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Enter the total price the customer paid. The affiliate's commission will be calculated automatically based on their tier.
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Recording Sale...' : 'Record Sale'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}