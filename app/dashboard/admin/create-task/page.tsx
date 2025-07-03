"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { db } from "@/lib/firebase/config";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
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
import { supabase } from "@/lib/supabase/supabaseClient"; // Import Supabase client
import { auth } from "@/lib/firebase/config"; // Ensure Firebase auth instance is imported

import { v4 as uuidv4 } from 'uuid'; // For unique file names

export default function CreateTaskPage() { // Correct default export
  const { user, isLoading, isAdmin } = useAuth();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reward, setReward] = useState<number | string>("");
  const [taskType, setTaskType] = useState<string>("");
  const [offerUrl, setOfferUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null); // Change to File for upload
  const [loading, setLoading] = useState(false);

  // Access control based on the isAdmin flag from AuthProvider
  useEffect(() => {
    if (!isLoading && !isAdmin) {
      toast.error("Access Denied", {
        description: "You do not have permission to access this page.",
      });
      router.push("/dashboard");
    }
  }, [user, isLoading, isAdmin, router]);

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    } else {
      setImageFile(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isAdmin) {
      toast.error("Authentication Error", {
        description: "You must be an admin to create tasks.",
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
    let uploadedImageUrl: string | null = null;

    // Ensure Firebase user is available before proceeding with Supabase upload
    if (!auth.currentUser) {
      toast.error("Authentication Error", { description: "Firebase user not found. Please try logging in again." });
      setLoading(false);
      return;
    }
    try {
      if (imageFile) {
        const fileExtension = imageFile.name.split('.').pop();
        // Store task images in a dedicated folder within the 'task-screenshots' bucket
        // You might consider a separate bucket like 'task-images' for better organization
        const fileName = `task-images/${uuidv4()}.${fileExtension}`;
        const { data, error: uploadError } = await supabase.storage
          .from('task-screenshots') // Reusing the existing bucket for simplicity
          .upload(fileName, imageFile, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) throw uploadError;
        uploadedImageUrl = supabase.storage.from('task-screenshots').getPublicUrl(fileName).data.publicUrl;
      }

      const newTask = {
        title,
        description,
        reward: Number(reward),
        type: taskType,
        offerUrl: taskType === "cpa_offer" ? offerUrl : "", // Only save if it's a CPA offer
        videoUrl: taskType === "watch_ad" ? videoUrl : "", // Only save if it's a watch ad
        imageUrl: uploadedImageUrl, // Use the uploaded image URL
        active: true,
        createdAt: serverTimestamp(),
        createdBy: user.uid,
      };

      await addDoc(collection(db, "tasks"), newTask);
      toast.success("Task created successfully!");

      // Clear form
      setTitle("");
      setDescription("");
      setReward("");
      setTaskType("");
      setOfferUrl("");
      setVideoUrl("");
      setImageFile(null); // Clear file input
    } catch (error: any) {
      console.error("Error creating task:", error);
      toast.error("Failed to create task.", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  // Show a loading state while checking for admin status
  if (isLoading || !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p>Loading or checking permissions...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Create New Task</CardTitle>
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

            {/* Image Upload Input */}
            <div>
              <Label htmlFor="imageFile">Upload Image (Optional)</Label>
              <Input
                id="imageFile"
                type="file"
                accept="image/*"
                onChange={handleImageFileChange}
                disabled={loading}
              />
              {imageFile && <p className="text-sm text-gray-500 mt-2">Selected: {imageFile.name}</p>}
            </div>

            {taskType === "cpa_offer" && (
              <>
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
              </>
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

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating Task..." : "Create Task"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
