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
  Search,
  Users,
  Target,
  ChevronDown,
  ChevronUp,
  Save
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

interface HubspotList {
  id: string;
  hubspotAccountId: string;
  listId: string;
  listName: string;
  createdAt: string;
}

interface AvailableList {
  listId: string;
  name: string;
  size: number;
}

interface FormGoal {
  id: string;
  formId: string;
  year: number;
  q1Goal: number | null;
  q2Goal: number | null;
  q3Goal: number | null;
  q4Goal: number | null;
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
  
  // Lists state
  const [savedLists, setSavedLists] = useState<HubspotList[]>([]);
  const [availableLists, setAvailableLists] = useState<AvailableList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>("");
  const [isLoadingLists, setIsLoadingLists] = useState(false);
  const [isLoadingAvailableLists, setIsLoadingAvailableLists] = useState(false);
  const [isAddingList, setIsAddingList] = useState(false);
  const [listSearchQuery, setListSearchQuery] = useState<string>("");
  
  // Form Goals state
  const [expandedFormId, setExpandedFormId] = useState<string | null>(null);
  const [formGoals, setFormGoals] = useState<Record<string, FormGoal[]>>({});
  const [selectedGoalYear, setSelectedGoalYear] = useState<number>(new Date().getFullYear());
  const [goalInputs, setGoalInputs] = useState<{ q1: string; q2: string; q3: string; q4: string }>({ q1: "", q2: "", q3: "", q4: "" });
  const [isSavingGoal, setIsSavingGoal] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    if (!user || !selectedAccount) {
      setLocation("/");
      return;
    }
    loadForms();
    loadAvailableForms();
    loadLists();
    loadAvailableLists();
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

  // Lists functions
  const loadLists = async () => {
    if (!selectedAccount) return;
    setIsLoadingLists(true);
    try {
      const response = await fetch(`/api/hubspot/lists/${selectedAccount}`);
      if (response.ok) {
        const data = await response.json();
        setSavedLists(data);
      }
    } catch (error) {
      console.error("Failed to load lists:", error);
    } finally {
      setIsLoadingLists(false);
    }
  };

  const loadAvailableLists = async () => {
    if (!selectedAccount) return;
    setIsLoadingAvailableLists(true);
    try {
      const response = await fetch(`/api/hubspot/available-lists/${selectedAccount}`);
      if (response.ok) {
        const data = await response.json();
        setAvailableLists(data);
      } else {
        toast({
          title: "Warning",
          description: "Could not load lists from HubSpot. You may not have lists access.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Failed to load available lists:", error);
    } finally {
      setIsLoadingAvailableLists(false);
    }
  };

  const handleAddList = async () => {
    if (!selectedListId || !selectedAccount) return;
    
    const list = availableLists.find(l => l.listId === selectedListId);
    if (!list) return;

    if (savedLists.some(l => l.listId === selectedListId)) {
      toast({
        title: "Already Added",
        description: "This list is already in your list.",
        variant: "destructive"
      });
      return;
    }
    
    setIsAddingList(true);
    try {
      const response = await fetch("/api/hubspot/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: selectedAccount,
          listId: selectedListId
        })
      });

      if (response.ok) {
        const newList = await response.json();
        setSavedLists(prev => [newList, ...prev]);
        setSelectedListId("");
        toast({
          title: "List Added",
          description: `"${newList.listName}" has been added successfully.`
        });
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to add list",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add list. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsAddingList(false);
    }
  };

  const handleDeleteList = async (listId: string, listName: string) => {
    try {
      const response = await fetch(`/api/hubspot/lists/${listId}`, {
        method: "DELETE"
      });

      if (response.ok) {
        setSavedLists(prev => prev.filter(l => l.id !== listId));
        toast({
          title: "List Removed",
          description: `"${listName}" has been removed.`
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to remove list",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove list. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Form Goals functions
  const loadFormGoals = async (formId: string) => {
    try {
      const response = await fetch(`/api/form-goals/${formId}`);
      if (response.ok) {
        const goals = await response.json();
        setFormGoals(prev => ({ ...prev, [formId]: goals }));
        return goals;
      }
    } catch (error) {
      console.error("Failed to load form goals:", error);
    }
    return [];
  };

  const handleToggleFormGoals = async (formId: string) => {
    if (expandedFormId === formId) {
      setExpandedFormId(null);
      return;
    }
    
    setExpandedFormId(formId);
    const goals = await loadFormGoals(formId);
    
    // Set goal inputs based on existing goals for current year
    const yearGoal = goals.find((g: FormGoal) => g.year === selectedGoalYear);
    if (yearGoal) {
      setGoalInputs({
        q1: yearGoal.q1Goal?.toString() || "",
        q2: yearGoal.q2Goal?.toString() || "",
        q3: yearGoal.q3Goal?.toString() || "",
        q4: yearGoal.q4Goal?.toString() || ""
      });
    } else {
      setGoalInputs({ q1: "", q2: "", q3: "", q4: "" });
    }
  };

  const handleYearChange = (year: number, formId: string) => {
    setSelectedGoalYear(year);
    const goals = formGoals[formId] || [];
    const yearGoal = goals.find(g => g.year === year);
    if (yearGoal) {
      setGoalInputs({
        q1: yearGoal.q1Goal?.toString() || "",
        q2: yearGoal.q2Goal?.toString() || "",
        q3: yearGoal.q3Goal?.toString() || "",
        q4: yearGoal.q4Goal?.toString() || ""
      });
    } else {
      setGoalInputs({ q1: "", q2: "", q3: "", q4: "" });
    }
  };

  const handleSaveGoals = async (formId: string) => {
    setIsSavingGoal(true);
    try {
      const response = await fetch("/api/form-goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formId,
          year: selectedGoalYear,
          q1Goal: goalInputs.q1 ? parseInt(goalInputs.q1) : 0,
          q2Goal: goalInputs.q2 ? parseInt(goalInputs.q2) : 0,
          q3Goal: goalInputs.q3 ? parseInt(goalInputs.q3) : 0,
          q4Goal: goalInputs.q4 ? parseInt(goalInputs.q4) : 0
        })
      });

      if (response.ok) {
        const savedGoal = await response.json();
        setFormGoals(prev => {
          const existing = prev[formId] || [];
          const updated = existing.filter(g => g.year !== selectedGoalYear);
          return { ...prev, [formId]: [...updated, savedGoal] };
        });
        toast({
          title: "Goals Saved",
          description: `Goals for ${selectedGoalYear} have been saved.`
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to save goals",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save goals. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSavingGoal(false);
    }
  };

  // Generate year options (current year and next 2 years, plus previous year)
  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2];

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

  // Filter out already-added lists from the dropdown
  const unaddedLists = availableLists.filter(
    al => !savedLists.some(sl => sl.listId === al.listId)
  );

  // Filter lists based on search query
  const filteredLists = listSearchQuery.trim() === "" 
    ? unaddedLists 
    : unaddedLists.filter(list => 
        list.name.toLowerCase().includes(listSearchQuery.toLowerCase())
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
              <p className="text-muted-foreground">Configure HubSpot forms and lists for report tracking</p>
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
                        className="bg-muted/50 rounded-lg border overflow-hidden"
                        data-testid={`form-item-${form.id}`}
                      >
                        <div className="flex items-center justify-between p-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate" data-testid={`text-form-name-${form.id}`}>{form.formName}</p>
                            <p className="text-xs text-muted-foreground font-mono truncate">{form.formGuid}</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-muted-foreground hover:text-primary"
                              onClick={() => handleToggleFormGoals(form.id)}
                              data-testid={`button-goals-${form.id}`}
                            >
                              <Target className="w-4 h-4 mr-1" />
                              Goals
                              {expandedFormId === form.id ? (
                                <ChevronUp className="w-4 h-4 ml-1" />
                              ) : (
                                <ChevronDown className="w-4 h-4 ml-1" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground hover:text-destructive"
                              onClick={() => handleDeleteForm(form.id, form.formName)}
                              data-testid={`button-delete-form-${form.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        
                        {expandedFormId === form.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t bg-background/50 p-4"
                          >
                            <div className="space-y-4">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">Year:</span>
                                <Select
                                  value={selectedGoalYear.toString()}
                                  onValueChange={(val) => handleYearChange(parseInt(val), form.id)}
                                >
                                  <SelectTrigger className="w-28" data-testid={`select-year-${form.id}`}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {yearOptions.map(year => (
                                      <SelectItem key={year} value={year.toString()}>
                                        {year}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              <div className="grid grid-cols-4 gap-3">
                                <div>
                                  <label className="text-xs text-muted-foreground mb-1 block">Q1 Goal</label>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={goalInputs.q1}
                                    onChange={(e) => setGoalInputs(prev => ({ ...prev, q1: e.target.value }))}
                                    placeholder="0"
                                    data-testid={`input-q1-${form.id}`}
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-muted-foreground mb-1 block">Q2 Goal</label>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={goalInputs.q2}
                                    onChange={(e) => setGoalInputs(prev => ({ ...prev, q2: e.target.value }))}
                                    placeholder="0"
                                    data-testid={`input-q2-${form.id}`}
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-muted-foreground mb-1 block">Q3 Goal</label>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={goalInputs.q3}
                                    onChange={(e) => setGoalInputs(prev => ({ ...prev, q3: e.target.value }))}
                                    placeholder="0"
                                    data-testid={`input-q3-${form.id}`}
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-muted-foreground mb-1 block">Q4 Goal</label>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={goalInputs.q4}
                                    onChange={(e) => setGoalInputs(prev => ({ ...prev, q4: e.target.value }))}
                                    placeholder="0"
                                    data-testid={`input-q4-${form.id}`}
                                  />
                                </div>
                              </div>
                              
                              <Button
                                onClick={() => handleSaveGoals(form.id)}
                                disabled={isSavingGoal}
                                size="sm"
                                data-testid={`button-save-goals-${form.id}`}
                              >
                                {isSavingGoal ? (
                                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                ) : (
                                  <Save className="w-4 h-4 mr-2" />
                                )}
                                Save Goals
                              </Button>
                            </div>
                          </motion.div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">HubSpot Lists</CardTitle>
                    <CardDescription>
                      Select lists/segments from your HubSpot account to track in reports.
                    </CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={loadAvailableLists}
                    disabled={isLoadingAvailableLists}
                    data-testid="button-refresh-lists"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingAvailableLists ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search lists by name..."
                      value={listSearchQuery}
                      onChange={(e) => setListSearchQuery(e.target.value)}
                      disabled={isLoadingAvailableLists}
                      className="pl-10"
                      data-testid="input-search-lists"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Select 
                    value={selectedListId} 
                    onValueChange={setSelectedListId}
                    disabled={isLoadingAvailableLists || isAddingList}
                  >
                    <SelectTrigger className="flex-1" data-testid="select-list">
                      <SelectValue placeholder={
                        isLoadingAvailableLists 
                          ? "Loading lists..." 
                          : unaddedLists.length === 0 
                            ? "All lists added" 
                            : filteredLists.length === 0
                              ? "No matching lists"
                              : "Select a list"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredLists.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground text-center">
                          No lists found
                        </div>
                      ) : (
                        filteredLists.map(list => (
                          <SelectItem key={list.listId} value={list.listId}>
                            {list.name} ({list.size.toLocaleString()} contacts)
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <Button 
                    onClick={handleAddList} 
                    disabled={!selectedListId || isAddingList}
                    data-testid="button-add-list"
                  >
                    {isAddingList ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                {isLoadingLists ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : savedLists.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No lists added yet</p>
                    <p className="text-sm">Select a list above to get started</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {savedLists.map((list) => (
                      <motion.div
                        key={list.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border"
                        data-testid={`list-item-${list.id}`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate" data-testid={`text-list-name-${list.id}`}>{list.listName}</p>
                          <p className="text-xs text-muted-foreground font-mono truncate">ID: {list.listId}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive shrink-0"
                          onClick={() => handleDeleteList(list.id, list.listName)}
                          data-testid={`button-delete-list-${list.id}`}
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
