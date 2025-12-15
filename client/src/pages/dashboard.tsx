import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "wouter";
import { MOCK_ACCOUNTS, INITIAL_MESSAGES, SUGGESTED_PROMPTS } from "@/lib/mockData";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  BrainCircuit
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export default function DashboardPage() {
  const { user, selectedAccount, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const account = MOCK_ACCOUNTS.find(a => a.id === selectedAccount);

  useEffect(() => {
    if (!user || !selectedAccount) {
      setLocation("/");
    }
  }, [user, selectedAccount, setLocation]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSendMessage = (content: string) => {
    if (!content.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, newMessage]);
    setInputValue("");
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      let responseContent = "I've analyzed the data based on your request. Here are the findings...";
      
      // Basic "Learning" simulation
      if (content.toLowerCase().includes("call") && content.toLowerCase().includes("something else")) {
        responseContent = "Understood. I've updated my knowledge base. In future analyses, I will refer to this deal type using your preferred terminology. My training model has been adjusted for this account.";
        toast({
          title: "Knowledge Base Updated",
          description: "The system has learned a new definition.",
        });
      } else if (content.toLowerCase().includes("analyze")) {
         responseContent = "Based on the Q4 data from HubSpot:\n\n• Deal velocity has increased by 12%\n• Top performing rep is Sarah J.\n• 3 major deals are stuck in negotiation.\n\nWould you like a breakdown of the stalled deals?";
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: responseContent,
        timestamp: new Date().toISOString(),
      };
      
      setMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);
    }, 1500);
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
              <span className="font-medium text-sm">{account?.name || "Loading..."}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Connected & Syncing
            </div>
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
            <h2 className="text-lg font-semibold">{account?.name}</h2>
          </div>
          <div className="flex items-center gap-2">
             <Button variant="outline" size="sm" className="hidden sm:flex">
               <Settings className="w-4 h-4 mr-2" /> Settings
             </Button>
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-hidden relative flex flex-col">
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
        </div>
      </main>
    </div>
  );
}
