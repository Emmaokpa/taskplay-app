'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth-provider';
import { WithdrawalRequest } from '@/lib/types';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Copy } from 'lucide-react';

type FilterStatus = 'pending' | 'approved' | 'rejected' | 'all';

export default function WithdrawalsAdminPage() {
  const { idToken } = useAuth();
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('pending');
  const [isProcessing, setIsProcessing] = useState<string | null>(null); // Store the ID of the request being processed

  // State for rejection dialog
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [requestToReject, setRequestToReject] = useState<WithdrawalRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const fetchRequests = useCallback(async (status: FilterStatus) => {
    if (!idToken) return;
    setIsLoading(true);
    try {
      const url = status === 'all'
        ? '/api/admin/withdrawal-requests'
        : `/api/admin/withdrawal-requests?status=${status}`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${idToken}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch withdrawal requests.');
      }
      const data = await response.json();
      setRequests(data);
    } catch (error: any) {
      toast.error('Error fetching requests', { description: error.message });
    } finally {
      setIsLoading(false);
    }
  }, [idToken]);

  useEffect(() => {
    if (idToken) {
      fetchRequests(filterStatus);
    }
  }, [filterStatus, idToken, fetchRequests]);

  const handleUpdateStatus = async (
    requestId: string,
    newStatus: 'approved' | 'rejected',
    reason?: string
  ) => {
    if (!idToken) return;
    setIsProcessing(requestId);
    try {
      const body = newStatus === 'rejected' ? { status: newStatus, rejectionReason: reason } : { status: newStatus };

      const response = await fetch(`/api/admin/withdrawal-requests/${requestId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Failed to ${newStatus} request.`);
      }

      toast.success(`Request ${newStatus} successfully.`);
      fetchRequests(filterStatus); // Refresh the list
    } catch (error: any) {
      toast.error(`Failed to ${newStatus} request.`, { description: error.message });
    } finally {
      setIsProcessing(null);
      setIsRejectDialogOpen(false);
      setRequestToReject(null);
      setRejectionReason('');
    }
  };

  const handleOpenRejectDialog = (request: WithdrawalRequest) => {
    setRequestToReject(request);
    setIsRejectDialogOpen(true);
  };

  const handleRejectSubmit = () => {
    if (!requestToReject || !rejectionReason) {
      toast.error('Rejection reason cannot be empty.');
      return;
    }
    handleUpdateStatus(requestToReject.id, 'rejected', rejectionReason);
  };

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
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
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <Card>
        <CardHeader>
          <CardTitle>Withdrawal Requests</CardTitle>
          <CardDescription>Review, approve, or reject user withdrawal requests.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={filterStatus} onValueChange={(value) => setFilterStatus(value as FilterStatus)}>
            <TabsList>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="mt-4 border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Amount Breakdown</TableHead>
                  <TableHead>Payout Details</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center h-24">Loading requests...</TableCell></TableRow>
                ) : requests.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center h-24">No requests found for this status.</TableCell></TableRow>
                ) : (
                  requests.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell>
                        <div className="font-medium">{req.displayName || 'N/A'}</div>
                        <div className="text-sm text-muted-foreground">{req.userEmail}</div>
                      </TableCell>
                      <TableCell>
                        {/* Fix applied here: Safely call toFixed on potentially undefined/null numbers */}
                        <div className="font-mono">Gross: ₦{(req.grossAmount ?? 0).toFixed(2)}</div>
                        <div className="text-xs text-muted-foreground font-mono">Fee (5%): -₦{(req.fee ?? 0).toFixed(2)}</div>
                        <div className="font-semibold font-mono border-t mt-1 pt-1">Net: ₦{(req.netAmount ?? 0).toFixed(2)}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{req.payoutDetails.bankName}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          {req.payoutDetails.accountNumber}
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopyToClipboard(req.payoutDetails.accountNumber)}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="text-xs">{req.payoutDetails.accountName}</div>
                      </TableCell>
                      <TableCell>{new Date(req.requestedAt).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(req.status)} className="capitalize">{req.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {req.status === 'pending' && (
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateStatus(req.id, 'approved')}
                              disabled={isProcessing === req.id}
                            >
                              {isProcessing === req.id ? 'Processing...' : 'Approve'}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleOpenRejectDialog(req)}
                              disabled={isProcessing === req.id}
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Rejection Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Withdrawal Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this request. The amount will be refunded to the user's balance.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="rejectionReason" className="text-right">
                Reason
              </Label>
              <Input
                id="rejectionReason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="col-span-3"
                placeholder="e.g., Invalid account details"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleRejectSubmit}>Confirm Rejection</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}