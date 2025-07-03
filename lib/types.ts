// src/lib/types.ts
import { Timestamp } from "firebase/firestore";

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  isAdmin?: boolean;
  createdAt?: Timestamp;
  nairaBalance?: number;
  referralCode?: string;
  referredBy?: string | null;
  referredByUID?: string | null;
  totalReferrals?: number;
  affiliateEarnings?: number;
  referralEarnings?: number;
  referrals?: string[];
  lastLoginDate?: Timestamp;
  consecutiveLoginDays?: number;
  dailyFreeGamesPlayed?: {
    [date: string]: number;
  };
  subscription?: {
    tier: "silver" | "gold" | "diamond" | "platinum";
    status: "active" | "cancelled" | "past_due" | "incomplete";
    expiresAt: Timestamp;
    gamesPerDay?: number;
    rewardPerGame?: number;
  } | null;
  dailyPaidGamesPlayed?: { [date: string]: number };
  payoutDetails?: {
    bankName: string;
    bankCode: string;
    accountNumber: string;
    accountName: string;
  } | null;
}

export interface AffiliateProduct {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  baseLink: string;
  price?: number;
  baseCommission: number;
  totalClicks: number;
  totalEarnings: number;
  totalSales: number;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  userEmail: string | null;
  displayName: string | null;
  grossAmount: number;
  fee: number;
  netAmount: number;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: Timestamp;
  payoutDetails: {
    bankName: string;
    bankCode: string;
    accountNumber: string;
    accountName: string;
  };
  rejectionReason?: string;
  processedAt?: Timestamp;
}