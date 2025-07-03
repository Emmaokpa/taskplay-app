"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { db } from "@/lib/firebase/config";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card, CardContent, CardHeader, CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";

export default function EditTaskPage() {
  const { user, isLoading: authLoading, isAdmin } = useAuth();
  const router = useRouter();
  const params = useParams();
  const taskId = params.taskId as string;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reward, setReward] = useState<number | string>("");
  const [taskType, setTaskType] = useState<string>("");
  const [offerUrl, setOfferUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // Access control
  useEffect(() => {
    if (!authLoading && !isAdmin) {
      toast.error("Access Denied", {
        description: "You do not have permission to access this page.",
      });
      router.push("/dashboard");
    }
  }, [user, authLoading, isAdmin, router]);

  // Fetch existing task data
  useEffect(() => {
    if (!taskId || !isAdmin) return;

    const fetchTask = async () => {
      setFetching(true);
      try {
        const taskDocRef = doc(db, "tasks", taskId);
        const taskDocSnap = await getDoc(taskDocRef);

        if (taskDocSnap.exists()) {
          const taskData = taskDocSnap.data();
          setTitle(taskData.title || "");
          setDescription(taskData.description || "");
          setReward(taskData.reward || "");
          setTaskType(taskData.type || "");
          setOfferUrl(taskData.offerUrl || "");
          setVideoUrl(taskData.videoUrl || "");
          setImageUrl(taskData.imageUrl || "");
        } else {
          toast.error("Task not found.");
          router.push("/dashboard/tasks");
        }
      } catch (error: any) {
        toast.error("Failed to fetch task data.", {
          description: error.message,
        });
      } finally {
        setFetching(false);
      }
    };

    fetchTask();
  }, [taskId, isAdmin, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isAdmin) {
      toast.error("Authentication Error", {
        description: "You must be an admin to update tasks.",
      });
      return;
    }

    if (!title || !description || !reward || !taskType) {
      toast.error("Missing Fields", {
        description: "Please fill in all required fields.",
      });
      return;
    }

    if (isNaN(Number(reward)) || Number(reward) <= 0) {
      toast.error("Invalid Reward", {
        description: "Reward must be a positive number.",
      });
      return;
    }

    setLoading(true);
    try {
      const taskDocRef = doc(db, "tasks", taskId);
      const updatedTask = {
        title,
        description,
        reward: Number(reward),
        type: taskType,
        offerUrl: taskType === "cpa_offer" ? offerUrl : "",
        videoUrl: taskType === "watch_ad" ? videoUrl : "",
        imageUrl,
        // We don't update createdAt, but we could add an updatedAt field
        updatedAt: serverTimestamp(),
      };

      await updateDoc(taskDocRef, updatedTask);
      toast.success("Task updated successfully!");
      router.push("/dashboard/tasks");
    } catch (error: any) {
      console.error("Error updating task:", error);
      toast.error("Failed to update task.", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || fetching) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p>Loading task...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return null; // or a dedicated access denied component
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Edit Task</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="title">Task Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Complete a survey"
                disabled={loading}
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide a detailed description of the task."
                disabled={loading}
              />
            </div>
            <div>
              <Label htmlFor="reward">Reward (₦)</Label>
              <Input
                id="reward"
                type="number"
                value={reward}
                onChange={(e) => setReward(e.target.value)}
                placeholder="e.g., 50"
                disabled={loading}
              />
            </div>
            <div>
              <Label htmlFor="taskType">Task Type</Label>
              <Select
                value={taskType}
                onValueChange={setTaskType}
                disabled={loading}
              >
                <SelectTrigger id="taskType">
                  <SelectValue placeholder="Select a task type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="watch_ad">Watch Ad</SelectItem>
                  <SelectItem value="cpa_offer">
                    CPA Offer / Direct Link
                  </SelectItem>
                  <SelectItem value="mini_game">Play Mini-Game</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="imageUrl">Image URL (e.g., from Imgur)</Label>
              <Input
                id="imageUrl"
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://i.imgur.com/your-image.png"
                disabled={loading}
              />
            </div>

            {taskType === "cpa_offer" && (
              <div>
                <Label htmlFor="offerUrl">Offer URL</Label>
                <Input
                  id="offerUrl"
                  type="url"
                  value={offerUrl}
                  onChange={(e) => setOfferUrl(e.target.value)}
                  placeholder="https://example.com/offer"
                  disabled={loading}
                />
              </div>
            )}

            {taskType === "watch_ad" && (
              <div>
                <Label htmlFor="videoUrl">Video Ad URL</Label>
                <Input
                  id="videoUrl"
                  type="url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://example.com/ad.mp4"
                  disabled={loading}
                />
              </div>
            )}

            <div className="flex space-x-2">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Updating Task..." : "Update Task"}
              </Button>
              <Link href="/dashboard/tasks" className="w-full">
                <Button variant="outline" className="w-full">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}