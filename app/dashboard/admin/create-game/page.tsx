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
import { supabase } from "@/lib/supabase/supabaseClient";
import { v4 as uuidv4 } from 'uuid';

export default function CreateGamePage() {
  const { user, isLoading, isAdmin } = useAuth();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [gameType, setGameType] = useState<"free" | "paid" | "">("");
  const [gameScript, setGameScript] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  // Access control
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
        description: "You must be an admin to create games.",
      });
      return;
    }

    if (!title || !description || !gameType || !gameScript || !imageFile) {
      toast.error("Missing Fields", {
        description: "Please fill in all fields and upload an image.",
      });
      return;
    }

    setLoading(true);
    let uploadedImageUrl: string | null = null;

    try {
      // Upload image to Supabase
      const fileExtension = imageFile.name.split('.').pop();
      const fileName = `game-images/${uuidv4()}.${fileExtension}`;
      const { data, error: uploadError } = await supabase.storage
        .from('task-screenshots') // Using existing bucket, consider a 'game-assets' bucket
        .upload(fileName, imageFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;
      uploadedImageUrl = supabase.storage.from('task-screenshots').getPublicUrl(fileName).data.publicUrl;

      const newGame = {
        title,
        description,
        gameType,
        gameScript,
        imageUrl: uploadedImageUrl,
        active: true,
        createdAt: serverTimestamp(),
        createdBy: user.uid,
      };

      await addDoc(collection(db, "games"), newGame);
      toast.success("Game created successfully!");

      // Clear form
      setTitle("");
      setDescription("");
      setGameType("");
      setGameScript("");
      setImageFile(null);

      router.push('/dashboard/admin/manage-games');
    } catch (error: any) {
      console.error("Error creating game:", error);
      toast.error("Failed to create game.", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

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
          <CardTitle>Create New Game</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="title">Game Title</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Happy Wheels" disabled={loading} />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Provide a fun description of the game." disabled={loading} />
            </div>
            <div>
              <Label htmlFor="gameType">Game Type</Label>
              <Select value={gameType} onValueChange={(value: "free" | "paid") => setGameType(value)} disabled={loading}>
                <SelectTrigger id="gameType">
                  <SelectValue placeholder="Select a game type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free (with ads)</SelectItem>
                  <SelectItem value="paid">Paid (Subscription)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="gameScript">Game Script Tag</Label>
              <Textarea id="gameScript" value={gameScript} onChange={(e) => setGameScript(e.target.value)} placeholder='<iframe src="..." width="..." height="..."></iframe>' disabled={loading} rows={5} />
              <p className="text-sm text-muted-foreground mt-1">
                Paste the full HTML script tag for the game (e.g., the entire {'<iframe>'} tag).
              </p>
            </div>
            <div>
              <Label htmlFor="imageFile">Upload Game Image</Label>
              <Input id="imageFile" type="file" accept="image/*" onChange={handleImageFileChange} disabled={loading} required />
              {imageFile && <p className="text-sm text-gray-500 mt-2">Selected: {imageFile.name}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating Game..." : "Create Game"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
