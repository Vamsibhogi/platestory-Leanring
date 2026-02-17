import AppLayout from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Medal } from "lucide-react";

const tierColors = {
  bronze: "border-amber-700/30 bg-amber-50",
  silver: "border-gray-400/30 bg-gray-50",
  gold: "border-amber-400/30 bg-amber-50/80",
  platinum: "border-purple-400/30 bg-purple-50",
};

const tierTextColors = {
  bronze: "text-amber-700",
  silver: "text-gray-500",
  gold: "text-amber-500",
  platinum: "text-purple-500",
};

export default function MyBadges() {
  const { user } = useAuth();
  const myBadges = trpc.badge.myBadges.useQuery(undefined, { enabled: !!user });
  const allBadges = trpc.badge.list.useQuery(undefined, { enabled: !!user });

  const earnedIds = new Set(myBadges.data?.map(b => b.badgeId) ?? []);

  return (
    <AppLayout>
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-serif font-semibold mb-1">Badges</h1>
          <p className="text-muted-foreground">
            You've earned {myBadges.data?.length ?? 0} of {allBadges.data?.length ?? 0} badges
          </p>
        </div>

        {/* Earned Badges */}
        {(myBadges.data?.length ?? 0) > 0 && (
          <div className="mb-10">
            <h2 className="text-lg font-semibold mb-4">Your Badges</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {myBadges.data?.map((badge) => (
                <Card key={badge.id} className={`border-2 ${tierColors[badge.tier as keyof typeof tierColors] ?? ""}`}>
                  <CardContent className="p-4 text-center">
                    <span className="text-4xl block mb-2">{badge.icon}</span>
                    <p className="text-sm font-semibold mb-0.5">{badge.name}</p>
                    <Badge variant="outline" className={`text-[10px] capitalize ${tierTextColors[badge.tier as keyof typeof tierTextColors] ?? ""}`}>
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
                <Card key={badge.id} className={`transition-all ${earned ? tierColors[badge.tier as keyof typeof tierColors] ?? "" : "opacity-50 grayscale"}`}>
                  <CardContent className="p-4 text-center">
                    <span className="text-4xl block mb-2">{badge.icon}</span>
                    <p className="text-sm font-semibold mb-0.5">{badge.name}</p>
                    <Badge variant="outline" className={`text-[10px] capitalize ${earned ? (tierTextColors[badge.tier as keyof typeof tierTextColors] ?? "") : ""}`}>
                      {badge.tier}
                    </Badge>
                    {badge.description && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{badge.description}</p>
                    )}
                    {!earned && (
                      <p className="text-[10px] text-muted-foreground mt-2 font-medium">Not yet earned</p>
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
