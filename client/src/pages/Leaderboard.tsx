import AppLayout from "@/components/AppLayout";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Crown, Flame, Medal, Star, Trophy } from "lucide-react";

const rankColors = ["text-amber-500", "text-gray-400", "text-amber-700"];
const rankBgs = ["bg-amber-100", "bg-gray-100", "bg-amber-100/60"];

export default function Leaderboard() {
  const { user } = useAuth();
  const leaderboard = trpc.user.leaderboard.useQuery(undefined, { enabled: !!user });

  return (
    <AppLayout>
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-serif font-semibold mb-1">Leaderboard</h1>
          <p className="text-muted-foreground">See how you stack up against your colleagues</p>
        </div>

        {/* Top 3 Podium */}
        {(leaderboard.data?.length ?? 0) >= 3 && (
          <div className="grid grid-cols-3 gap-4 mb-8 max-w-2xl mx-auto bg-gradient-to-b from-primary/5 to-transparent rounded-2xl p-6">
            {[1, 0, 2].map((idx) => {
              const entry = leaderboard.data![idx];
              const isFirst = idx === 0;
              return (
                <div
                  key={entry.id}
                  className={`flex flex-col items-center ${isFirst ? "order-2 -mt-4" : idx === 1 ? "order-1 mt-4" : "order-3 mt-4"}`}
                >
                  <div className={`relative mb-3 ${isFirst ? "scale-125" : ""}`}>
                    <Avatar className={`h-16 w-16 border-3 ${isFirst ? "border-amber-400 shadow-lg shadow-amber-200" : idx === 1 ? "border-gray-300" : "border-amber-600/40"}`}>
                      <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
                        {entry.name?.charAt(0).toUpperCase() ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    {isFirst && (
                      <Crown className="absolute -top-3 left-1/2 -translate-x-1/2 h-6 w-6 text-amber-500" />
                    )}
                  </div>
                  <p className="font-medium text-sm text-center truncate max-w-full">{entry.name}</p>
                  <p className="text-xs text-muted-foreground">{entry.department ?? "Team"}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="h-3.5 w-3.5 text-amber-500" />
                    <span className="font-bold text-sm">{entry.points}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Full List */}
        <Card className="border-border/50 max-w-2xl mx-auto">
          <CardContent className="p-0">
            {leaderboard.data?.map((entry, idx) => {
              const isCurrentUser = entry.id === user?.id;
              return (
                <div
                  key={entry.id}
                  className={`flex items-center gap-4 px-5 py-3.5 border-b last:border-b-0 transition-colors ${
                    isCurrentUser ? "bg-primary/5" : "hover:bg-accent/30"
                  }`}
                >
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                    idx < 3 ? `${rankBgs[idx]} ${rankColors[idx]}` : "bg-muted text-muted-foreground"
                  }`}>
                    {idx < 3 ? (
                      <Medal className="h-4 w-4" />
                    ) : (
                      idx + 1
                    )}
                  </div>
                  <Avatar className="h-9 w-9 border shrink-0">
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {entry.name?.charAt(0).toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isCurrentUser ? "text-primary" : ""}`}>
                      {entry.name} {isCurrentUser && "(You)"}
                    </p>
                    <p className="text-xs text-muted-foreground">{entry.department ?? "Team Member"}</p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    {entry.streakDays > 0 && (
                      <span className="flex items-center gap-1 text-xs text-orange-600">
                        <Flame className="h-3.5 w-3.5" />
                        {entry.streakDays}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-sm font-semibold">
                      <Star className="h-3.5 w-3.5 text-amber-500" />
                      {entry.points}
                    </span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
