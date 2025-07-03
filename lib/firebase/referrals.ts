// lib/firebase/referrals.ts
import {
  arrayUnion,
  collection,
  doc,
  getDocs,
  increment,
  limit,
  query,
  runTransaction,
  where,
} from "firebase/firestore";
import { db } from "./config";
import { toast } from "sonner";

/**
 * Applies a referral code for a new user.
 * This function should be called AFTER the new user's profile has been created.
 * It will find the referrer, validate the request, and award the bonus in a secure transaction.
 * @param referralCode The referral code entered by the new user.
 * @param newUserId The UID of the new user who is using the code.
 */
export async function applyReferral(referralCode: string, newUserId: string) {
  if (!referralCode) return;

  const codeToApply = referralCode.trim().toUpperCase();

  try {
    await runTransaction(db, async (transaction) => {
      // 1. Find the user (the referrer) who owns the referral code.
      const referrerQuery = query(
        collection(db, "users"),
        where("referralCode", "==", codeToApply),
        limit(1)
      );
      const referrerSnapshot = await getDocs(referrerQuery);

      if (referrerSnapshot.empty) {
        throw new Error("Invalid referral code.");
      }

      const referrerDoc = referrerSnapshot.docs[0];
      const referrerId = referrerDoc.id;

      // 2. Update the referrer's document to give them their bonus.
      transaction.update(referrerDoc.ref, {
        referralEarnings: increment(50),
        totalReferrals: increment(1),
        referrals: arrayUnion(newUserId),
      });

      // 3. Update the new user's document to link them to the referrer.
      const newUserDocRef = doc(db, "users", newUserId);
      transaction.update(newUserDocRef, {
        referredByUID: referrerId,
      });
    });

    toast.success("Referral code applied! Your referrer has been credited.");
  } catch (error: any) {
    console.error("Error applying referral code:", error);
    toast.error("Could not apply referral code.", {
      description: error.message,
    });
  }
}
