import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import {
  BookOpen,
  GraduationCap,
  Medal,
  Play,
  Sparkles,
  Trophy,
  Zap,
} from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Home() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && user) {
      setLocation("/dashboard");
    }
  }, [loading, user, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/10" />
        <div className="container relative py-24 lg:py-36">
          <div className="max-w-3xl mx-auto text-center">
            <div className="flex items-center justify-center gap-3 mb-8">
              <GraduationCap className="h-12 w-12 text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold tracking-tight mb-6">
              Learn. Grow.{" "}
              <span className="gradient-text">Excel.</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              Platestory's learning platform empowers every team member with personalized courses,
              engaging quizzes, and a community that celebrates growth.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="text-base px-8 py-6 shadow-lg hover:shadow-xl transition-all"
                onClick={() => { window.location.href = getLoginUrl(); }}
              >
                <Play className="mr-2 h-5 w-5" />
                Start Learning
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="container py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-serif font-semibold mb-4">Built for how you work</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Whether you have 2 minutes or 2 hours, there's a learning path designed for you.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: Zap,
              title: "Micro-Learning",
              desc: "Quick, focused lessons perfect for busy schedules. Learn on the go with bite-sized content.",
            },
            {
              icon: BookOpen,
              title: "Deep Dive Mode",
              desc: "Immersive, long-form content for leadership and strategic training in cinema-quality.",
            },
            {
              icon: Sparkles,
              title: "Interactive Quizzes",
              desc: "Multiple formats including drag-and-drop, visual assessments, and real-world scenarios.",
            },
            {
              icon: Trophy,
              title: "Gamification",
              desc: "Earn points, unlock badges, and climb the leaderboard. Learning has never been this engaging.",
            },
            {
              icon: Medal,
              title: "Badges & Streaks",
              desc: "Build daily habits with streak tracking and earn tiered badges for your achievements.",
            },
            {
              icon: GraduationCap,
              title: "AI Learning Assistant",
              desc: "Get instant answers, personalized recommendations, and study support from PlateBot.",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="group glass-card p-6 hover:shadow-md transition-all duration-300"
            >
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                <feature.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t bg-card/50">
        <div className="container py-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            <span className="font-serif text-sm font-medium">Platestory LMS</span>
          </div>
          <p className="text-xs text-muted-foreground">Internal learning platform</p>
        </div>
      </footer>
    </div>
  );
}
