// c:\Users\Emmanuel Okpa\Desktop\TaskPlay\client\app\dashboard\admin\verify-submissions\page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { db } from "@/lib/firebase/config";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  increment,
  getDoc,
  orderBy,
} from "firebase/firestore";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

// --- Interfaces ---
interface Task {
  id: string;
  title: string;
  description: string;
  reward: number;
  type: "watch_ad" | "cpa_offer" | "mini_game";
  offerUrl?: string;
  imageUrl?: string;
  active: boolean;
  createdAt: any;
  videoUrl?: string;
}

interface UserTask {
  id: string;
  user_id: string;
  task_id: string;
  status: "pending_submission" | "submitted_for_review" | "approved" | "rejected";
  reward_amount: number;
  submitted_at: any; // Firebase Timestamp
  screenshot_url?: string;
  review_notes?: string;
}

interface UserProfile {
  uid: string;
  email: string;
  nairaBalance: number;
  // Add other user fields if necessary, e.g., displayName
}

interface SubmissionData extends UserTask {
  taskDetails?: Task;
  userDetails?: UserProfile;
}

export default function VerifySubmissionsPage() {
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [submissions, setSubmissions] = useState<SubmissionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionData | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isApprovingOrRejecting, setIsApprovingOrRejecting] = useState(false);

  // --- Access Control ---
  useEffect(() => {
    if (!authLoading && !isAdmin) {
      toast.error("Access Denied", {
        description: "You do not have permission to access this page.",
      });
      router.push("/dashboard");
    }
  }, [user, authLoading, isAdmin, router]);

  // --- Fetch Submissions ---
  useEffect(() => {
    if (!isAdmin) return; // Ensure user is admin before fetching

    const fetchSubmissions = async () => {
      setLoading(true);
      try {
        const userTasksRef = collection(db, "user_tasks");
        const q = query(userTasksRef, where("status", "==", "submitted_for_review"), orderBy("submitted_at", "desc"));
        const querySnapshot = await getDocs(q);

        const fetchedSubmissions: SubmissionData[] = [];
        for (const docSnapshot of querySnapshot.docs) {
          const userTask = { id: docSnapshot.id, ...docSnapshot.data() } as UserTask;

          // Fetch associated task details
          let taskDetails: Task | undefined;
          const taskDocRef = doc(db, "tasks", userTask.task_id);
          const taskDocSnap = await getDoc(taskDocRef);
          if (taskDocSnap.exists()) {
            taskDetails = { id: taskDocSnap.id, ...taskDocSnap.data() } as Task;
          }

          // Fetch associated user details
          let userDetails: UserProfile | undefined;
          const userDocRef = doc(db, "users", userTask.user_id);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            userDetails = { uid: userDocSnap.id, ...userDocSnap.data() } as UserProfile;
          }

          fetchedSubmissions.push({ ...userTask, taskDetails, userDetails });
        }
        setSubmissions(fetchedSubmissions);
      } catch (error: any) {
        console.error("Error fetching submissions:", error);
        toast.error("Failed to load submissions.", {
          description: error.message,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissions();
  }, [isAdmin]); // Re-fetch when admin status changes

  // --- Handle Approve Action ---
  const handleApprove = async (submission: SubmissionData) => {
    if (!user || !isAdmin) {
      toast.error("Unauthorized action.");
      return;
    }
    setIsApprovingOrRejecting(true);
    try {
      const userTaskDocRef = doc(db, "user_tasks", submission.id);
      await updateDoc(userTaskDocRef, {
        status: "approved",
      });

      // Reward the user
      const userDocRef = doc(db, "users", submission.user_id);
      await updateDoc(userDocRef, {
        nairaBalance: increment(submission.reward_amount),
      });

      toast.success(`Task "${submission.taskDetails?.title}" approved! User rewarded ₦${submission.reward_amount}.`);
      // Remove the approved submission from the list
      setSubmissions((prev) => prev.filter((s) => s.id !== submission.id));
    } catch (error: any) {
      console.error("Error approving task:", error);
      toast.error("Failed to approve task.", {
        description: error.message,
      });
    } finally {
      setIsApprovingOrRejecting(false);
    }
  };

  // --- Handle Reject Action ---
  const handleRejectClick = (submission: SubmissionData) => {
    setSelectedSubmission(submission);
    setIsRejectDialogOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!selectedSubmission || !user || !isAdmin) {
      toast.error("Unauthorized action or no submission selected.");
      return;
    }
    setIsApprovingOrRejecting(true);
    try {
      const userTaskDocRef = doc(db, "user_tasks", selectedSubmission.id);
      await updateDoc(userTaskDocRef, {
        status: "rejected",
        review_notes: reviewNotes,
      });

      toast.success(`Task "${selectedSubmission.taskDetails?.title}" rejected.`);
      // Remove the rejected submission from the list
      setSubmissions((prev) => prev.filter((s) => s.id !== selectedSubmission.id));
      setIsRejectDialogOpen(false);
      setReviewNotes("");
      setSelectedSubmission(null);
    } catch (error: any) {
      console.error("Error rejecting task:", error);
      toast.error("Failed to reject task.", {
        description: error.message,
      });
    } finally {
      setIsApprovingOrRejecting(false);
    }
  };

  // --- Loading State ---
  if (authLoading || !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <p>Loading or checking permissions...</p>
      </div>
    );
  }

  // --- Render ---
  return (
    <div className="flex flex-col items-center justify-center h-full p-4">
      <h1 className="text-4xl font-bold mb-8">Verify Task Submissions</h1>

      {loading ? (
        <p>Loading submissions...</p>
      ) : submissions.length === 0 ? (
        <p className="text-lg text-gray-500">No tasks awaiting review at the moment.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl">
          {submissions.map((submission) => (
            <Card key={submission.id} className="flex flex-col justify-between">
              <CardHeader>
                <CardTitle>{submission.taskDetails?.title || "Unknown Task"}</CardTitle>
                <CardDescription>
                  Submitted by: {submission.userDetails?.email || "Unknown User"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-2">
                  Reward: ₦{submission.reward_amount}
                </p>
                <p className="text-gray-600 mb-4 text-sm">
                  Submitted on:{" "}
                  {submission.submitted_at?.toDate
                    ? submission.submitted_at.toDate().toLocaleString()
                    : "N/A"}
                </p>
                {submission.screenshot_url && (
                  <div className="mb-4">
                    <Label htmlFor={`screenshot-${submission.id}`} className="mb-2 block">
                      Screenshot:
                    </Label>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      id={`screenshot-${submission.id}`}
                      src={submission.screenshot_url}
                      alt="Submitted Screenshot"
                      className="w-full h-48 object-contain border rounded-md"
                    />
                    <a
                      href={submission.screenshot_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline text-sm mt-1 block"
                    >
                      View Full Size
                    </a>
                  </div>
                )}
                <div className="flex gap-2 mt-4">
                  <Button
                    onClick={() => handleApprove(submission)}
                    className="flex-1"
                    disabled={isApprovingOrRejecting}
                  >
                    Approve
                  </Button>
                  <Button
                    onClick={() => handleRejectClick(submission)}
                    variant="destructive"
                    className="flex-1"
                    disabled={isApprovingOrRejecting}
                  >
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Submission</DialogTitle>
            <DialogDescription>
              Provide notes for rejecting the submission for "
              {selectedSubmission?.taskDetails?.title || "Unknown Task"}" by{" "}
              {selectedSubmission?.userDetails?.email || "Unknown User"}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="reviewNotes">Reason for Rejection</Label>
              <Textarea
                id="reviewNotes"
                placeholder="e.g., Screenshot is blurry, task not completed correctly, etc."
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={5}
                disabled={isApprovingOrRejecting}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsRejectDialogOpen(false);
                setReviewNotes("");
                setSelectedSubmission(null);
              }}
              disabled={isApprovingOrRejecting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmReject}
              variant="destructive"
              disabled={isApprovingOrRejecting || reviewNotes.trim() === ""}
            >
              {isApprovingOrRejecting ? "Rejecting..." : "Confirm Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
