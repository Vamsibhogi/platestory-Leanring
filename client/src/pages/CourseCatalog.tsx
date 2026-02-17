import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import {
  BookOpen,
  Clock,
  Filter,
  Search,
  Star,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";

const modeLabels = { micro: "Micro-Learning", deep: "Deep Dive", standard: "Standard" };
const modeIcons = { micro: Zap, deep: BookOpen, standard: BookOpen };
const difficultyColors = {
  beginner: "bg-emerald-100 text-emerald-700",
  intermediate: "bg-amber-100 text-amber-700",
  advanced: "bg-red-100 text-red-700",
};

export default function CourseCatalog() {
  const { user } = useAuth();
  const courses = trpc.course.list.useQuery(undefined, { enabled: !!user });
  const enrollments = trpc.enrollment.myEnrollments.useQuery(undefined, { enabled: !!user });
  const [search, setSearch] = useState("");
  const [modeFilter, setModeFilter] = useState<string>("all");
  const [diffFilter, setDiffFilter] = useState<string>("all");

  const enrolledMap = useMemo(() => {
    const map = new Map<number, any>();
    enrollments.data?.forEach((e: any) => map.set(e.courseId, e));
    return map;
  }, [enrollments.data]);

  const filtered = useMemo(() => {
    return (courses.data ?? []).filter(c => {
      if (search && !c.title.toLowerCase().includes(search.toLowerCase()) && !c.description?.toLowerCase().includes(search.toLowerCase())) return false;
      if (modeFilter !== "all" && c.mode !== modeFilter) return false;
      if (diffFilter !== "all" && c.difficulty !== diffFilter) return false;
      return true;
    });
  }, [courses.data, search, modeFilter, diffFilter]);

  return (
    <AppLayout>
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-serif font-semibold mb-1">Course Catalog</h1>
          <p className="text-muted-foreground">Discover courses tailored to your role and growth</p>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search courses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={modeFilter}
              onChange={(e) => setModeFilter(e.target.value)}
              className="h-10 rounded-lg border bg-background px-3 text-sm"
            >
              <option value="all">All Modes</option>
              <option value="micro">Micro-Learning</option>
              <option value="deep">Deep Dive</option>
              <option value="standard">Standard</option>
            </select>
            <select
              value={diffFilter}
              onChange={(e) => setDiffFilter(e.target.value)}
              className="h-10 rounded-lg border bg-background px-3 text-sm"
            >
              <option value="all">All Levels</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
        </div>

        {/* Course Grid */}
        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No courses found</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((course) => {
              const enrollment = enrolledMap.get(course.id);
              const ModeIcon = modeIcons[course.mode] || BookOpen;
              return (
                <Link key={course.id} href={`/courses/${course.id}`}>
                  <Card className="border-border/50 hover:shadow-lg transition-all duration-300 cursor-pointer group h-full">
                    {/* Thumbnail */}
                    <div className="h-40 bg-gradient-to-br from-primary/10 to-accent/10 rounded-t-xl flex items-center justify-center relative overflow-hidden">
                      {course.thumbnailUrl ? (
                        <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover" />
                      ) : (
                        <ModeIcon className="h-12 w-12 text-primary/30 group-hover:scale-110 transition-transform" />
                      )}
                      {course.isMandatory && (
                        <Badge className="absolute top-3 left-3 bg-destructive text-destructive-foreground text-[10px]">
                          Mandatory
                        </Badge>
                      )}
                      {enrollment && (
                        <Badge className="absolute top-3 right-3 bg-primary text-primary-foreground text-[10px]">
                          {enrollment.status === "completed" ? "Completed" : `${enrollment.progress}%`}
                        </Badge>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-[10px]">
                          {modeLabels[course.mode]}
                        </Badge>
                        <Badge variant="secondary" className={`text-[10px] ${difficultyColors[course.difficulty]}`}>
                          {course.difficulty}
                        </Badge>
                      </div>
                      <h3 className="font-semibold text-sm mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                        {course.title}
                      </h3>
                      {course.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{course.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {(course.estimatedMinutes ?? 0) > 0 && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {course.estimatedMinutes}m
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3" />
                          {course.pointsReward} pts
                        </span>
                        {course.category && (
                          <span className="truncate">{course.category}</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
