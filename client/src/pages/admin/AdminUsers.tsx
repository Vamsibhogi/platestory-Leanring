import AdminLayout from "@/components/AdminLayout";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Search, Shield, ShieldOff, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function AdminUsers() {
  const users = trpc.user.list.useQuery();
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");

  const setRoleMutation = trpc.user.setRole.useMutation({
    onSuccess: () => {
      utils.user.list.invalidate();
      toast.success("User role updated!");
    },
    onError: (err) => {
      toast.error(`Failed to update role: ${err.message}`);
    },
  });

  const filtered = users.data?.filter(u =>
    (u.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (u.email ?? "").toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-serif font-semibold mb-1">Users</h1>
        <p className="text-muted-foreground text-sm">{users.data?.length ?? 0} registered users</p>
      </div>

      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users..."
          className="pl-10"
        />
      </div>

      <div className="space-y-2">
        {filtered.map((user) => (
          <Card key={user.id} className="border-border/50">
            <CardContent className="p-4 flex items-center gap-4">
              <Avatar className="h-10 w-10 border shrink-0">
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  {user.name?.charAt(0).toUpperCase() ?? "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{user.name ?? "Unknown"}</p>
                  <Badge variant={user.role === "admin" ? "default" : "secondary"} className="text-[10px] capitalize">
                    {user.role}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">{user.email ?? "No email"}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right text-xs text-muted-foreground">
                  <p>Joined {new Date(user.createdAt).toLocaleDateString()}</p>
                  <p>Last seen {new Date(user.lastSignedIn).toLocaleDateString()}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={setRoleMutation.isPending}
                  onClick={() => {
                    const newRole = user.role === "admin" ? "user" : "admin";
                    if (confirm(`Change ${user.name ?? "this user"}'s role to ${newRole}?`)) {
                      setRoleMutation.mutate({ userId: user.id, role: newRole });
                    }
                  }}
                  title={user.role === "admin" ? "Remove admin" : "Make admin"}
                >
                  {user.role === "admin" ? (
                    <ShieldOff className="h-4 w-4 text-amber-600" />
                  ) : (
                    <Shield className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No users found</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
