import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { BookOpen, Send, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function AdminAllocate() {
  const courses = trpc.course.listAll.useQuery();
  const users = trpc.user.list.useQuery();
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set());

  const allocateMutation = trpc.enrollment.allocate.useMutation({
    onSuccess: () => {
      toast.success("Course allocated to selected users!");
      setSelectedUsers(new Set());
    },
  });

  const toggleUser = (userId: number) => {
    setSelectedUsers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedUsers.size === (users.data?.length ?? 0)) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(users.data?.map(u => u.id) ?? []));
    }
  };

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-serif font-semibold mb-1">Allocate Courses</h1>
        <p className="text-muted-foreground text-sm">Assign mandatory or recommended courses to employees</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Select Course */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Select Course
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {courses.data?.map((course) => (
                <button
                  key={course.id}
                  onClick={() => setSelectedCourse(course.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    selectedCourse === course.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  <p className="text-sm font-medium">{course.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-[10px] capitalize">{course.mode}</Badge>
                    <Badge variant="secondary" className="text-[10px] capitalize">{course.difficulty}</Badge>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Select Users */}
        <Card className="border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                Select Employees ({selectedUsers.size})
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={selectAll}>
                {selectedUsers.size === (users.data?.length ?? 0) ? "Deselect All" : "Select All"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {users.data?.map((user) => (
                <label
                  key={user.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/30 cursor-pointer transition-colors"
                >
                  <Checkbox
                    checked={selectedUsers.has(user.id)}
                    onCheckedChange={() => toggleUser(user.id)}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{user.name ?? "Unknown"}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email ?? ""}</p>
                  </div>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Allocate Button */}
      <div className="mt-6 flex justify-end">
        <Button
          size="lg"
          disabled={!selectedCourse || selectedUsers.size === 0 || allocateMutation.isPending}
          onClick={() => {
            if (selectedCourse) {
              allocateMutation.mutate({
                courseId: selectedCourse,
                userIds: Array.from(selectedUsers),
              });
            }
          }}
        >
          <Send className="mr-2 h-4 w-4" />
          {allocateMutation.isPending
            ? "Allocating..."
            : `Allocate to ${selectedUsers.size} Employee${selectedUsers.size !== 1 ? "s" : ""}`}
        </Button>
      </div>
    </AdminLayout>
  );
}
