'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth-provider';
import { UserProfile, WithdrawalRequest } from '@/lib/types';
import { toast } from 'sonner';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Banknote, Landmark, Settings, History } from 'lucide-react';

interface Bank {
  id: number;
  name: string;
  code: string;
}

interface EarningsCardProps {
  user: UserProfile;
}

export function EarningsCard({ user }: EarningsCardProps) {
  const { idToken } = useAuth();

  // Payout Settings State
  const [banks, setBanks] = useState<Bank[]>([]);
  const [selectedBankCode, setSelectedBankCode] = useState(user.payoutDetails?.bankCode || '');
  const [accountNumber, setAccountNumber] = useState(user.payoutDetails?.accountNumber || '');
  const [accountName, setAccountName] = useState(user.payoutDetails?.accountName || '');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Withdrawal State
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [isRequesting, setIsRequesting] = useState(false);
  const [history, setHistory] = useState<WithdrawalRequest[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  const [fee, setFee] = useState(0);
  const [netAmount, setNetAmount] = useState(0);

  const totalBalance = (user.nairaBalance || 0) + (user.referralEarnings || 0) + (user.affiliateEarnings || 0);

  const fetchBanks = useCallback(async () => {
    try {
      const response = await fetch('/api/banks');
      if (!response.ok) throw new Error('Failed to fetch banks');
      const data = await response.json();
      setBanks(data);
    } catch (error: any) {
      toast.error('Could not load bank list.', { description: error.message });
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    if (!idToken) return;
    setIsLoadingHistory(true);
    try {
      const response = await fetch('/api/withdrawal-history', {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!response.ok) throw new Error('Failed to fetch history');
      const data = await response.json();
      setHistory(data);
    } catch (error: any) {
      toast.error('Could not load withdrawal history.', { description: error.message });
    } finally {
      setIsLoadingHistory(false);
    }
  }, [idToken]);

  useEffect(() => {
    fetchBanks();
    fetchHistory();
  }, [fetchBanks, fetchHistory]);

  useEffect(() => {
    const amount = parseFloat(withdrawalAmount);
    if (!isNaN(amount) && amount > 0) {
      const calculatedFee = amount * 0.05;
      setFee(calculatedFee);
      setNetAmount(amount - calculatedFee);
    } else {
      setFee(0);
      setNetAmount(0);
    }
  }, [withdrawalAmount]);

  const handleVerifyAccount = async () => {
    if (!selectedBankCode || !accountNumber) {
      toast.error('Please select a bank and enter an account number.');
      return;
    }
    setIsVerifying(true);
    setAccountName('');
    try {
      const response = await fetch('/api/verify-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ bankCode: selectedBankCode, accountNumber }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Verification failed');
      setAccountName(data.accountName);
      toast.success('Account verified successfully!');
    } catch (error: any) {
      toast.error('Account verification failed.', { description: error.message });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSaveDetails = async () => {
    if (!accountName) {
      toast.error('Please verify your account before saving.');
      return;
    }
    setIsSaving(true);
    try {
      const selectedBank = banks.find(b => b.code === selectedBankCode);
      if (!selectedBank) throw new Error('Selected bank not found.');

      const payoutDetails = {
        bankName: selectedBank.name,
        bankCode: selectedBank.code,
        accountNumber,
        accountName,
      };

      // We can save directly from the client for this, but an API is also a good pattern.
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, { payoutDetails }, { merge: true });

      toast.success('Payout details saved successfully!');
    } catch (error: any) {
      toast.error('Failed to save details.', { description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRequestWithdrawal = async () => {
    if (!withdrawalAmount || parseFloat(withdrawalAmount) <= 0) {
      toast.error('Please enter a valid amount to withdraw.');
      return;
    }
    if (!user.payoutDetails) {
      toast.error('Please set up and save your payout details first.');
      return;
    }
    setIsRequesting(true);
    try {
      const response = await fetch('/api/request-withdrawal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ amount: parseFloat(withdrawalAmount) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Request failed');
      toast.success('Withdrawal request submitted!', {
        description: 'Your request is now pending approval.',
      });
      setWithdrawalAmount('');
      fetchHistory(); // Refresh history after request
    } catch (error: any) {
      toast.error('Withdrawal request failed.', { description: error.message });
    } finally {
      setIsRequesting(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'pending': return 'secondary';
      case 'rejected': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Earnings & Withdrawals</CardTitle>
        <CardDescription>Manage your earnings and payout settings.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="withdraw">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="withdraw"><Banknote className="mr-2 h-4 w-4" />Withdraw</TabsTrigger>
            <TabsTrigger value="settings"><Settings className="mr-2 h-4 w-4" />Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="withdraw" className="space-y-6 pt-6">
            <div className="text-center p-6 bg-muted rounded-lg">
              <p className="text-sm font-medium text-muted-foreground">Total Withdrawable Balance</p>
              <p className="text-4xl font-bold tracking-tight">₦{totalBalance.toFixed(2)}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Withdrawal Amount (₦)</Label>
              <div className="flex gap-2">
                <Input
                  id="amount"
                  type="number"
                  placeholder="e.g., 1500.00"
                  value={withdrawalAmount}
                  onChange={(e) => setWithdrawalAmount(e.target.value)}
                  disabled={isRequesting}
                />
                <Button onClick={handleRequestWithdrawal} disabled={isRequesting || totalBalance < 1000}>
                  {isRequesting ? 'Requesting...' : 'Request'}
                </Button>
              </div>
              {netAmount > 0 && (
                <div className="text-xs text-muted-foreground space-y-1 mt-2 p-2 border rounded-md bg-muted/50">
                  <div className="flex justify-between"><span>Fee (5%):</span> <span>- ₦{fee.toFixed(2)}</span></div>
                  <div className="flex justify-between font-medium"><span>You will receive:</span> <span>₦{netAmount.toFixed(2)}</span></div>
                </div>
              )}
              <p className="text-xs text-muted-foreground pt-1">Minimum withdrawal is ₦1000.00.</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2 flex items-center"><History className="mr-2 h-5 w-5" />Recent History</h3>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingHistory ? (
                      <TableRow><TableCell colSpan={3} className="text-center">Loading history...</TableCell></TableRow>
                    ) : history.length === 0 ? (
                      <TableRow><TableCell colSpan={3} className="text-center">No withdrawal history.</TableCell></TableRow>
                    ) : (
                      history.map((req) => (
                        <TableRow key={req.id}>
                          <TableCell>{req.requestedAt && typeof req.requestedAt.toDate === 'function'
                            ? req.requestedAt.toDate().toLocaleDateString()
                            : new Date(req.requestedAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right font-mono">₦{(req.netAmount || 0).toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={getStatusBadgeVariant(req.status)} className="capitalize">{req.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6 pt-6">
            <div className="space-y-2">
              <Label htmlFor="bank">Bank</Label>
              <Select value={selectedBankCode} onValueChange={setSelectedBankCode}>
                <SelectTrigger id="bank">
                  <SelectValue placeholder="Select your bank..." />
                </SelectTrigger>
                <SelectContent>
                  {banks.map((bank) => (
                    <SelectItem key={bank.id} value={bank.code}>{bank.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountNumber">Account Number</Label>
              <div className="flex gap-2">
                <Input
                  id="accountNumber"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="Enter your account number"
                />
                <Button variant="outline" onClick={handleVerifyAccount} disabled={isVerifying}>
                  {isVerifying ? 'Verifying...' : 'Verify'}
                </Button>
              </div>
            </div>
            {accountName && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-center">
                <p className="font-semibold text-green-800 dark:text-green-300">{accountName}</p>
              </div>
            )}
            <Button onClick={handleSaveDetails} disabled={isSaving || !accountName} className="w-full">
              <Landmark className="mr-2 h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Payout Details'}
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}