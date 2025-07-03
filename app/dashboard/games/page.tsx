"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { db } from "@/lib/firebase/config";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";
import { Gamepad2 } from "lucide-react";

interface Game {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  gameType: 'free' | 'paid';
}

export default function GamesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }

    const fetchGames = async () => {
      try {
        const gamesCollectionRef = collection(db, "games");
        const q = query(
          gamesCollectionRef,
          where("active", "==", true),
          orderBy("createdAt", "desc")
        );
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
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <p>Loading games...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold flex items-center gap-3">
          <Gamepad2 className="h-10 w-10" />
          Play Games
        </h1>
      </div>

      {games.length === 0 ? (
        <div className="text-center py-16">
          <h2 className="text-2xl font-semibold">No Games Available</h2>
          <p className="text-muted-foreground mt-2">
            The admin hasn't added any games yet. Please check back later!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {games.map((game) => (
            <Link key={game.id} href={`/dashboard/games/${game.id}`} passHref>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full flex flex-col">
                {game.imageUrl && (
                  <img src={game.imageUrl} alt={game.title} className="w-full h-40 object-cover rounded-t-lg" />
                )}
                <CardHeader>
                  <CardTitle>{game.title}</CardTitle>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full w-fit ${game.gameType === 'free' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>{game.gameType.toUpperCase()}</span>
                </CardHeader>
                <CardContent className="flex-grow">
                  <CardDescription>{game.description}</CardDescription>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
