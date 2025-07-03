"use client";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/firebase/config";
import { collection, query, getDocs, orderBy, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useRouter } from "next/navigation";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface Game {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  gameType: 'free' | 'paid';
  gameScript: string;
  active: boolean;
}

export default function ManageGamesPage() {
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [gameToDeleteId, setGameToDeleteId] = useState<string | null>(null);
  const [deletingGameId, setDeletingGameId] = useState<string | null>(null);

  // Admin access control
  useEffect(() => {
    if (!authLoading && !isAdmin) {
      toast.error("Access Denied", {
        description: "You do not have permission to access this page.",
      });
      router.push("/dashboard");
    }
  }, [user, authLoading, isAdmin, router]);

  useEffect(() => {
    if (!isAdmin) return;

    const fetchGames = async () => {
      try {
        const gamesCollectionRef = collection(db, "games");
        const q = query(gamesCollectionRef, orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const fetchedGames: Game[] = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Game[];
        setGames(fetchedGames);
      } catch (error: any) {
        console.error("Error fetching games:", error);
        toast.error("Failed to load games.", { description: error.message });
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, [isAdmin]);

  const handleToggleActive = async (gameId: string, currentStatus: boolean) => {
    setGames(games.map(game => game.id === gameId ? { ...game, active: !currentStatus } : game));
    try {
      await updateDoc(doc(db, "games", gameId), { active: !currentStatus });
      toast.success("Game status updated successfully.");
    } catch (error: any) {
      setGames(games.map(game => game.id === gameId ? { ...game, active: currentStatus } : game));
      toast.error("Failed to update game status.", { description: error.message });
    }
  };

  const handleDeleteGame = (gameId: string) => {
    setGameToDeleteId(gameId);
  };

  const confirmDeleteGame = async () => {
    if (!gameToDeleteId) return;
    setDeletingGameId(gameToDeleteId);
    try {
      await deleteDoc(doc(db, "games", gameToDeleteId));
      setGames(games.filter((game) => game.id !== gameToDeleteId));
      toast.success("Game deleted successfully!");
    } catch (error: any) {
      console.error("Error deleting game:", error);
      toast.error("Failed to delete game.", { description: error.message });
    } finally {
      setDeletingGameId(null);
      setGameToDeleteId(null);
    }
  };

  if (authLoading || !isAdmin) {
    return <div className="flex flex-col items-center justify-center h-full"><p>Loading or checking permissions...</p></div>;
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-4">
      <div className="w-full max-w-5xl flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Manage Games</h1>
        <Link href="/dashboard/admin/create-game"><Button>Create New Game</Button></Link>
      </div>

      {loading ? <p>Loading games...</p> : games.length === 0 ? (
        <p className="text-lg text-gray-500">No games found. Create one to get started!</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl">
          {games.map((game) => (
            <Card key={game.id} className="flex flex-col justify-between">
              <CardHeader>
                <CardTitle>{game.title}</CardTitle>
                <span className={`text-xs font-bold px-2 py-1 rounded-full w-fit ${game.gameType === 'free' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                  {game.gameType.toUpperCase()}
                </span>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">{game.description}</p>
                {game.imageUrl && <img src={game.imageUrl} alt={game.title} className="w-full h-32 object-cover mb-4 rounded" />}
                <div className="flex items-center space-x-2 mt-4">
                  <Switch id={`active-switch-${game.id}`} checked={game.active} onCheckedChange={() => handleToggleActive(game.id, game.active)} />
                  <Label htmlFor={`active-switch-${game.id}`}>{game.active ? "Active" : "Inactive"}</Label>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 mt-4">
                  <Link href={`/dashboard/admin/edit-game/${game.id}`} passHref className="w-full">
                    <Button variant="outline" className="w-full">Edit</Button>
                  </Link>
                  <Button onClick={() => handleDeleteGame(game.id)} className="w-full" variant="destructive" disabled={deletingGameId === game.id}>
                    {deletingGameId === game.id ? "Deleting..." : "Delete"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!gameToDeleteId} onOpenChange={(open) => !open && setGameToDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. This will permanently delete the game.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deletingGameId}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteGame} disabled={!!deletingGameId}>{deletingGameId ? "Deleting..." : "Delete"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
