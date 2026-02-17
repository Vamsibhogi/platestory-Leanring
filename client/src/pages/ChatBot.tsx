import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import { Bot, Send, Sparkles, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Streamdown } from "streamdown";

export default function ChatBot() {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const history = trpc.chat.history.useQuery(undefined, { enabled: !!user });
  const utils = trpc.useUtils();

  const sendMutation = trpc.chat.send.useMutation({
    onSuccess: () => {
      utils.chat.history.invalidate();
    },
  });

  const handleSend = () => {
    if (!message.trim() || sendMutation.isPending) return;
    sendMutation.mutate({ message: message.trim() });
    setMessage("");
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history.data, sendMutation.isPending]);

  return (
    <AppLayout>
      <div className="container py-6">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-1">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center shadow-md">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-serif font-semibold">PlateBot</h1>
                <p className="text-xs text-muted-foreground">Your AI learning assistant</p>
              </div>
            </div>
          </div>

          <Card className="border-border/50 h-[calc(100vh-240px)] flex flex-col">
            {/* Messages */}
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              <div className="space-y-4">
                {/* Welcome message */}
                {(history.data?.length ?? 0) === 0 && !sendMutation.isPending && (
                  <div className="text-center py-12">
                    <Sparkles className="h-10 w-10 text-primary/30 mx-auto mb-4" />
                    <h2 className="font-semibold mb-2">Hi {user?.name?.split(" ")[0] ?? "there"}!</h2>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                      I'm PlateBot, your AI learning assistant. Ask me anything about your courses,
                      get study recommendations, or just chat about what you're learning.
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center mt-6">
                      {["What should I learn next?", "Explain a concept", "Help me study"].map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => {
                            setMessage(suggestion);
                          }}
                          className="px-3 py-1.5 rounded-full border border-primary/20 text-xs hover:bg-primary/5 hover:border-primary/40 transition-colors text-primary"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {history.data?.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {msg.role === "assistant" && (
                      <Avatar className="h-8 w-8 shrink-0 border">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          <Bot className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-muted rounded-bl-md"
                      }`}
                    >
                      {msg.role === "assistant" ? (
                        <div className="prose prose-sm max-w-none [&>p]:mb-2 [&>p:last-child]:mb-0">
                          <Streamdown>{msg.content}</Streamdown>
                        </div>
                      ) : (
                        msg.content
                      )}
                    </div>
                    {msg.role === "user" && (
                      <Avatar className="h-8 w-8 shrink-0 border">
                        <AvatarFallback className="bg-accent text-xs">
                          {user?.name?.charAt(0).toUpperCase() ?? "U"}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}

                {sendMutation.isPending && (
                  <div className="flex gap-3 justify-start">
                    <Avatar className="h-8 w-8 shrink-0 border">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                      <div className="flex gap-1">
                        <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-4 border-t">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex gap-2"
              >
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Ask PlateBot anything..."
                  className="flex-1"
                  disabled={sendMutation.isPending}
                />
                <Button type="submit" size="icon" disabled={!message.trim() || sendMutation.isPending}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
