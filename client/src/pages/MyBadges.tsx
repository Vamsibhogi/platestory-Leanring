import AppLayout from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Medal } from "lucide-react";

const tierColors = {
  bronze: "border-amber-600/40 bg-gradient-to-b from-amber-50 to-orange-50",
  silver: "border-gray-400/40 bg-gradient-to-b from-gray-50 to-slate-50",
  gold: "border-amber-400/50 bg-gradient-to-b from-amber-50 to-yellow-50",
  platinum: "border-violet-400/50 bg-gradient-to-b from-violet-50 to-purple-50",
};

const tierBadgeColors = {
  bronze: "bg-amber-100 text-amber-800 border-amber-300",
  silver: "bg-gray-100 text-gray-700 border-gray-300",
  gold: "bg-amber-100 text-amber-700 border-amber-400",
  platinum: "bg-violet-100 text-violet-700 border-violet-400",
};

export default function MyBadges() {
  const { user } = useAuth();
  const myBadges = trpc.badge.myBadges.useQuery(undefined, { enabled: !!user });
  const allBadges = trpc.badge.list.useQuery(undefined, { enabled: !!user });

  const earnedIds = new Set(myBadges.data?.map(b => b.badgeId) ?? []);

  return (
    <AppLayout>
      <div className="container py-8">
        {/* Header with gradient accent */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <Medal className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-serif font-semibold">Badges</h1>
              <p className="text-muted-foreground text-sm">
                You've earned {myBadges.data?.length ?? 0} of {allBadges.data?.length ?? 0} badges
              </p>
            </div>
          </div>
        </div>

        {/* Earned Badges */}
        {(myBadges.data?.length ?? 0) > 0 && (
          <div className="mb-10">
            <h2 className="text-lg font-semibold mb-4">Your Badges</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {myBadges.data?.map((badge) => (
                <Card key={badge.id} className={`border-2 card-hover ${tierColors[badge.tier as keyof typeof tierColors] ?? ""}`}>
                  <CardContent className="p-4 text-center">
                    <span className="text-4xl block mb-2 drop-shadow-sm">{badge.icon}</span>
                    <p className="text-sm font-semibold mb-1">{badge.name}</p>
                    <Badge variant="outline" className={`text-[10px] capitalize ${tierBadgeColors[badge.tier as keyof typeof tierBadgeColors] ?? ""}`}>
                      {badge.tier}
                    </Badge>
                    {badge.description && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{badge.description}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* All Badges */}
        <div>
          <h2 className="text-lg font-semibold mb-4">All Badges</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {allBadges.data?.map((badge) => {
              const earned = earnedIds.has(badge.id);
              return (
                <Card key={badge.id} className={`transition-all ${earned ? `border-2 ${tierColors[badge.tier as keyof typeof tierColors] ?? ""}` : "opacity-40 grayscale border"}`}>
                  <CardContent className="p-4 text-center">
                    <span className="text-4xl block mb-2">{badge.icon}</span>
                    <p className="text-sm font-semibold mb-1">{badge.name}</p>
                    <Badge variant="outline" className={`text-[10px] capitalize ${earned ? (tierBadgeColors[badge.tier as keyof typeof tierBadgeColors] ?? "") : ""}`}>
                      {badge.tier}
                    </Badge>
                    {badge.description && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{badge.description}</p>
                    )}
                    {!earned && (
                      <p className="text-[10px] text-muted-foreground mt-2 font-medium italic">Locked</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
