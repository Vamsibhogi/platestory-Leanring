import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import {
  BookOpen,
  Brain,
  GraduationCap,
  Medal,
  Play,
  Sparkles,
  Target,
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
      {/* Hero Section — vibrant gradient */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0" style={{
          background: "linear-gradient(135deg, oklch(0.48 0.14 185) 0%, oklch(0.45 0.12 220) 30%, oklch(0.50 0.14 290) 60%, oklch(0.55 0.15 290) 100%)"
        }} />
        {/* Decorative circles */}
        <div className="absolute top-10 right-10 w-72 h-72 rounded-full opacity-10 bg-white blur-3xl" />
        <div className="absolute bottom-0 left-10 w-96 h-96 rounded-full opacity-10 bg-white blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-5 bg-white blur-3xl" />

        <div className="container relative py-24 lg:py-40">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-4 py-2 mb-8 text-white/90 text-sm font-medium">
              <Sparkles className="h-4 w-4" />
              Platestory Learning Platform
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold tracking-tight mb-6 text-white">
              Learn. Grow.{" "}
              <span className="relative">
                <span className="relative z-10">Excel.</span>
                <span className="absolute bottom-1 left-0 right-0 h-3 bg-white/20 -skew-x-3 rounded" />
              </span>
            </h1>
            <p className="text-lg md:text-xl text-white/85 mb-10 max-w-2xl mx-auto leading-relaxed">
              Platestory's learning platform empowers every team member with personalized courses,
              engaging quizzes, and a community that celebrates growth.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="text-base px-8 py-6 bg-white text-primary hover:bg-white/90 shadow-lg hover:shadow-xl transition-all font-semibold"
                onClick={() => { window.location.href = getLoginUrl(); }}
              >
                <Play className="mr-2 h-5 w-5" />
                Start Learning
              </Button>
            </div>
            <p className="text-white/60 text-sm mt-4">
              Sign in with your @platestory.in email to get started
            </p>
          </div>
        </div>
        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 80V40C240 0 480 0 720 40C960 80 1200 80 1440 40V80H0Z" fill="oklch(0.985 0.004 90)" />
          </svg>
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
              gradient: "from-amber-500 to-orange-500",
              iconBg: "bg-amber-100 text-amber-600",
            },
            {
              icon: BookOpen,
              title: "Deep Dive Mode",
              desc: "Immersive, long-form content for leadership and strategic training in cinema-quality.",
              gradient: "from-blue-500 to-indigo-500",
              iconBg: "bg-blue-100 text-blue-600",
            },
            {
              icon: Brain,
              title: "Interactive Quizzes",
              desc: "Multiple formats including drag-and-drop, visual assessments, and real-world scenarios.",
              gradient: "from-violet-500 to-purple-500",
              iconBg: "bg-violet-100 text-violet-600",
            },
            {
              icon: Trophy,
              title: "Gamification",
              desc: "Earn points, unlock badges, and climb the leaderboard. Learning has never been this engaging.",
              gradient: "from-emerald-500 to-teal-500",
              iconBg: "bg-emerald-100 text-emerald-600",
            },
            {
              icon: Medal,
              title: "Badges & Streaks",
              desc: "Build daily habits with streak tracking and earn tiered badges for your achievements.",
              gradient: "from-pink-500 to-rose-500",
              iconBg: "bg-pink-100 text-pink-600",
            },
            {
              icon: Target,
              title: "AI Learning Assistant",
              desc: "Get instant answers, personalized recommendations, and study support from PlateBot.",
              gradient: "from-cyan-500 to-teal-500",
              iconBg: "bg-cyan-100 text-cyan-600",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="group glass-card p-6 card-hover"
            >
              <div className={`h-11 w-11 rounded-xl ${feature.iconBg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold mb-2 text-foreground">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Stats Section */}
      <div className="relative py-16 overflow-hidden">
        <div className="absolute inset-0" style={{
          background: "linear-gradient(135deg, oklch(0.48 0.14 185) 0%, oklch(0.50 0.14 290) 100%)"
        }} />
        <div className="container relative">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
            {[
              { label: "Learning Modes", value: "3" },
              { label: "Quiz Formats", value: "4" },
              { label: "Badge Tiers", value: "4" },
              { label: "AI Powered", value: "Yes" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-3xl md:text-4xl font-bold mb-1">{stat.value}</p>
                <p className="text-white/70 text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t bg-card/50">
        <div className="container py-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            <span className="font-serif text-sm font-medium">Platestory LMS</span>
          </div>
          <p className="text-xs text-muted-foreground">Internal learning platform — @platestory.in</p>
        </div>
      </footer>
    </div>
  );
}
