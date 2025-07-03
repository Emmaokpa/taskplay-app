// page.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/firebase/config";
import { collection, query, where, getDocs, orderBy, doc, updateDoc, increment, addDoc, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation"; // Import useRouter
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface Task {
  id: string;
  title: string;
  description: string;
  reward: number;
  type: "watch_ad" | "cpa_offer" | "mini_game";
  offerUrl?: string;
  imageUrl?: string;
  active: boolean;
  createdAt: any; // Add createdAt for ordering
  videoUrl?: string;
}

export default function TasksPage() {
  const { user } = useAuth(); // Get user from AuthProvider
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [userPendingTasks, setUserPendingTasks] = useState<any[]>([]); // To store user's pending tasks

  // State for video ad dialog
  const [showVideoDialog, setShowVideoDialog] = useState(false);
  const [currentVideoTask, setCurrentVideoTask] = useState<Task | null>(null);
  const [videoWatched, setVideoWatched] = useState(false);
  const [videoDuration, setVideoDuration] = useState(10); // Simulate 10 seconds ad
  const [countdown, setCountdown] = useState(0);

  // Fetch all active tasks
  useEffect(() => {
    const fetchTasks = async () => {
      setLoading(true);
      try {
        const tasksCollectionRef = collection(db, "tasks");
        const q = query(
          tasksCollectionRef,
          where("active", "==", true),
          orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(q);
        const fetchedTasks: Task[] = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Task[];
        setTasks(fetchedTasks);
      } catch (error: any) {
        console.error("Error fetching tasks:", error);
        toast.error("Failed to load tasks.", {
          description: error.message,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, []);

  // Fetch user's pending tasks
  useEffect(() => {
    if (!user) {
      setUserPendingTasks([]);
      return;
    }

    const fetchUserPendingTasks = async () => {
      try {
        const userTasksRef = collection(db, "user_tasks");
        const q = query(userTasksRef, where("user_id", "==", user.uid), where("status", "in", ["pending_submission", "submitted_for_review"]));
        const querySnapshot = await getDocs(q);
        setUserPendingTasks(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Error fetching user pending tasks:", error);
      }
    };

    fetchUserPendingTasks();
    // Re-fetch if user changes or if a task is submitted/approved/rejected (though that's admin side)
  }, [user]);

  const rewardUser = async (rewardAmount: number) => {
    if (!user) return;
    try {
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {
        nairaBalance: increment(rewardAmount),
      });
      toast.success(`You earned ₦${rewardAmount}! Your balance has been updated.`);
    } catch (error: any) {
      console.error("Error rewarding user:", error);
      toast.error("Failed to update balance.", {
        description: error.message,
      });
    }
  };

  const handleVideoEnded = async () => {
    setVideoWatched(true);
    if (currentVideoTask) {
      await rewardUser(currentVideoTask.reward);
      toast.success(`Ad watched! You earned ₦${currentVideoTask.reward}.`);
    }
    // Optionally close dialog immediately or let user close
    // setShowVideoDialog(false);
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showVideoDialog && currentVideoTask?.videoUrl && countdown > 0 && !videoWatched) {
      timer = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    } else if (countdown === 0 && showVideoDialog && currentVideoTask?.videoUrl && !videoWatched) {
      handleVideoEnded();
    }
    return () => clearTimeout(timer);
  }, [showVideoDialog, currentVideoTask, countdown, videoWatched]);

  const handleCompleteTask = async (task: Task) => {
    if (!user) {
      toast.error("You must be logged in to complete tasks.");
      return;
    }

    // Check if user already has this task pending
    const existingPendingTask = userPendingTasks.find(
      (ut) => ut.task_id === task.id && (ut.status === "pending_submission" || ut.status === "submitted_for_review")
    );

    if (existingPendingTask) {
      toast.info("You already have this task pending verification.", {
        description: "Please complete your previous submission or wait for review.",
        action: {
          label: "Go to Submission",
          onClick: () => router.push(`/dashboard/submit-task/${existingPendingTask.id}`),
        },
      });
      return;
    }

    // Handle different task types
    if (task.type === "watch_ad" || task.type === "mini_game") {
      // For watch_ad and mini_game, reward immediately (as before)
      if (task.type === "watch_ad") {
        setCurrentVideoTask(task);
        setVideoWatched(false);
        setCountdown(task.videoUrl ? videoDuration : 0);
        setShowVideoDialog(true);
      }
      toast.success(`Task "${task.title}" initiated! You will earn ₦${task.reward} upon completion.`);
      await rewardUser(task.reward); // Reward immediately for these types
    } else if (task.type === "cpa_offer" && task.offerUrl) {
      // For CPA offers, create a pending user_task and redirect
      try {
        const newUserTaskRef = await addDoc(collection(db, "user_tasks"), {
          user_id: user.uid,
          task_id: task.id,
          status: "pending_submission", // User needs to submit screenshot
          reward_amount: task.reward,
          submitted_at: serverTimestamp(),
          screenshot_url: null, // Will be updated later
        });
        setUserPendingTasks(prev => [...prev, { id: newUserTaskRef.id, user_id: user.uid, task_id: task.id, status: "pending_submission", reward_amount: task.reward }]);

        window.open(task.offerUrl, "_blank");
        toast.info(`Task "${task.title}" started! Please complete the offer and then upload a screenshot for verification.`, {
          action: {
            label: "Upload Screenshot",
            onClick: () => router.push(`/dashboard/submit-task/${newUserTaskRef.id}`),
          },
          duration: 10000, // Keep toast visible longer
        });
      } catch (error: any) {
        console.error("Error creating pending user task:", error);
        toast.error("Failed to start task.", { description: error.message });
      }
    } else {
      toast.error("Invalid task type or missing URL.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-4">
      <h1 className="text-4xl font-bold mb-8">Available Offers</h1>
      {loading ? (
        <p>Loading tasks...</p>
      ) : tasks.length === 0 ? (
        <p className="text-lg text-gray-500">No tasks available at the moment. Check back later!</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl">
          {tasks.map((task) => (
            <Card key={task.id} className="flex flex-col justify-between">
              <CardHeader>
                <CardTitle>{task.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">{task.description}</p>
                {task.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={task.imageUrl} alt={task.title} className="w-full h-32 object-cover mb-4 rounded" />
                )}
                <p className="text-lg font-semibold text-green-500">
                  Reward: ₦{task.reward}
                </p>
                {userPendingTasks.some(ut => ut.task_id === task.id && (ut.status === "pending_submission" || ut.status === "submitted_for_review")) ? (
                  <Button
                    onClick={() => router.push(`/dashboard/submit-task/${userPendingTasks.find(ut => ut.task_id === task.id)?.id}`)}
                    className="mt-4 w-full"
                    variant="secondary"
                  >
                    Continue Submission
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleCompleteTask(task)}
                    className="mt-4 w-full"
                    disabled={loading}
                  >
                    {task.type === "watch_ad" ? "Watch Ad" : task.type === "cpa_offer" ? "Go to Offer" : "Start Task"}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Video Ad Dialog */}
      <Dialog open={showVideoDialog} onOpenChange={setShowVideoDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{currentVideoTask?.title}</DialogTitle>
            <DialogDescription>{currentVideoTask?.description}</DialogDescription>
          </DialogHeader>
          <div className="aspect-video w-full bg-black flex items-center justify-center">
            {currentVideoTask?.videoUrl ? (
              <video
                key={currentVideoTask.videoUrl} // Key to force re-render when video changes
                src={currentVideoTask.videoUrl}
                controls
                autoPlay
                onEnded={handleVideoEnded}
                className="w-full h-full"
              >
                Your browser does not support the video tag.
              </video>
            ) : (
              <p className="text-white">No video URL provided. Simulating ad...</p>
            )}
          </div>
          <div className="text-center mt-4">
            {videoWatched ? (
              <p className="text-green-500 font-bold">Ad completed! Reward credited.</p>
            ) : (
              <p className="text-gray-500">Time remaining: {countdown} seconds</p>
            )}
            <Button onClick={() => setShowVideoDialog(false)} className="mt-2" disabled={!videoWatched}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
