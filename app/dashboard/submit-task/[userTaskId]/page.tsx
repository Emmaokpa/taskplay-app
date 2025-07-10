// c:/Users/Emmanuel Okpa/Desktop/TaskPlay/client/app/dashboard/submit-task/[userTaskId]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { db } from "@/lib/firebase/config";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase/supabaseClient"; // Import Supabase client
import { v4 as uuidv4 } from 'uuid'; // For unique file names

interface UserTask {
  id: string;
  user_id: string;
  task_id: string;
  status: string;
  reward_amount: number;
  screenshot_url?: string;
  submitted_at: any;
}

interface Task {
  id: string;
  title: string;
  description: string;
  reward: number;
  type: string;
}

export default function SubmitTaskPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const userTaskId = params.userTaskId as string;

  const [userTask, setUserTask] = useState<UserTask | null>(null);
  const [taskDetails, setTaskDetails] = useState<Task | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      toast.error("Authentication required.", {
        description: "Please log in to submit tasks.",
      });
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user || !userTaskId) return;

    const fetchUserTaskAndDetails = async () => {
      setFetching(true);
      try {
        const userTaskRef = doc(db, "user_tasks", userTaskId);
        const userTaskSnap = await getDoc(userTaskRef);

        if (!userTaskSnap.exists() || userTaskSnap.data()?.user_id !== user.uid) {
          toast.error("Task submission not found or unauthorized access.");
          router.push("/dashboard/tasks");
          return;
        }

        const fetchedUserTask = { id: userTaskSnap.id, ...userTaskSnap.data() } as UserTask;
        setUserTask(fetchedUserTask);

        // Fetch associated task details
        const taskRef = doc(db, "tasks", fetchedUserTask.task_id);
        const taskSnap = await getDoc(taskRef);
        if (taskSnap.exists()) {
          setTaskDetails({ id: taskSnap.id, ...taskSnap.data() } as Task);
        } else {
          toast.error("Associated task not found.");
        }
      } catch (error: any) {
        console.error("Error fetching user task or details:", error);
        toast.error("Failed to load task submission details.", { description: error.message });
      } finally {
        setFetching(false);
      }
    };

    fetchUserTaskAndDetails();
  }, [user, userTaskId, router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    } else {
      setFile(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userTask || !file) {
      toast.error("Please select a screenshot to upload.");
      return;
    }

    if (userTask.status !== "pending_submission") {
      toast.info("This task has already been submitted or reviewed.");
      router.push("/dashboard/tasks");
      return;
    }

    setLoading(true);
    try {
      const fileExtension = file.name.split('.').pop();
      const fileName = `${user.uid}/${userTask.task_id}-${uuidv4()}.${fileExtension}`;
      const { data, error: uploadError } = await supabase.storage
        .from('task-screenshots') // Ensure this bucket exists in Supabase
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const publicUrl = supabase.storage.from('task-screenshots').getPublicUrl(fileName).data.publicUrl;

      await updateDoc(doc(db, "user_tasks", userTaskId), {
        screenshot_url: publicUrl,
        status: "submitted_for_review",
      });

      toast.success("Screenshot uploaded and task submitted for review!");
      router.push("/dashboard/tasks"); // Redirect back to offers page
    } catch (error: any) {
      console.error("Error uploading screenshot or updating task:", error);
      toast.error("Failed to submit screenshot.", { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || fetching) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p>Loading task submission details...</p>
      </div>
    );
  }

  if (!userTask || !taskDetails) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p>Could not load task details. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-start h-full p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-xl md:text-2xl">Submit Screenshot for: {taskDetails.title}</CardTitle>
          <p className="text-sm text-muted-foreground">Reward: ₦{taskDetails.reward}</p>
        </CardHeader>
        <CardContent>
          {userTask.status === "submitted_for_review" ? (
            <div className="text-center space-y-4">
              <p className="text-base md:text-lg text-yellow-600 font-semibold">
                This task has already been submitted for review.
              </p>
              {userTask.screenshot_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={userTask.screenshot_url} alt="Submitted Screenshot" className="max-w-full h-auto rounded-md mx-auto" />
              )}
              <Button onClick={() => router.push("/dashboard/tasks")}>Back to Offers</Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="screenshot">Upload Screenshot</Label>
                <Input
                  id="screenshot"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  disabled={loading}
                />
                {file && <p className="text-sm text-gray-500 mt-2">Selected file: {file.name}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={loading || !file}>
                {loading ? "Uploading..." : "Submit for Review"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}