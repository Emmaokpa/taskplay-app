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
import { supabase } from "@/lib/supabase/supabaseClient";
import { v4 as uuidv4 } from 'uuid';

interface GameData {
  title: string;
  description: string;
  gameType: 'free' | 'paid';
  gameScript: string;
  imageUrl?: string;
}

export default function EditGamePage() {
  const { user, isLoading: authLoading, isAdmin } = useAuth();
  const router = useRouter();
  const params = useParams();
  const gameId = params.gameId as string;

  const [gameData, setGameData] = useState<GameData | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Access control and data fetching
  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin) {
      toast.error("Access Denied", {
        description: "You do not have permission to access this page.",
      });
      router.push("/dashboard");
      return;
    }

    if (!gameId) {
      toast.error("Invalid Game ID.");
      router.push("/dashboard/admin/manage-games");
      return;
    }

    const fetchGame = async () => {
      try {
        const gameDocRef = doc(db, "games", gameId);
        const gameDoc = await getDoc(gameDocRef);
        if (gameDoc.exists()) {
          setGameData(gameDoc.data() as GameData);
        } else {
          toast.error("Game not found.");
          router.push("/dashboard/admin/manage-games");
        }
      } catch (error: any) {
        toast.error("Failed to load game data.", { description: error.message });
      } finally {
        setLoading(false);
      }
    };

    fetchGame();
  }, [gameId, authLoading, isAdmin, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!gameData) return;
    const { id, value } = e.target;
    setGameData({ ...gameData, [id]: value });
  };

  const handleSelectChange = (value: "free" | "paid") => {
    if (!gameData) return;
    setGameData({ ...gameData, gameType: value });
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    } else {
      setImageFile(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isAdmin || !gameData) return;

    if (!gameData.title || !gameData.description || !gameData.gameType || !gameData.gameScript) {
      toast.error("Missing Fields", { description: "Please fill in all required fields." });
      return;
    }

    setIsSubmitting(true);
    let uploadedImageUrl = gameData.imageUrl;

    try {
      // If a new image is selected, upload it
      if (imageFile) {
        const fileExtension = imageFile.name.split('.').pop();
        const fileName = `game-images/${uuidv4()}.${fileExtension}`;
        const { data, error: uploadError } = await supabase.storage
          .from('task-screenshots')
          .upload(fileName, imageFile, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) throw uploadError;
        uploadedImageUrl = supabase.storage.from('task-screenshots').getPublicUrl(fileName).data.publicUrl;
      }

      const gameDocRef = doc(db, "games", gameId);
      await updateDoc(gameDocRef, {
        ...gameData,
        imageUrl: uploadedImageUrl,
        updatedAt: serverTimestamp(),
      });

      toast.success("Game updated successfully!");
      router.push('/dashboard/admin/manage-games');
    } catch (error: any) {
      console.error("Error updating game:", error);
      toast.error("Failed to update game.", { description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p>Loading game editor...</p>
      </div>
    );
  }

  if (!gameData) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p>Could not load game data.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Edit Game: {gameData.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="title">Game Title</Label>
              <Input id="title" value={gameData.title} onChange={handleInputChange} disabled={isSubmitting} />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={gameData.description} onChange={handleInputChange} disabled={isSubmitting} />
            </div>
            <div>
              <Label htmlFor="gameType">Game Type</Label>
              <Select value={gameData.gameType} onValueChange={handleSelectChange} disabled={isSubmitting}>
                <SelectTrigger id="gameType">
                  <SelectValue placeholder="Select a game type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free (with ads)</SelectItem>
                  <SelectItem value="paid">Paid (requires entry fee)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="gameScript">Game Script Tag</Label>
              <Textarea id="gameScript" value={gameData.gameScript} onChange={handleInputChange} placeholder='<iframe src="..." width="..." height="..."></iframe>' disabled={isSubmitting} rows={5} />
              <p className="text-sm text-muted-foreground mt-1">
                Paste the full HTML script tag for the game (e.g., the entire {'<iframe>'} tag).
              </p>
            </div>
            <div>
              <Label>Current Image</Label>
              {gameData.imageUrl ? (
                <img src={gameData.imageUrl} alt="Current game" className="w-48 h-auto rounded-md border mt-2" />
              ) : (
                <p className="text-sm text-muted-foreground">No image uploaded.</p>
              )}
            </div>
            <div>
              <Label htmlFor="imageFile">Upload New Image (Optional)</Label>
              <Input id="imageFile" type="file" accept="image/*" onChange={handleImageFileChange} disabled={isSubmitting} />
              {imageFile && <p className="text-sm text-gray-500 mt-2">New image selected: {imageFile.name}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Updating Game..." : "Update Game"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
