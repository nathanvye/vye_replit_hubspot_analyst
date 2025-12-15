import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "wouter";
import { api } from "@/lib/api";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ReportView } from "@/components/ReportView";
import { 
  Send, 
  Bot, 
  User as UserIcon, 
  Settings, 
  Database, 
  Sparkles,
  RefreshCw,
  LogOut,
  Menu,
  X,
  BrainCircuit,
  FileText,
  MessageSquare
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const SUGGESTED_PROMPTS = [
  "Analyze our deal pipeline",
  "Show recent contacts",
  "What's our revenue this quarter?"
];

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

type ViewMode = "chat" | "report";

export default function DashboardPage() {
  const { user, selectedAccount, selectedAccountName, conversationId, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("chat");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!user || !selectedAccount) {
      setLocation("/");
    }
  }, [user, selectedAccount, setLocation]);

  useEffect(() => {
    if (conversationId) {
      api.getMessages(conversationId).then(existingMessages => {
        setMessages(existingMessages.map(m => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: m.timestamp
        })));
      }).catch(err => console.error("Failed to load messages:", err));
    }
  }, [conversationId]);

  useEffect(() => {
    if (scrollRef.current && viewMode === "chat") {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, viewMode]);

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || !conversationId || !user) return;

    setInputValue("");
    setIsTyping(true);

    try {
      const response = await api.sendMessage(conversationId, content, user.id);
      
      setMessages(prev => [...prev, 
        {
          id: response.userMessage.id,
          role: response.userMessage.role,
          content: response.userMessage.content,
          timestamp: response.userMessage.timestamp
        },
        {
          id: response.assistantMessage.id,
          role: response.assistantMessage.role,
          content: response.assistantMessage.content,
          timestamp: response.assistantMessage.timestamp
        }
      ]);

      if (response.learned) {
        toast({
          title: "Knowledge Base Updated",
          description: "The system has learned from your input.",
        });
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsTyping(false);
    }
  };

  const Sidebar = () => (
    <div className="h-full flex flex-col bg-sidebar border-r border-sidebar-border text-sidebar-foreground">
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-2 text-primary font-display font-bold text-xl">
          <BrainCircuit className="w-6 h-6" />
          <span>Vye Intel</span>
        </div>
      </div>

      <div className="flex-1 py-6 px-4 space-y-6">
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">Current Context</h3>
          <div className="bg-sidebar-accent/50 rounded-lg p-3 border border-sidebar-border">
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-4 h-4 text-primary" />
              <span className="font-medium text-sm">{selectedAccountName || "Loading..."}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Connected & Syncing
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">Navigation</h3>
          <div className="space-y-1">
            <Button 
              variant={viewMode === "chat" ? "secondary" : "ghost"} 
              className="w-full justify-start text-sm h-9"
              onClick={() => { setViewMode("chat"); setIsSidebarOpen(false); }}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Chat Analysis
            </Button>
            <Button 
              variant={viewMode === "report" ? "secondary" : "ghost"} 
              className="w-full justify-start text-sm h-9"
              onClick={() => { setViewMode("report"); setIsSidebarOpen(false); }}
            >
              <FileText className="w-4 h-4 mr-2" />
              Generated Reports
            </Button>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">History</h3>
          <div className="space-y-1">
            {["Q4 Revenue Analysis", "Deal Pipeline Review", "Training: Custom Fields"].map((item, i) => (
              <Button key={i} variant="ghost" className="w-full justify-start text-sm h-9 font-normal truncate">
                {item}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 mb-4 px-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/20 text-primary">
              {user?.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
        <Button variant="outline" className="w-full justify-start text-muted-foreground" onClick={() => { logout(); setLocation("/"); }}>
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <Sidebar />
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 border-b border-border flex items-center justify-between px-4 md:px-6 bg-background/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsSidebarOpen(true)}>
              <Menu className="w-5 h-5" />
            </Button>
            <h2 className="text-lg font-semibold">{selectedAccountName}</h2>
          </div>
          <div className="flex items-center gap-2">
             <Button variant="outline" size="sm" className="hidden sm:flex">
               <Settings className="w-4 h-4 mr-2" /> Settings
             </Button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden relative flex flex-col">
          {viewMode === "report" ? (
            <ScrollArea className="flex-1">
              <ReportView />
            </ScrollArea>
          ) : (
            <>
              <ScrollArea className="flex-1 p-4 md:p-6" ref={scrollRef}>
                 <div className="max-w-3xl mx-auto space-y-6 pb-4">
                   {messages.map((msg) => (
                     <motion.div 
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                     >
                       {msg.role === 'assistant' && (
                         <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                           <Bot className="w-5 h-5 text-primary" />
                         </div>
                       )}
                       
                       <div className={`
                          max-w-[85%] rounded-2xl p-4 shadow-sm
                          ${msg.role === 'user' 
                            ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                            : 'bg-card border border-border rounded-tl-sm text-foreground'}
                       `}>
                         <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                       </div>
    
                       {msg.role === 'user' && (
                         <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-1">
                           <UserIcon className="w-5 h-5 text-secondary-foreground" />
                         </div>
                       )}
                     </motion.div>
                   ))}
                   
                   {isTyping && (
                     <motion.div 
                       initial={{ opacity: 0 }} 
                       animate={{ opacity: 1 }}
                       className="flex gap-4"
                     >
                       <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                         <Sparkles className="w-4 h-4 text-primary animate-spin" />
                       </div>
                       <div className="bg-card border border-border rounded-2xl rounded-tl-sm p-4 shadow-sm">
                         <div className="flex gap-1">
                           <span className="w-2 h-2 bg-muted-foreground/30 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                           <span className="w-2 h-2 bg-muted-foreground/30 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                           <span className="w-2 h-2 bg-muted-foreground/30 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                         </div>
                       </div>
                     </motion.div>
                   )}
                 </div>
              </ScrollArea>
    
              {/* Input Area */}
              <div className="p-4 md:p-6 bg-background/80 backdrop-blur border-t border-border">
                <div className="max-w-3xl mx-auto">
                  {messages.length < 3 && (
                    <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
                      {SUGGESTED_PROMPTS.map((prompt, i) => (
                        <Button 
                          key={i} 
                          variant="outline" 
                          size="sm" 
                          className="whitespace-nowrap rounded-full bg-background hover:bg-muted/50 text-xs"
                          onClick={() => handleSendMessage(prompt)}
                        >
                          {prompt}
                        </Button>
                      ))}
                    </div>
                  )}
                  
                  <form 
                    onSubmit={(e) => { e.preventDefault(); handleSendMessage(inputValue); }}
                    className="relative flex items-center gap-2"
                  >
                    <Input
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder="Ask about your data, or train me on new terms..."
                      className="pr-12 py-6 rounded-xl shadow-sm border-muted-foreground/20 focus-visible:ring-primary/20"
                      disabled={isTyping}
                      autoFocus
                    />
                    <Button 
                      type="submit" 
                      size="icon" 
                      className="absolute right-2 h-8 w-8 rounded-lg" 
                      disabled={!inputValue.trim() || isTyping}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </form>
                  <div className="text-center mt-2">
                    <p className="text-[10px] text-muted-foreground">
                      AI can make mistakes. Please verify important information.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
