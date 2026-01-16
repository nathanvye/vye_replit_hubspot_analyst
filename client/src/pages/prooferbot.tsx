import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "wouter";
import { api, type ProoferbotEmail, type ProoferbotAnalysisResult } from "@/lib/api";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  ArrowLeft,
  Search,
  Mail,
  CheckSquare,
  XSquare,
  Sparkles,
  Loader2,
  Copy,
  Check,
  AlertTriangle,
  X,
  BrainCircuit,
  Database,
  LogOut,
  Menu,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function validateTablesOnly(output: string): boolean {
  const lines = output.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    
    if (trimmed.startsWith('|') || trimmed.endsWith('|')) continue;
    
    if (/^Email\s+[A-Z]\s*[—\-–]/.test(trimmed)) continue;
    
    if (/^(Subject line|Cross-email|Fix table)/i.test(trimmed)) continue;
    
    if (/^[-=|:]+$/.test(trimmed)) continue;
    
    if (trimmed.includes('|')) continue;
    
    if (/^[A-Z]\s*[—\-–]\s*(Fix table|fix table)/i.test(trimmed)) continue;
    
    if (/^(Email|table|consistency)/i.test(trimmed) && trimmed.length < 40) continue;
    
    return false;
  }
  return true;
}

export default function ProoferbotPage() {
  const { user, selectedAccount, selectedAccountName, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [emails, setEmails] = useState<ProoferbotEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<ProoferbotAnalysisResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!user || !selectedAccount) {
      setLocation("/");
    }
  }, [user, selectedAccount, setLocation]);

  useEffect(() => {
    if (selectedAccount) {
      loadEmails();
    }
  }, [selectedAccount]);

  async function loadEmails() {
    if (!selectedAccount) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getProoferbotEmails(selectedAccount);
      setEmails(data);
    } catch (err: any) {
      setError(err.message || "Failed to load emails");
    } finally {
      setLoading(false);
    }
  }

  const filteredEmails = useMemo(() => {
    if (!searchQuery.trim()) return emails;
    const q = searchQuery.toLowerCase();
    return emails.filter(
      e => e.name.toLowerCase().includes(q) || 
           e.subject.toLowerCase().includes(q) ||
           (e.previewText && e.previewText.toLowerCase().includes(q))
    );
  }, [emails, searchQuery]);

  const selectedEmails = useMemo(() => {
    return emails.filter(e => selectedIds.has(e.id));
  }, [emails, selectedIds]);

  function toggleSelect(id: string) {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  }

  function selectAll() {
    const newSet = new Set(selectedIds);
    for (const email of filteredEmails) {
      newSet.add(email.id);
    }
    setSelectedIds(newSet);
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  function removeFromSelection(id: string) {
    const newSet = new Set(selectedIds);
    newSet.delete(id);
    setSelectedIds(newSet);
  }

  async function handleAnalyze() {
    if (!selectedAccount || selectedIds.size === 0) return;
    setAnalyzing(true);
    setResult(null);
    setShowDebug(false);
    try {
      const data = await api.analyzeEmails(selectedAccount, Array.from(selectedIds));
      setResult(data);
      if (!validateTablesOnly(data.output)) {
        setShowDebug(true);
        toast({
          title: "Format Warning",
          description: "The AI output may contain paragraphs instead of tables only.",
          variant: "destructive"
        });
      }
    } catch (err: any) {
      toast({
        title: "Analysis Failed",
        description: err.message || "Failed to analyze emails",
        variant: "destructive"
      });
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleCopy() {
    if (!result?.output) return;
    await navigator.clipboard.writeText(result.output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied to clipboard" });
  }

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
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">Active Account</h3>
          <div className="bg-sidebar-accent/50 rounded-lg p-3 border border-sidebar-border">
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-4 h-4 text-primary" />
              <span className="font-medium text-sm">{selectedAccountName || "Loading..."}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Connected
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">Navigation</h3>
          <div className="space-y-1">
            <Button 
              variant="ghost" 
              className="w-full justify-start text-sm h-9"
              onClick={() => { setLocation("/dashboard"); setIsSidebarOpen(false); }}
              data-testid="button-dashboard"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
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

  const isValidFormat = result ? validateTablesOnly(result.output) : true;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside className={`
        fixed md:static inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <Sidebar />
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border flex items-center justify-between px-4 md:px-6 bg-background/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsSidebarOpen(true)}>
              <Menu className="w-5 h-5" />
            </Button>
            <Mail className="w-6 h-6 text-primary" />
            <h2 className="text-lg font-semibold">ProoferBot</h2>
          </div>
        </header>

        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
          <div className="flex-1 flex flex-col border-r border-border min-h-0">
            <div className="p-4 border-b border-border space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or subject..."
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAll} data-testid="button-select-all">
                  <CheckSquare className="w-4 h-4 mr-1" />
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={clearSelection} data-testid="button-clear-selection">
                  <XSquare className="w-4 h-4 mr-1" />
                  Clear
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1">
              {loading ? (
                <div className="flex items-center justify-center p-12">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="ml-2 text-muted-foreground">Loading emails...</span>
                </div>
              ) : error ? (
                <div className="p-6 text-center">
                  <AlertTriangle className="w-8 h-8 text-destructive mx-auto mb-2" />
                  <p className="text-destructive">{error}</p>
                  <Button variant="outline" className="mt-4" onClick={loadEmails}>
                    Retry
                  </Button>
                </div>
              ) : filteredEmails.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  {searchQuery ? "No emails match your search" : "No marketing emails found"}
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredEmails.map(email => (
                    <div 
                      key={email.id}
                      className={`p-4 hover:bg-muted/50 cursor-pointer transition-colors ${selectedIds.has(email.id) ? 'bg-primary/5' : ''}`}
                      onClick={() => toggleSelect(email.id)}
                      data-testid={`email-row-${email.id}`}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox 
                          checked={selectedIds.has(email.id)} 
                          onCheckedChange={() => toggleSelect(email.id)}
                          data-testid={`checkbox-email-${email.id}`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{email.name}</p>
                          <p className="text-sm text-muted-foreground truncate">{email.subject || "(No subject)"}</p>
                          {email.previewText && (
                            <p className="text-xs text-muted-foreground/70 truncate mt-1">{email.previewText}</p>
                          )}
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded ${email.state === 'PUBLISHED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {email.state}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          <div className="w-full lg:w-96 flex flex-col border-t lg:border-t-0 border-border bg-muted/30">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold flex items-center gap-2">
                Selected Emails
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full" data-testid="text-selected-count">
                  {selectedIds.size}
                </span>
              </h3>
            </div>

            {selectedEmails.length === 0 ? (
              <div className="flex-1 flex items-center justify-center p-6 text-muted-foreground text-sm">
                Select emails from the list to analyze
              </div>
            ) : (
              <ScrollArea className="flex-1 max-h-48 lg:max-h-none">
                <div className="p-2 space-y-1">
                  {selectedEmails.map(email => (
                    <div 
                      key={email.id}
                      className="flex items-center gap-2 p-2 bg-background rounded border border-border"
                      data-testid={`selected-email-${email.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{email.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{email.subject}</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 shrink-0"
                        onClick={() => removeFromSelection(email.id)}
                        data-testid={`button-remove-${email.id}`}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

            <div className="p-4 border-t border-border">
              <Button 
                className="w-full" 
                size="lg"
                disabled={selectedIds.size === 0 || analyzing}
                onClick={handleAnalyze}
                data-testid="button-analyze"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Analyze {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {result && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="border-t border-border bg-background"
          >
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">Analysis Results</h3>
                {!isValidFormat && (
                  <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Format issue
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleCopy} data-testid="button-copy">
                  {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
                {!isValidFormat && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowDebug(!showDebug)}
                    data-testid="button-toggle-debug"
                  >
                    {showDebug ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
                    Debug
                  </Button>
                )}
              </div>
            </div>

            {!isValidFormat && showDebug && (
              <div className="p-4 bg-yellow-50 border-b border-yellow-200">
                <p className="text-sm text-yellow-800 mb-2">
                  The output contains non-table content. Raw output shown below for debugging.
                </p>
              </div>
            )}

            <ScrollArea className="max-h-[50vh]">
              <div className="p-4">
                <pre className="font-mono text-sm whitespace-pre-wrap bg-muted/50 p-4 rounded-lg border border-border overflow-x-auto" data-testid="text-analysis-output">
                  {result.output}
                </pre>

                {result.failedEmails && result.failedEmails.length > 0 && (
                  <div className="mt-4 p-3 bg-destructive/10 rounded-lg">
                    <p className="text-sm font-medium text-destructive mb-2">Some emails could not be fetched:</p>
                    <ul className="text-sm text-destructive/80 space-y-1">
                      {result.failedEmails.map(fe => (
                        <li key={fe.hubspotId}>Email {fe.emailLabel}: {fe.error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </ScrollArea>
          </motion.div>
        )}
      </main>
    </div>
  );
}
