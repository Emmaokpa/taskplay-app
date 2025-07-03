"use client";

import { useAuth } from "@/components/auth-provider";
import { db } from "@/lib/firebase/config";
import { doc, getDoc, increment, runTransaction, Timestamp } from "firebase/firestore";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, memo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

// This tells TypeScript that a global variable `aclib` can exist on the `window` object.
declare const aclib: any;

interface Game {
  id: string;
  title: string;
  description: string;
  gameScript: string;
  gameType: 'free' | 'paid';
  imageUrl?: string;
  rewardAmount: number;
}

type GameState = 'preroll' | 'playing' | 'postroll';

const GAME_DURATION_SECONDS = 120; // 2 minutes
const DAILY_FREE_GAME_LIMIT = 3;
const FREE_GAME_REWARD = 5;

// Central configuration for VIP tier benefits
const TIER_BENEFITS = {
  silver: { dailyGameLimit: 10, rewardPerGame: 15 },
  gold: { dailyGameLimit: 12, rewardPerGame: 20 },
  diamond: { dailyGameLimit: 20, rewardPerGame: 25 },
  platinum: { dailyGameLimit: 20, rewardPerGame: 35 },
};

// Memoize the game iframe to prevent it from re-rendering every second.
const GameIframe = memo(function GameIframe({ gameScript }: { gameScript: string }) {
  return (
    <div
      className="w-full flex-grow flex items-center justify-center bg-black"
      dangerouslySetInnerHTML={{ __html: gameScript }}
    />
  );
});
GameIframe.displayName = 'GameIframe';

export default function GamePlayPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const gameId = params.gameId as string;

  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [gameState, setGameState] = useState<GameState>('preroll');
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION_SECONDS);
  const [isTimerActive, setIsTimerActive] = useState(true);
  const [showAds, setShowAds] = useState(true);
  const [isEligibleForReward, setIsEligibleForReward] = useState(false);
  const [rewardAwarded, setRewardAwarded] = useState(false);

  const todayDateString = useMemo(() => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // YYYY-MM-DD format
  }, []);

  // Fetch game data
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    if (!gameId) {
      toast.error("Game not found.");
      router.push("/dashboard/games");
      return;
    }
    const fetchGame = async () => {
      try {
        const gameDocRef = doc(db, "games", gameId);
        const gameDoc = await getDoc(gameDocRef);
        if (gameDoc.exists()) {
          setGame({ id: gameDoc.id, ...gameDoc.data() } as Game);
        } else {
          toast.error("Game not found.");
          router.push("/dashboard/games");
        }
      } catch (error: any) {
        toast.error("Failed to load game.", { description: error.message });
      } finally {
        setLoading(false);
      }
    };
    fetchGame();
  }, [gameId, user, authLoading, router]);

  // Determine reward eligibility
  useEffect(() => {
    if (!user || !game) return;

    if (game.gameType === 'free') {
      const gamesPlayedToday = user.dailyFreeGamesPlayed?.[todayDateString] ?? 0;
      setIsEligibleForReward(gamesPlayedToday < DAILY_FREE_GAME_LIMIT);
    } else if (game.gameType === 'paid') {
      const hasActiveSubscription = user.subscription?.expiresAt ? (user.subscription.expiresAt as unknown as Timestamp).toMillis() > Date.now() : false;
      if (!hasActiveSubscription) {
        toast.error("You need an active subscription to play this game.", {
          description: "Please subscribe to a plan to continue.",
        });
        router.push('/vip');
        return;
      }
      const gamesPlayedToday = user.dailyPaidGamesPlayed?.[todayDateString] || 0;
      const tier = user.subscription?.tier as keyof typeof TIER_BENEFITS | undefined;
      const dailyLimit = tier ? TIER_BENEFITS[tier]?.dailyGameLimit ?? 0 : 0;
      const isWithinDailyLimit = dailyLimit > gamesPlayedToday;
      setIsEligibleForReward(!!tier && isWithinDailyLimit);
    }
  }, [user, game, todayDateString, router]);

  // Determine if timer and ads should be active based on subscription
  useEffect(() => {
    if (user && game && game.gameType === 'paid') {
      const hasActiveSubscription = user.subscription?.expiresAt ? (user.subscription.expiresAt as unknown as Timestamp).toMillis() > Date.now() : false;
      if (hasActiveSubscription) {
        setIsTimerActive(false); // Paid users have no timer
        setShowAds(!isEligibleForReward); // Show ads only if they've passed their daily reward limit
      }
    } else {
      // Free games always have a timer and ads
      setIsTimerActive(true);
      setShowAds(true);
    }
  }, [user, game, isEligibleForReward]);

  // Ad logic
  useEffect(() => {
    if (!showAds || (gameState !== 'preroll' && gameState !== 'postroll')) {
      return;
    }
    let attempts = 0;
    const maxAttempts = 10;
    const tryShowAd = () => {
      attempts++;
      if (typeof (window as any).aclib?.runAutoTag === 'function') {
        console.log(`Showing ad for zone ajevie5lli in ${gameState} state.`);
        (window as any).aclib.runAutoTag({ zoneId: 'ajevie5lli' });
      } else if (attempts < maxAttempts) {
        console.warn(`Ad library (aclib) not found. Retrying... (Attempt ${attempts})`);
        setTimeout(tryShowAd, 500);
      } else {
        console.error('Ad library failed to load after several attempts.');
        toast.error("Ads could not be loaded", { description: "Please check your ad-blocker or network connection." });
      }
    };
    const timerId = setTimeout(tryShowAd, 100);
    return () => clearTimeout(timerId);
  }, [gameState, showAds]);

  // Timer logic
  useEffect(() => {
    if (gameState !== 'playing' || !isTimerActive) return;
    if (timeLeft <= 0) {
      setGameState('postroll');
      return;
    }
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [gameState, timeLeft, isTimerActive]);

  // Reward logic
  useEffect(() => {
    if (gameState === 'postroll' && isEligibleForReward && !rewardAwarded) {
      const awardReward = async () => {
        if (!user || !game) return;
        const userDocRef = doc(db, "users", user.uid);
        try {
          let rewardAmount = 0;
          let dailyGamesPlayedField = '';
          let successMessage = '';

          if (game.gameType === 'free') {
            rewardAmount = FREE_GAME_REWARD;
            dailyGamesPlayedField = `dailyFreeGamesPlayed.${todayDateString}`;
            successMessage = `You earned ₦${rewardAmount}!`;
          } else if (game.gameType === 'paid' && user.subscription) {
            const tier = user.subscription.tier as keyof typeof TIER_BENEFITS;
            rewardAmount = TIER_BENEFITS[tier]?.rewardPerGame || 0;
            dailyGamesPlayedField = `dailyPaidGamesPlayed.${todayDateString}`;
            successMessage = `You earned ₦${rewardAmount} for playing!`;
          }

          if (rewardAmount <= 0) return; // Do not proceed if there's no reward
          await runTransaction(db, async (transaction) => {
            const userDoc = await transaction.get(userDocRef);
            const userData = userDoc.data();
            if (!userData) throw new Error("User document does not exist!");
            // Update user's balance and increment games played
            transaction.update(userDocRef, {
              nairaBalance: increment(rewardAmount),
              [dailyGamesPlayedField]: increment(1)
            });
          });
          toast.success(successMessage, { description: "Your balance has been updated." });
          setRewardAwarded(true);

        } catch (error: any) {
          console.error("Error awarding reward:", error);
          toast.error("Failed to award reward.", { description: error.message });
        }
      };
      awardReward();
    }
  }, [gameState, isEligibleForReward, rewardAwarded, user, todayDateString, game]);

  const handleStartGame = () => {
    setGameState('playing');
  };

  const handlePlayAgain = () => {
    setTimeLeft(GAME_DURATION_SECONDS);
    setRewardAwarded(false);
    if (user && game && game.gameType === 'free') {
      const gamesPlayedToday = user.dailyFreeGamesPlayed?.[todayDateString] ?? 0;
      setIsEligibleForReward(gamesPlayedToday < DAILY_FREE_GAME_LIMIT);
    }
    setGameState('preroll');
  };

  if (loading || authLoading) {
    return <div className="flex items-center justify-center h-full"><p>Loading Game...</p></div>;
  }

  if (!game) {
    return <div className="flex items-center justify-center h-full"><p>Game could not be loaded.</p></div>;
  }

  return (
    <div className="flex flex-col items-center p-4 h-full">
      <h1 className="text-3xl font-bold mb-2">{game.title}</h1>
      <p className="text-muted-foreground mb-4">{game.description}</p>

      <div className="w-full flex-grow bg-gray-200 dark:bg-gray-800 rounded-lg flex items-center justify-center text-center overflow-hidden relative">
        {/* Pre-roll View */}
        <div className={cn("absolute inset-0 w-full h-full bg-black text-white flex-col items-center justify-center gap-4 p-4", gameState === 'preroll' ? 'flex' : 'hidden')}>
          <p className="text-2xl font-bold text-center">Your game will start after this ad.</p>
          <p className="text-muted-foreground text-center">This is a placeholder for a pre-roll video ad.</p>
          <Button onClick={handleStartGame} size="lg" className="mt-4">Start Game</Button>
        </div>

        {/* Playing View */}
        <div className={cn("w-full h-full flex-col", gameState === 'playing' ? 'flex' : 'hidden')}>
          {isTimerActive && (
            <div className="p-2 bg-gray-100 dark:bg-gray-800 flex items-center justify-between gap-4">
              <p className="font-mono text-lg whitespace-nowrap">Time Left: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</p>
              <Progress value={(timeLeft / GAME_DURATION_SECONDS) * 100} className="w-full" />
            </div>
          )}
          <GameIframe gameScript={game.gameScript} />
        </div>

        {/* Post-roll View */}
        <div className={cn("absolute inset-0 w-full h-full bg-black text-white flex-col items-center justify-center gap-4 p-4", gameState === 'postroll' ? 'flex' : 'hidden')}>
          <p className="text-3xl font-bold">Game Over!</p>
          {isEligibleForReward && rewardAwarded && (
            <p className="text-green-400 text-xl">{
              game?.gameType === 'free'
                ? `You earned ₦${FREE_GAME_REWARD}!`
                : `You earned ₦${
                    TIER_BENEFITS[user?.subscription?.tier as keyof typeof TIER_BENEFITS]?.rewardPerGame || 0
                  }!`
            }</p>
          )}
          {isEligibleForReward && !rewardAwarded && (
            <p className="text-yellow-400 text-xl">Processing reward...</p>
          )}
          {!isEligibleForReward && (
            <p className="text-gray-400">
              {game?.gameType === 'free'
                ? "You've reached your daily reward limit for free games."
                : `You've reached your daily reward limit for ${user?.subscription?.tier} games.`}
            </p>
          )}
          {/* Conditionally render the "Play Again" button */}
          {isEligibleForReward && (
            <div className="flex gap-4 mt-4">
              <Button onClick={handlePlayAgain} size="lg">Play Again</Button>
              <Button onClick={() => router.push('/dashboard/games')} size="lg" variant="outline">Back to Games</Button>
            </div>
          )}
          <p className="mt-4 text-muted-foreground">This is a placeholder for a post-roll video ad.</p>
        </div>
      </div>
    </div>
  );
}
