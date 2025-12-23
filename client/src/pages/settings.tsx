import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { 
  ArrowLeft,
  Plus,
  Trash2,
  FileText,
  Loader2,
  BrainCircuit,
  Database,
  LogOut,
  Menu,
  RefreshCw,
  Search
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface HubspotForm {
  id: string;
  hubspotAccountId: string;
  formGuid: string;
  formName: string;
  createdAt: string;
}

interface AvailableForm {
  id: string;
  name: string;
  createdAt: string;
}

export default function SettingsPage() {
  const { user, selectedAccount, selectedAccountName, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [savedForms, setSavedForms] = useState<HubspotForm[]>([]);
  const [availableForms, setAvailableForms] = useState<AvailableForm[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAvailable, setIsLoadingAvailable] = useState(false);
  const [isAddingForm, setIsAddingForm] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    if (!user || !selectedAccount) {
      setLocation("/");
      return;
    }
    loadForms();
    loadAvailableForms();
  }, [user, selectedAccount, setLocation]);

  const loadForms = async () => {
    if (!selectedAccount) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/hubspot/forms/${selectedAccount}`);
      if (response.ok) {
        const data = await response.json();
        setSavedForms(data);
      }
    } catch (error) {
      console.error("Failed to load forms:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAvailableForms = async () => {
    if (!selectedAccount) return;
    setIsLoadingAvailable(true);
    try {
      const response = await fetch(`/api/hubspot/available-forms/${selectedAccount}`);
      if (response.ok) {
        const data = await response.json();
        setAvailableForms(data);
      } else {
        toast({
          title: "Warning",
          description: "Could not load forms from HubSpot. You may not have forms access.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Failed to load available forms:", error);
    } finally {
      setIsLoadingAvailable(false);
    }
  };

  const handleAddForm = async () => {
    if (!selectedFormId || !selectedAccount) return;
    
    const form = availableForms.find(f => f.id === selectedFormId);
    if (!form) return;

    // Check if already added
    if (savedForms.some(f => f.formGuid === selectedFormId)) {
      toast({
        title: "Already Added",
        description: "This form is already in your list.",
        variant: "destructive"
      });
      return;
    }
    
    setIsAddingForm(true);
    try {
      const response = await fetch("/api/hubspot/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: selectedAccount,
          formGuid: selectedFormId
        })
      });

      if (response.ok) {
        const newForm = await response.json();
        setSavedForms(prev => [newForm, ...prev]);
        setSelectedFormId("");
        toast({
          title: "Form Added",
          description: `"${newForm.formName}" has been added successfully.`
        });
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to add form",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add form. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsAddingForm(false);
    }
  };

  const handleDeleteForm = async (formId: string, formName: string) => {
    try {
      const response = await fetch(`/api/hubspot/forms/${formId}`, {
        method: "DELETE"
      });

      if (response.ok) {
        setSavedForms(prev => prev.filter(f => f.id !== formId));
        toast({
          title: "Form Removed",
          description: `"${formName}" has been removed.`
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to remove form",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove form. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Filter out already-added forms from the dropdown
  const unaddedForms = availableForms.filter(
    af => !savedForms.some(sf => sf.formGuid === af.id)
  );

  // Filter forms based on search query
  const filteredForms = searchQuery.trim() === "" 
    ? unaddedForms 
    : unaddedForms.filter(form => 
        form.name.toLowerCase().includes(searchQuery.toLowerCase())
      );

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
              onClick={() => setLocation("/dashboard")}
            >
              <FileText className="w-4 h-4 mr-2" />
              Generated Reports
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
            <Button variant="ghost" size="sm" onClick={() => setLocation("/dashboard")} data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </header>

        <ScrollArea className="flex-1 p-6">
          <div className="max-w-2xl mx-auto space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h1 className="text-2xl font-bold mb-2">Settings</h1>
              <p className="text-muted-foreground">Configure HubSpot forms for report tracking</p>
            </motion.div>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">HubSpot Forms</CardTitle>
                    <CardDescription>
                      Select forms from your HubSpot account to track in reports.
                    </CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={loadAvailableForms}
                    disabled={isLoadingAvailable}
                    data-testid="button-refresh-forms"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingAvailable ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search forms by name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      disabled={isLoadingAvailable}
                      className="pl-10"
                      data-testid="input-search-forms"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Select 
                    value={selectedFormId} 
                    onValueChange={setSelectedFormId}
                    disabled={isLoadingAvailable || isAddingForm}
                  >
                    <SelectTrigger className="flex-1" data-testid="select-form">
                      <SelectValue placeholder={
                        isLoadingAvailable 
                          ? "Loading forms..." 
                          : unaddedForms.length === 0 
                            ? "All forms added" 
                            : filteredForms.length === 0
                              ? "No matching forms"
                              : "Select a form"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredForms.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground text-center">
                          No forms found
                        </div>
                      ) : (
                        filteredForms.map(form => (
                          <SelectItem key={form.id} value={form.id}>
                            {form.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <Button 
                    onClick={handleAddForm} 
                    disabled={!selectedFormId || isAddingForm}
                    data-testid="button-add-form"
                  >
                    {isAddingForm ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : savedForms.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No forms added yet</p>
                    <p className="text-sm">Select a form above to get started</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {savedForms.map((form) => (
                      <motion.div
                        key={form.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border"
                        data-testid={`form-item-${form.id}`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate" data-testid={`text-form-name-${form.id}`}>{form.formName}</p>
                          <p className="text-xs text-muted-foreground font-mono truncate">{form.formGuid}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive shrink-0"
                          onClick={() => handleDeleteForm(form.id, form.formName)}
                          data-testid={`button-delete-form-${form.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </main>
    </div>
  );
}
