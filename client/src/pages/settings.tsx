import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft,
  Plus,
  Trash2,
  FileText,
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
  Save,
  Loader2,
  Building2,
  ExternalLink,
  Star,
  Unplug,
  Briefcase,
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
  const [selectedGoalYear, setSelectedGoalYear] = useState<number>(
    new Date().getFullYear(),
  );
  const [goalInputs, setGoalInputs] = useState<{
    q1: string;
    q2: string;
    q3: string;
    q4: string;
  }>({ q1: "", q2: "", q3: "", q4: "" });
  const [isSavingGoal, setIsSavingGoal] = useState(false);

  // Overall KPI Goals state
  const [editingKpi, setEditingKpi] = useState<string | null>(null);
  const [kpiGoals, setKpiGoals] = useState<Record<string, any>>({});
  const [isSavingKpiGoal, setIsSavingKpiGoal] = useState(false);

  // Deal Display Settings state
  const [showNewDeals, setShowNewDeals] = useState(true);
  const [availablePipelines, setAvailablePipelines] = useState<
    { id: string; label: string }[]
  >([]);
  const [selectedPipelines, setSelectedPipelines] = useState<string[]>([]);
  const [isLoadingPipelines, setIsLoadingPipelines] = useState(false);
  const [isSavingDealSettings, setIsSavingDealSettings] = useState(false);

  // Lifecycle Stage Settings state
  const [lifecycleStageOptions, setLifecycleStageOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [mqlStage, setMqlStage] = useState<string>("");
  const [sqlStage, setSqlStage] = useState<string>("");
  const [isLoadingLifecycleStages, setIsLoadingLifecycleStages] = useState(false);
  const [isSavingLifecycleSettings, setIsSavingLifecycleSettings] = useState(false);

  // Google Analytics config state
  const [gaPropertyId, setGaPropertyId] = useState<string>("");
  const [isSavingGaConfig, setIsSavingGaConfig] = useState(false);
  const [gaConfigured, setGaConfigured] = useState(false);
  const [gaServerConfigured, setGaServerConfigured] = useState<boolean | null>(
    null,
  );

  // Google Business Profile state
  const [gbpConnected, setGbpConnected] = useState(false);
  const [gbpLocationName, setGbpLocationName] = useState<string>("");
  const [gbpServerConfigured, setGbpServerConfigured] = useState<
    boolean | null
  >(null);
  const [isConnectingGbp, setIsConnectingGbp] = useState(false);
  const [isDisconnectingGbp, setIsDisconnectingGbp] = useState(false);
  const [gbpHasTokens, setGbpHasTokens] = useState(false);
  const [gbpAccounts, setGbpAccounts] = useState<
    { name: string; accountName: string; type: string }[]
  >([]);
  const [gbpLocations, setGbpLocations] = useState<
    { name: string; title: string; address: string }[]
  >([]);
  const [selectedGbpAccount, setSelectedGbpAccount] = useState<string>("");
  const [selectedGbpLocation, setSelectedGbpLocation] = useState<string>("");
  const [isLoadingGbpAccounts, setIsLoadingGbpAccounts] = useState(false);
  const [isLoadingGbpLocations, setIsLoadingGbpLocations] = useState(false);
  const [isSavingGbpLocation, setIsSavingGbpLocation] = useState(false);
  // Manual entry state for GBP
  const [gbpIsManualEntry, setGbpIsManualEntry] = useState(false);
  const [gbpShowManualForm, setGbpShowManualForm] = useState(false);
  const [gbpManualData, setGbpManualData] = useState({
    businessName: "",
    averageRating: "",
    totalReviewCount: "",
    businessAddress: "",
    businessPhone: "",
    businessWebsite: "",
    mapsUri: "",
  });
  const [isSavingGbpManual, setIsSavingGbpManual] = useState(false);

  useEffect(() => {
    if (!user || !selectedAccount) {
      setLocation("/");
      return;
    }
    loadForms();
    loadAvailableForms();
    loadLists();
    loadAvailableLists();
    loadKpiGoals();
    loadGaConfig();
    loadGbpConfig();
    loadDealDisplaySettings();
    loadPipelines();
    loadLifecycleStageOptions();
    loadLifecycleStageSettings();
  }, [user, selectedAccount, setLocation]);

  const loadGaConfig = async () => {
    if (!selectedAccount) return;
    try {
      // Check server-level GA configuration
      const statusResponse = await fetch("/api/google-analytics/status");
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        setGaServerConfigured(statusData.configured);
      }

      // Check account-level GA configuration
      const response = await fetch(
        `/api/google-analytics/config/${selectedAccount}`,
      );
      if (response.ok) {
        const data = await response.json();
        if (data && data.propertyId) {
          setGaPropertyId(data.propertyId);
          setGaConfigured(true);
        }
      }
    } catch (error) {
      console.error("Failed to load GA config:", error);
    }
  };

  const handleSaveGaConfig = async () => {
    if (!selectedAccount || !gaPropertyId.trim()) return;
    setIsSavingGaConfig(true);
    try {
      const response = await fetch("/api/google-analytics/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hubspotAccountId: selectedAccount,
          propertyId: gaPropertyId.trim(),
        }),
      });

      if (response.ok) {
        setGaConfigured(true);
        toast({
          title: "Saved",
          description: "Google Analytics configuration saved successfully.",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to save GA configuration",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save GA configuration. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingGaConfig(false);
    }
  };

  const loadGbpConfig = async () => {
    if (!selectedAccount) return;
    try {
      // Check server-level GBP configuration (OAuth credentials)
      const statusResponse = await fetch("/api/google-business-profile/status");
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        setGbpServerConfigured(statusData.configured);
      }

      // Check account-level GBP configuration
      const response = await fetch(
        `/api/google-business-profile/config/${selectedAccount}`,
      );
      if (response.ok) {
        const data = await response.json();
        if (data && data.isManualEntry) {
          // Manual entry mode
          setGbpConnected(true);
          setGbpIsManualEntry(true);
          setGbpLocationName(data.businessName || "Manual Entry");
          setGbpManualData({
            businessName: data.businessName || "",
            averageRating: data.averageRating || "",
            totalReviewCount: data.totalReviewCount || "",
            businessAddress: data.businessAddress || "",
            businessPhone: data.businessPhone || "",
            businessWebsite: data.businessWebsite || "",
            mapsUri: data.mapsUri || "",
          });
        } else if (data && data.connected) {
          setGbpConnected(true);
          setGbpLocationName(data.locationName || "Connected Location");
          setGbpHasTokens(true);
        } else if (data && data.hasTokens) {
          // User has authenticated but hasn't selected a location yet
          setGbpHasTokens(true);
          setGbpConnected(false);
          // Load accounts for selection
          loadGbpAccounts();
        }
      }
    } catch (error) {
      console.error("Failed to load GBP config:", error);
    }
  };

  const loadGbpAccounts = async () => {
    if (!selectedAccount) return;
    setIsLoadingGbpAccounts(true);
    try {
      const response = await fetch(
        `/api/google-business-profile/accounts/${selectedAccount}`,
      );
      if (response.ok) {
        const data = await response.json();
        setGbpAccounts(data.accounts || []);
        // If there's only one account, auto-select it
        if (data.accounts && data.accounts.length === 1) {
          setSelectedGbpAccount(data.accounts[0].name);
          loadGbpLocations(data.accounts[0].name);
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to load Google Business accounts",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to load GBP accounts:", error);
    } finally {
      setIsLoadingGbpAccounts(false);
    }
  };

  const loadGbpLocations = async (accountName: string) => {
    if (!selectedAccount || !accountName) return;
    setIsLoadingGbpLocations(true);
    setGbpLocations([]);
    try {
      // Extract account ID from the full name (e.g., "accounts/123456789")
      const accountId = accountName.replace("accounts/", "");
      const response = await fetch(
        `/api/google-business-profile/locations/${selectedAccount}/${accountId}`,
      );
      if (response.ok) {
        const data = await response.json();
        setGbpLocations(data.locations || []);
        // If there's only one location, auto-select it
        if (data.locations && data.locations.length === 1) {
          setSelectedGbpLocation(data.locations[0].name);
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to load business locations",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to load GBP locations:", error);
    } finally {
      setIsLoadingGbpLocations(false);
    }
  };

  const handleSelectGbpAccount = (accountName: string) => {
    setSelectedGbpAccount(accountName);
    setSelectedGbpLocation("");
    loadGbpLocations(accountName);
  };

  const handleSaveGbpLocation = async () => {
    if (!selectedAccount || !selectedGbpLocation) return;
    setIsSavingGbpLocation(true);
    try {
      const location = gbpLocations.find((l) => l.name === selectedGbpLocation);
      const response = await fetch(
        "/api/google-business-profile/select-location",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            hubspotAccountId: selectedAccount,
            locationId: selectedGbpLocation,
            locationName: location?.title || "Business Location",
          }),
        },
      );

      if (response.ok) {
        setGbpConnected(true);
        setGbpLocationName(location?.title || "Business Location");
        setGbpAccounts([]);
        setGbpLocations([]);
        toast({
          title: "Connected",
          description: "Google Business Profile connected successfully.",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to save location selection",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save location. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingGbpLocation(false);
    }
  };

  const handleConnectGbp = async () => {
    if (!selectedAccount) return;
    setIsConnectingGbp(true);
    try {
      // Redirect to OAuth flow
      window.location.href = `/api/google-business-profile/auth?hubspotAccountId=${selectedAccount}`;
    } catch (error) {
      setIsConnectingGbp(false);
      toast({
        title: "Error",
        description: "Failed to start connection. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDisconnectGbp = async () => {
    if (!selectedAccount) return;
    setIsDisconnectingGbp(true);
    try {
      const response = await fetch(
        `/api/google-business-profile/disconnect/${selectedAccount}`,
        {
          method: "DELETE",
        },
      );

      if (response.ok) {
        setGbpConnected(false);
        setGbpLocationName("");
        setGbpHasTokens(false);
        setGbpAccounts([]);
        setGbpLocations([]);
        setSelectedGbpAccount("");
        setSelectedGbpLocation("");
        setGbpIsManualEntry(false);
        setGbpShowManualForm(false);
        setGbpManualData({
          businessName: "",
          averageRating: "",
          totalReviewCount: "",
          businessAddress: "",
          businessPhone: "",
          businessWebsite: "",
          mapsUri: "",
        });
        toast({
          title: "Disconnected",
          description: "Google Business Profile has been disconnected.",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to disconnect. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to disconnect. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDisconnectingGbp(false);
    }
  };

  const handleSaveGbpManualEntry = async () => {
    if (!selectedAccount) return;
    setIsSavingGbpManual(true);
    try {
      const response = await fetch(
        `/api/google-business-profile/manual-entry/${selectedAccount}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(gbpManualData),
        },
      );

      if (response.ok) {
        setGbpConnected(true);
        setGbpIsManualEntry(true);
        setGbpLocationName(gbpManualData.businessName || "Manual Entry");
        setGbpShowManualForm(false);
        toast({
          title: "Saved",
          description: "Business profile data saved successfully.",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to save business profile data",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save business profile data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingGbpManual(false);
    }
  };

  const loadKpiGoals = async () => {
    if (!selectedAccount) return;
    try {
      const response = await fetch(`/api/kpi-goals/${selectedAccount}`);
      if (response.ok) {
        const data = await response.json();
        const goalsMap: Record<string, any> = {};
        data.forEach((g: any) => {
          goalsMap[`${g.metric}-${g.year}`] = g;
        });
        setKpiGoals(goalsMap);
      }
    } catch (error) {
      console.error("Failed to load KPI goals:", error);
    }
  };

  const handleKpiGoalChange = (
    metric: string,
    year: number,
    quarter: string,
    value: string,
  ) => {
    const key = `${metric}-${year}`;
    setGoalInputs((prev) => ({ ...prev, [quarter]: value }));
  };

  const handleToggleKpiGoals = (metric: string) => {
    if (editingKpi === metric) {
      setEditingKpi(null);
      return;
    }

    setEditingKpi(metric);
    const key = `${metric}-${selectedGoalYear}`;
    const goals = kpiGoals[key];
    if (goals) {
      setGoalInputs({
        q1: goals.q1Goal?.toString() || "",
        q2: goals.q2Goal?.toString() || "",
        q3: goals.q3Goal?.toString() || "",
        q4: goals.q4Goal?.toString() || "",
      });
    } else {
      setGoalInputs({ q1: "", q2: "", q3: "", q4: "" });
    }
  };

  const handleSaveKpiGoals = async (metric: string) => {
    if (!selectedAccount) return;
    setIsSavingKpiGoal(true);
    try {
      const response = await fetch("/api/kpi-goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hubspotAccountId: selectedAccount,
          metric,
          year: selectedGoalYear,
          q1Goal: goalInputs.q1 ? parseInt(goalInputs.q1) : 0,
          q2Goal: goalInputs.q2 ? parseInt(goalInputs.q2) : 0,
          q3Goal: goalInputs.q3 ? parseInt(goalInputs.q3) : 0,
          q4Goal: goalInputs.q4 ? parseInt(goalInputs.q4) : 0,
        }),
      });

      if (response.ok) {
        const savedGoal = await response.json();
        setKpiGoals((prev) => ({
          ...prev,
          [`${metric}-${selectedGoalYear}`]: savedGoal,
        }));
        toast({
          title: "Goals Saved",
          description: `Overall KPI goals for ${metric} (${selectedGoalYear}) have been saved.`,
        });
        setEditingKpi(null);
      } else {
        toast({
          title: "Error",
          description: "Failed to save goals",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save goals. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingKpiGoal(false);
    }
  };

  const kpiMetrics = ["Contacts", "Page Views", "MQLs", "SQLs", "New Deals"];

  const loadDealDisplaySettings = async () => {
    if (!selectedAccount) return;
    try {
      const response = await fetch(
        `/api/deal-display-settings/${selectedAccount}`,
      );
      if (response.ok) {
        const data = await response.json();
        setShowNewDeals(data.showNewDeals === "true");
        setSelectedPipelines(data.selectedPipelines || []);
      }
    } catch (error) {
      console.error("Failed to load deal display settings:", error);
    }
  };

  const loadLifecycleStageOptions = async () => {
    if (!selectedAccount) return;
    setIsLoadingLifecycleStages(true);
    try {
      const response = await fetch(`/api/hubspot/lifecycle-stages/${selectedAccount}`);
      if (response.ok) {
        const data = await response.json();
        setLifecycleStageOptions(data);
      }
    } catch (error) {
      console.error("Failed to load lifecycle stages:", error);
    } finally {
      setIsLoadingLifecycleStages(false);
    }
  };

  const loadLifecycleStageSettings = async () => {
    if (!selectedAccount) return;
    try {
      const response = await fetch(`/api/lifecycle-stage-settings/${selectedAccount}`);
      if (response.ok) {
        const data = await response.json();
        setMqlStage(data.mqlStage || "");
        setSqlStage(data.sqlStage || "");
      }
    } catch (error) {
      console.error("Failed to load lifecycle stage settings:", error);
    }
  };

  const handleSaveLifecycleSettings = async () => {
    if (!selectedAccount) return;
    setIsSavingLifecycleSettings(true);
    try {
      const response = await fetch("/api/lifecycle-stage-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hubspotAccountId: selectedAccount,
          mqlStage: mqlStage || null,
          sqlStage: sqlStage || null,
        }),
      });

      if (response.ok) {
        toast({
          title: "Settings Saved",
          description: "Lifecycle stage settings have been updated.",
        });
      } else {
        throw new Error("Failed to save");
      }
    } catch (error) {
      console.error("Failed to save lifecycle stage settings:", error);
      toast({
        title: "Error",
        description: "Failed to save lifecycle stage settings.",
        variant: "destructive",
      });
    } finally {
      setIsSavingLifecycleSettings(false);
    }
  };

  const loadPipelines = async () => {
    if (!selectedAccount) return;

    setIsLoadingPipelines(true);
    try {
      const response = await fetch(`/api/hubspot/pipelines/${selectedAccount}`);
      if (response.ok) {
        const data = await response.json();
        setAvailablePipelines(data);
      }
    } catch (error) {
      console.error("Failed to load pipelines:", error);
    } finally {
      setIsLoadingPipelines(false);
    }
  };

  const handleSaveDealDisplaySettings = async () => {
    if (!selectedAccount) return;
    setIsSavingDealSettings(true);
    try {
      const response = await fetch("/api/deal-display-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hubspotAccountId: selectedAccount,
          showNewDeals: showNewDeals ? "true" : "false",
          selectedPipelines,
        }),
      });

      if (response.ok) {
        toast({
          title: "Settings Saved",
          description: "Deal display settings have been saved.",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to save deal display settings",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save deal display settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingDealSettings(false);
    }
  };

  const handlePipelineToggle = (pipelineId: string) => {
    setSelectedPipelines((prev) =>
      prev.includes(pipelineId)
        ? prev.filter((id) => id !== pipelineId)
        : [...prev, pipelineId],
    );
  };

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
    loadDealDisplaySettings();
    loadPipelines();
    loadLifecycleStageOptions();
    loadLifecycleStageSettings();
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
      const response = await fetch(
        `/api/hubspot/available-forms/${selectedAccount}`,
      );
      if (response.ok) {
        const data = await response.json();
        setAvailableForms(data);
      } else {
        toast({
          title: "Warning",
          description:
            "Could not load forms from HubSpot. You may not have forms access.",
          variant: "destructive",
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

    const form = availableForms.find((f) => f.id === selectedFormId);
    if (!form) return;

    // Check if already added
    if (savedForms.some((f) => f.formGuid === selectedFormId)) {
      toast({
        title: "Already Added",
        description: "This form is already in your list.",
        variant: "destructive",
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
          formGuid: selectedFormId,
        }),
      });

      if (response.ok) {
        const newForm = await response.json();
        setSavedForms((prev) => [newForm, ...prev]);
        setSelectedFormId("");
        toast({
          title: "Form Added",
          description: `"${newForm.formName}" has been added successfully.`,
        });
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to add form",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add form. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAddingForm(false);
    }
  };

  const handleDeleteForm = async (formId: string, formName: string) => {
    try {
      const response = await fetch(`/api/hubspot/forms/${formId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setSavedForms((prev) => prev.filter((f) => f.id !== formId));
        toast({
          title: "Form Removed",
          description: `"${formName}" has been removed.`,
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to remove form",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove form. Please try again.",
        variant: "destructive",
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
      const response = await fetch(
        `/api/hubspot/available-lists/${selectedAccount}`,
      );
      if (response.ok) {
        const data = await response.json();
        setAvailableLists(data);
      } else {
        toast({
          title: "Warning",
          description:
            "Could not load lists from HubSpot. You may not have lists access.",
          variant: "destructive",
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

    const list = availableLists.find((l) => l.listId === selectedListId);
    if (!list) return;

    if (savedLists.some((l) => l.listId === selectedListId)) {
      toast({
        title: "Already Added",
        description: "This list is already in your list.",
        variant: "destructive",
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
          listId: selectedListId,
        }),
      });

      if (response.ok) {
        const newList = await response.json();
        setSavedLists((prev) => [newList, ...prev]);
        setSelectedListId("");
        toast({
          title: "List Added",
          description: `"${newList.listName}" has been added successfully.`,
        });
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to add list",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add list. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAddingList(false);
    }
  };

  const handleDeleteList = async (listId: string, listName: string) => {
    try {
      const response = await fetch(`/api/hubspot/lists/${listId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setSavedLists((prev) => prev.filter((l) => l.id !== listId));
        toast({
          title: "List Removed",
          description: `"${listName}" has been removed.`,
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to remove list",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove list. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Form Goals functions
  const loadFormGoals = async (formId: string) => {
    try {
      const response = await fetch(`/api/form-goals/${formId}`);
      if (response.ok) {
        const goals = await response.json();
        setFormGoals((prev) => ({ ...prev, [formId]: goals }));
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
        q4: yearGoal.q4Goal?.toString() || "",
      });
    } else {
      setGoalInputs({ q1: "", q2: "", q3: "", q4: "" });
    }
  };

  const handleYearChange = (year: number, sourceId?: string) => {
    setSelectedGoalYear(year);
    // If sourceId is provided, we update inputs for that specific source
    if (sourceId) {
      if (kpiMetrics.includes(sourceId)) {
        // KPI Goal update
        const key = `${sourceId}-${year}`;
        const goals = kpiGoals[key];
        if (goals) {
          setGoalInputs({
            q1: goals.q1Goal?.toString() || "",
            q2: goals.q2Goal?.toString() || "",
            q3: goals.q3Goal?.toString() || "",
            q4: goals.q4Goal?.toString() || "",
          });
        } else {
          setGoalInputs({ q1: "", q2: "", q3: "", q4: "" });
        }
      } else {
        // Form Goal update
        const goals = formGoals[sourceId] || [];
        const yearGoal = goals.find((g: any) => g.year === year);
        if (yearGoal) {
          setGoalInputs({
            q1: yearGoal.q1Goal?.toString() || "",
            q2: yearGoal.q2Goal?.toString() || "",
            q3: yearGoal.q3Goal?.toString() || "",
            q4: yearGoal.q4Goal?.toString() || "",
          });
        } else {
          setGoalInputs({ q1: "", q2: "", q3: "", q4: "" });
        }
      }
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
          q4Goal: goalInputs.q4 ? parseInt(goalInputs.q4) : 0,
        }),
      });

      if (response.ok) {
        const savedGoal = await response.json();
        setFormGoals((prev) => {
          const existing = prev[formId] || [];
          const updated = existing.filter((g) => g.year !== selectedGoalYear);
          return { ...prev, [formId]: [...updated, savedGoal] };
        });
        toast({
          title: "Goals Saved",
          description: `Goals for ${selectedGoalYear} have been saved.`,
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to save goals",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save goals. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingGoal(false);
    }
  };

  // Generate year options (current year and next 2 years, plus previous year)
  const currentYear = new Date().getFullYear();
  const yearOptions = [
    currentYear - 1,
    currentYear,
    currentYear + 1,
    currentYear + 2,
  ];

  // Filter out already-added forms from the dropdown
  const unaddedForms = availableForms.filter(
    (af) => !savedForms.some((sf) => sf.formGuid === af.id),
  );

  // Filter forms based on search query
  const filteredForms =
    searchQuery.trim() === ""
      ? unaddedForms
      : unaddedForms.filter((form) =>
          form.name.toLowerCase().includes(searchQuery.toLowerCase()),
        );

  // Filter out already-added lists from the dropdown
  const unaddedLists = availableLists.filter(
    (al) => !savedLists.some((sl) => sl.listId === al.listId),
  );

  // Filter lists based on search query
  const filteredLists =
    listSearchQuery.trim() === ""
      ? unaddedLists
      : unaddedLists.filter((list) =>
          list.name.toLowerCase().includes(listSearchQuery.toLowerCase()),
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
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">
            Active Account
          </h3>
          <div className="bg-sidebar-accent/50 rounded-lg p-3 border border-sidebar-border">
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-4 h-4 text-primary" />
              <span className="font-medium text-sm">
                {selectedAccountName || "Loading..."}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Connected
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">
            Navigation
          </h3>
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
            <p className="text-xs text-muted-foreground truncate">
              {user?.email}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          className="w-full justify-start text-muted-foreground"
          onClick={() => {
            logout();
            setLocation("/");
          }}
        >
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

      <aside
        className={`
        fixed md:static inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 ease-in-out
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}
      >
        <Sidebar />
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border flex items-center justify-between px-4 md:px-6 bg-background/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/dashboard")}
              data-testid="button-back"
            >
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
              <p className="text-muted-foreground">
                Configure HubSpot forms and lists for report tracking
              </p>
            </motion.div>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Overall KPI Goals</CardTitle>
                    <CardDescription>
                      Set quarterly goals for top-level performance metrics.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  {kpiMetrics.map((metric) => {
                    const key = `${metric}-${selectedGoalYear}`;
                    const goals = kpiGoals[key] || {
                      q1Goal: 0,
                      q2Goal: 0,
                      q3Goal: 0,
                      q4Goal: 0,
                    };
                    const isEditing = editingKpi === metric;
                    const totalGoal =
                      (goals.q1Goal || 0) +
                      (goals.q2Goal || 0) +
                      (goals.q3Goal || 0) +
                      (goals.q4Goal || 0);

                    return (
                      <div
                        key={metric}
                        className="border rounded-lg overflow-hidden"
                      >
                        <div className="flex items-center justify-between p-4 bg-muted/30">
                          <div className="flex items-center gap-3">
                            <Target className="w-5 h-5 text-primary" />
                            <div>
                              <p className="font-medium">{metric}</p>
                              {!isEditing && (
                                <p className="text-xs text-muted-foreground">
                                  Total {selectedGoalYear} Goal:{" "}
                                  {totalGoal.toLocaleString()}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleKpiGoals(metric)}
                              data-testid={`button-toggle-kpi-goals-${metric}`}
                            >
                              {isEditing ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>

                        {isEditing && (
                          <div className="p-4 border-t border-border space-y-4 bg-white">
                            <div className="flex items-center gap-4">
                              <div className="flex-1">
                                <Label className="text-xs">Year</Label>
                                <Select
                                  value={selectedGoalYear.toString()}
                                  onValueChange={(v) =>
                                    handleYearChange(parseInt(v), metric)
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {yearOptions.map((y) => (
                                      <SelectItem key={y} value={y.toString()}>
                                        {y}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label className="text-xs">Q1 Goal</Label>
                                <Input
                                  type="number"
                                  value={goalInputs.q1}
                                  onChange={(e) =>
                                    handleKpiGoalChange(
                                      metric,
                                      selectedGoalYear,
                                      "q1",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="0"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs">Q2 Goal</Label>
                                <Input
                                  type="number"
                                  value={goalInputs.q2}
                                  onChange={(e) =>
                                    handleKpiGoalChange(
                                      metric,
                                      selectedGoalYear,
                                      "q2",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="0"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs">Q3 Goal</Label>
                                <Input
                                  type="number"
                                  value={goalInputs.q3}
                                  onChange={(e) =>
                                    handleKpiGoalChange(
                                      metric,
                                      selectedGoalYear,
                                      "q3",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="0"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs">Q4 Goal</Label>
                                <Input
                                  type="number"
                                  value={goalInputs.q4}
                                  onChange={(e) =>
                                    handleKpiGoalChange(
                                      metric,
                                      selectedGoalYear,
                                      "q4",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="0"
                                />
                              </div>
                            </div>

                            <div className="flex justify-end pt-2">
                              <Button
                                size="sm"
                                onClick={() => handleSaveKpiGoals(metric)}
                                disabled={isSavingKpiGoal}
                              >
                                {isSavingKpiGoal ? (
                                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                ) : (
                                  <Save className="w-4 h-4 mr-2" />
                                )}
                                Save {selectedGoalYear} Goals
                              </Button>
                            </div>
                          </div>
                        )}

                        {!isEditing && totalGoal > 0 && (
                          <div className="px-4 pb-4 grid grid-cols-4 gap-2">
                            <div className="text-[10px] uppercase text-muted-foreground">
                              Q1: {goals.q1Goal?.toLocaleString()}
                            </div>
                            <div className="text-[10px] uppercase text-muted-foreground">
                              Q2: {goals.q2Goal?.toLocaleString()}
                            </div>
                            <div className="text-[10px] uppercase text-muted-foreground">
                              Q3: {goals.q3Goal?.toLocaleString()}
                            </div>
                            <div className="text-[10px] uppercase text-muted-foreground">
                              Q4: {goals.q4Goal?.toLocaleString()}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Briefcase className="w-5 h-5" />
                      Deal Display Settings
                    </CardTitle>
                    <CardDescription>
                      Configure MQL and SQL lifecycle stages for report tracking.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="mql-stage" className="text-sm font-medium">
                          MQLs
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Select which lifecycle stage represents an MQL
                        </p>
                        <Select
                          value={mqlStage}
                          onValueChange={setMqlStage}
                          disabled={isLoadingLifecycleStages}
                        >
                          <SelectTrigger id="mql-stage" className="w-full" data-testid="select-mql-stage">
                            {isLoadingLifecycleStages ? (
                              <div className="flex items-center">
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                Loading...
                              </div>
                            ) : (
                              <SelectValue placeholder="Select MQL stage" />
                            )}
                          </SelectTrigger>
                          <SelectContent>
                            {lifecycleStageOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="sql-stage" className="text-sm font-medium">
                          SQLs
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Select which lifecycle stage represents an SQL
                        </p>
                        <Select
                          value={sqlStage}
                          onValueChange={setSqlStage}
                          disabled={isLoadingLifecycleStages}
                        >
                          <SelectTrigger id="sql-stage" className="w-full" data-testid="select-sql-stage">
                            {isLoadingLifecycleStages ? (
                              <div className="flex items-center">
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                Loading...
                              </div>
                            ) : (
                              <SelectValue placeholder="Select SQL stage" />
                            )}
                          </SelectTrigger>
                          <SelectContent>
                            {lifecycleStageOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSaveLifecycleSettings}
                        disabled={isSavingLifecycleSettings}
                        data-testid="button-save-lifecycle-settings"
                      >
                        {isSavingLifecycleSettings ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Save className="w-4 h-4 mr-2" />
                        )}
                        Save Lifecycle Settings
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-border">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Included Pipelines</Label>
                        <p className="text-xs text-muted-foreground">
                          Filter new deals based on specific pipelines
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                          {isLoadingPipelines ? (
                            <div className="flex items-center text-sm text-muted-foreground">
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                              Loading pipelines...
                            </div>
                          ) : availablePipelines.length > 0 ? (
                            availablePipelines.map((pipeline) => (
                              <div
                                key={pipeline.id}
                                className="flex items-center space-x-2"
                              >
                                <Checkbox
                                  id={`pipeline-${pipeline.id}`}
                                  checked={selectedPipelines.includes(pipeline.id)}
                                  onCheckedChange={() =>
                                    handlePipelineToggle(pipeline.id)
                                  }
                                />
                                <Label
                                  htmlFor={`pipeline-${pipeline.id}`}
                                  className="text-sm font-normal cursor-pointer"
                                >
                                  {pipeline.label}
                                </Label>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-muted-foreground col-span-2 italic">
                              No pipelines found for this account.
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleSaveDealDisplaySettings}
                          disabled={isSavingDealSettings}
                          data-testid="button-save-deal-settings"
                        >
                          {isSavingDealSettings ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : (
                            <Save className="w-4 h-4 mr-2" />
                          )}
                          Save Deal Settings
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Google Analytics</CardTitle>
                    <CardDescription>
                      Connect Google Analytics to track page views and traffic
                      sources.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {gaServerConfigured === false && (
                      <div className="flex items-center gap-2 text-xs text-amber-600">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        Setup Required
                      </div>
                    )}
                    {gaServerConfigured && gaConfigured && (
                      <div className="flex items-center gap-2 text-xs text-green-600">
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        Connected
                      </div>
                    )}
                    {gaServerConfigured && !gaConfigured && (
                      <div className="flex items-center gap-2 text-xs text-blue-600">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        Ready to Configure
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {gaServerConfigured === false && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                    <p className="font-medium mb-2">Service Account Required</p>
                    <p className="text-xs">
                      To enable Google Analytics integration, a service account
                      key needs to be configured. Contact your administrator to
                      set up the GOOGLE_SERVICE_ACCOUNT_KEY.
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="ga-property-id">GA4 Property ID</Label>
                  <div className="flex gap-2">
                    <Input
                      id="ga-property-id"
                      placeholder="e.g., 123456789"
                      value={gaPropertyId}
                      onChange={(e) => setGaPropertyId(e.target.value)}
                      disabled={gaServerConfigured === false}
                      data-testid="input-ga-property-id"
                    />
                    <Button
                      onClick={handleSaveGaConfig}
                      disabled={
                        isSavingGaConfig ||
                        !gaPropertyId.trim() ||
                        gaServerConfigured === false
                      }
                      data-testid="button-save-ga-config"
                    >
                      {isSavingGaConfig ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg space-y-3">
                    <p className="text-sm font-semibold">How to set up:</p>
                    <ol className="text-xs space-y-2 list-decimal ml-4 text-muted-foreground">
                      <li>
                        Log in to{" "}
                        <a
                          href="https://analytics.google.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          analytics.google.com
                        </a>
                      </li>
                      <li>Select the correct GA4 property.</li>
                      <li>
                        Click the ⚙️ <strong>Admin</strong> gear icon
                        (bottom-left).
                      </li>
                      <li>
                        In the Property column, click{" "}
                        <strong>Property Access Management</strong>.
                      </li>
                      <li>
                        Click <strong>+</strong> &gt; <strong>Add users</strong>
                        .
                      </li>
                      <li>
                        Paste:{" "}
                        <code className="bg-muted px-1 py-0.5 rounded text-primary break-all">
                          replit-hubspot-analyst@vye-reports-dashboard.iam.gserviceaccount.com
                        </code>
                      </li>
                      <li>
                        Set role to <strong>Viewer</strong> and click{" "}
                        <strong>Add</strong>.
                      </li>
                      <li>
                        Go to <strong>Property Settings</strong> &gt; Copy the{" "}
                        <strong>Property ID</strong> and paste it above.
                      </li>
                    </ol>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">HubSpot Forms</CardTitle>
                    <CardDescription>
                      Select forms from your HubSpot account to track in
                      reports.
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadAvailableForms}
                    disabled={isLoadingAvailable}
                    data-testid="button-refresh-forms"
                  >
                    <RefreshCw
                      className={`w-4 h-4 mr-2 ${isLoadingAvailable ? "animate-spin" : ""}`}
                    />
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
                      <SelectValue
                        placeholder={
                          isLoadingAvailable
                            ? "Loading forms..."
                            : unaddedForms.length === 0
                              ? "All forms added"
                              : filteredForms.length === 0
                                ? "No matching forms"
                                : "Select a form"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredForms.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground text-center">
                          No forms found
                        </div>
                      ) : (
                        filteredForms.map((form) => (
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
                    <p className="text-sm">
                      Select a form above to get started
                    </p>
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
                            <p
                              className="font-medium truncate"
                              data-testid={`text-form-name-${form.id}`}
                            >
                              {form.formName}
                            </p>
                            <p className="text-xs text-muted-foreground font-mono truncate">
                              {form.formGuid}
                            </p>
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
                              onClick={() =>
                                handleDeleteForm(form.id, form.formName)
                              }
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
                                <span className="text-sm font-medium">
                                  Year:
                                </span>
                                <Select
                                  value={selectedGoalYear.toString()}
                                  onValueChange={(val) =>
                                    handleYearChange(parseInt(val), form.id)
                                  }
                                >
                                  <SelectTrigger
                                    className="w-28"
                                    data-testid={`select-year-${form.id}`}
                                  >
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {yearOptions.map((year) => (
                                      <SelectItem
                                        key={year}
                                        value={year.toString()}
                                      >
                                        {year}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="grid grid-cols-4 gap-3">
                                <div>
                                  <label className="text-xs text-muted-foreground mb-1 block">
                                    Q1 Goal
                                  </label>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={goalInputs.q1}
                                    onChange={(e) =>
                                      setGoalInputs((prev) => ({
                                        ...prev,
                                        q1: e.target.value,
                                      }))
                                    }
                                    placeholder="0"
                                    data-testid={`input-q1-${form.id}`}
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-muted-foreground mb-1 block">
                                    Q2 Goal
                                  </label>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={goalInputs.q2}
                                    onChange={(e) =>
                                      setGoalInputs((prev) => ({
                                        ...prev,
                                        q2: e.target.value,
                                      }))
                                    }
                                    placeholder="0"
                                    data-testid={`input-q2-${form.id}`}
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-muted-foreground mb-1 block">
                                    Q3 Goal
                                  </label>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={goalInputs.q3}
                                    onChange={(e) =>
                                      setGoalInputs((prev) => ({
                                        ...prev,
                                        q3: e.target.value,
                                      }))
                                    }
                                    placeholder="0"
                                    data-testid={`input-q3-${form.id}`}
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-muted-foreground mb-1 block">
                                    Q4 Goal
                                  </label>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={goalInputs.q4}
                                    onChange={(e) =>
                                      setGoalInputs((prev) => ({
                                        ...prev,
                                        q4: e.target.value,
                                      }))
                                    }
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
                      Select lists/segments from your HubSpot account to track
                      in reports.
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadAvailableLists}
                    disabled={isLoadingAvailableLists}
                    data-testid="button-refresh-lists"
                  >
                    <RefreshCw
                      className={`w-4 h-4 mr-2 ${isLoadingAvailableLists ? "animate-spin" : ""}`}
                    />
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
                      <SelectValue
                        placeholder={
                          isLoadingAvailableLists
                            ? "Loading lists..."
                            : unaddedLists.length === 0
                              ? "All lists added"
                              : filteredLists.length === 0
                                ? "No matching lists"
                                : "Select a list"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredLists.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground text-center">
                          No lists found
                        </div>
                      ) : (
                        filteredLists.map((list) => (
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
                    <p className="text-sm">
                      Select a list above to get started
                    </p>
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
                          <p
                            className="font-medium truncate"
                            data-testid={`text-list-name-${list.id}`}
                          >
                            {list.listName}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono truncate">
                            ID: {list.listId}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive shrink-0"
                          onClick={() =>
                            handleDeleteList(list.id, list.listName)
                          }
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

{/* 
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building2 className="w-5 h-5" />
                      Google Business Profile
                    </CardTitle>
                    <CardDescription>
                      Connect your Google Business Profile to include ratings
                      and business details in reports.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {gbpServerConfigured === false && (
                      <div className="flex items-center gap-2 text-xs text-amber-600">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        Setup Required
                      </div>
                    )}
                    {gbpServerConfigured && gbpConnected && (
                      <div className="flex items-center gap-2 text-xs text-green-600">
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        Connected
                      </div>
                    )}
                    {gbpServerConfigured && !gbpConnected && (
                      <div className="flex items-center gap-2 text-xs text-blue-600">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        Ready to Connect
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {gbpServerConfigured === false && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                    <p className="font-medium mb-2">
                      OAuth Credentials Required
                    </p>
                    <p className="text-xs">
                      To enable Google Business Profile integration, OAuth
                      credentials need to be configured. Contact your
                      administrator to set up GBP_CLIENT_ID and
                      GBP_CLIENT_SECRET.
                    </p>
                  </div>
                )}

                {gbpConnected ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                            <Star className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <p className="font-medium text-green-900">
                              {gbpLocationName}
                            </p>
                            <p className="text-xs text-green-700">
                              {gbpIsManualEntry
                                ? "Manual entry"
                                : "Business profile connected"}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {gbpIsManualEntry && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setGbpShowManualForm(true)}
                              data-testid="button-edit-gbp-manual"
                            >
                              Edit
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleDisconnectGbp}
                            disabled={isDisconnectingGbp}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            data-testid="button-disconnect-gbp"
                          >
                            {isDisconnectingGbp ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                              <Unplug className="w-4 h-4 mr-2" />
                            )}
                            {gbpIsManualEntry ? "Clear" : "Disconnect"}
                          </Button>
                        </div>
                      </div>
                    </div>
                    {gbpIsManualEntry && gbpManualData.averageRating && (
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Rating:</span>{" "}
                          <span className="font-medium">
                            {gbpManualData.averageRating} stars
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Reviews:
                          </span>{" "}
                          <span className="font-medium">
                            {gbpManualData.totalReviewCount}
                          </span>
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Your Google Business Profile data (ratings, reviews,
                      business info) will be included in generated reports.
                    </p>
                  </div>
                ) : gbpShowManualForm ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm font-medium text-blue-900 mb-3">
                        Enter Business Profile Data
                      </p>
                      <p className="text-xs text-blue-700 mb-4">
                        Manually enter your Google Business Profile information
                        to include in reports.
                      </p>
                      <div className="space-y-3">
                        <div>
                          <Label className="text-xs text-blue-800 mb-1.5 block">
                            Business Name *
                          </Label>
                          <Input
                            value={gbpManualData.businessName}
                            onChange={(e) =>
                              setGbpManualData((prev) => ({
                                ...prev,
                                businessName: e.target.value,
                              }))
                            }
                            placeholder="Your Business Name"
                            className="bg-white"
                            data-testid="input-gbp-business-name"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs text-blue-800 mb-1.5 block">
                              Average Rating
                            </Label>
                            <Input
                              value={gbpManualData.averageRating}
                              onChange={(e) =>
                                setGbpManualData((prev) => ({
                                  ...prev,
                                  averageRating: e.target.value,
                                }))
                              }
                              placeholder="4.5"
                              type="number"
                              step="0.1"
                              min="1"
                              max="5"
                              className="bg-white"
                              data-testid="input-gbp-rating"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-blue-800 mb-1.5 block">
                              Total Reviews
                            </Label>
                            <Input
                              value={gbpManualData.totalReviewCount}
                              onChange={(e) =>
                                setGbpManualData((prev) => ({
                                  ...prev,
                                  totalReviewCount: e.target.value,
                                }))
                              }
                              placeholder="150"
                              type="number"
                              min="0"
                              className="bg-white"
                              data-testid="input-gbp-reviews"
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs text-blue-800 mb-1.5 block">
                            Address
                          </Label>
                          <Input
                            value={gbpManualData.businessAddress}
                            onChange={(e) =>
                              setGbpManualData((prev) => ({
                                ...prev,
                                businessAddress: e.target.value,
                              }))
                            }
                            placeholder="123 Main St, City, State"
                            className="bg-white"
                            data-testid="input-gbp-address"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs text-blue-800 mb-1.5 block">
                              Phone
                            </Label>
                            <Input
                              value={gbpManualData.businessPhone}
                              onChange={(e) =>
                                setGbpManualData((prev) => ({
                                  ...prev,
                                  businessPhone: e.target.value,
                                }))
                              }
                              placeholder="(555) 123-4567"
                              className="bg-white"
                              data-testid="input-gbp-phone"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-blue-800 mb-1.5 block">
                              Website
                            </Label>
                            <Input
                              value={gbpManualData.businessWebsite}
                              onChange={(e) =>
                                setGbpManualData((prev) => ({
                                  ...prev,
                                  businessWebsite: e.target.value,
                                }))
                              }
                              placeholder="https://example.com"
                              className="bg-white"
                              data-testid="input-gbp-website"
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs text-blue-800 mb-1.5 block">
                            Google Maps Link
                          </Label>
                          <Input
                            value={gbpManualData.mapsUri}
                            onChange={(e) =>
                              setGbpManualData((prev) => ({
                                ...prev,
                                mapsUri: e.target.value,
                              }))
                            }
                            placeholder="https://maps.google.com/..."
                            className="bg-white"
                            data-testid="input-gbp-maps"
                          />
                        </div>
                        <div className="flex gap-2 pt-2">
                          <Button
                            onClick={handleSaveGbpManualEntry}
                            disabled={
                              !gbpManualData.businessName.trim() ||
                              isSavingGbpManual
                            }
                            className="flex-1"
                            data-testid="button-save-gbp-manual"
                          >
                            {isSavingGbpManual ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="w-4 h-4 mr-2" />
                                Save
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setGbpShowManualForm(false)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : gbpHasTokens ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm font-medium text-blue-900 mb-3">
                        Select a Business Location
                      </p>
                      <p className="text-xs text-blue-700 mb-4">
                        You're connected to Google. Now select which business
                        profile to use for reports.
                      </p>

                      <div className="space-y-3">
                        <div>
                          <Label className="text-xs text-blue-800 mb-1.5 block">
                            Google Account
                          </Label>
                          <Select
                            value={selectedGbpAccount}
                            onValueChange={handleSelectGbpAccount}
                            disabled={isLoadingGbpAccounts}
                          >
                            <SelectTrigger
                              className="w-full bg-white"
                              data-testid="select-gbp-account"
                            >
                              <SelectValue
                                placeholder={
                                  isLoadingGbpAccounts
                                    ? "Loading accounts..."
                                    : gbpAccounts.length === 0
                                      ? "No accounts found"
                                      : "Select an account"
                                }
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {gbpAccounts.map((account) => (
                                <SelectItem
                                  key={account.name}
                                  value={account.name}
                                >
                                  {account.accountName ||
                                    account.name.replace(
                                      "accounts/",
                                      "Account ",
                                    )}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {selectedGbpAccount && (
                          <div>
                            <Label className="text-xs text-blue-800 mb-1.5 block">
                              Business Location
                            </Label>
                            <Select
                              value={selectedGbpLocation}
                              onValueChange={setSelectedGbpLocation}
                              disabled={isLoadingGbpLocations}
                            >
                              <SelectTrigger
                                className="w-full bg-white"
                                data-testid="select-gbp-location"
                              >
                                <SelectValue
                                  placeholder={
                                    isLoadingGbpLocations
                                      ? "Loading locations..."
                                      : gbpLocations.length === 0
                                        ? "No locations found"
                                        : "Select a location"
                                  }
                                />
                              </SelectTrigger>
                              <SelectContent>
                                {gbpLocations.map((location) => (
                                  <SelectItem
                                    key={location.name}
                                    value={location.name}
                                  >
                                    <div>
                                      <div className="font-medium">
                                        {location.title}
                                      </div>
                                      {location.address && (
                                        <div className="text-xs text-muted-foreground">
                                          {location.address}
                                        </div>
                                      )}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        <div className="flex gap-2 pt-2">
                          <Button
                            onClick={handleSaveGbpLocation}
                            disabled={
                              !selectedGbpLocation || isSavingGbpLocation
                            }
                            className="flex-1"
                            data-testid="button-save-gbp-location"
                          >
                            {isSavingGbpLocation ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="w-4 h-4 mr-2" />
                                Save Selection
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={handleDisconnectGbp}
                            disabled={isDisconnectingGbp}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            data-testid="button-cancel-gbp"
                          >
                            {isDisconnectingGbp ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              "Cancel"
                            )}
                          </Button>
                        </div>

                        {gbpAccounts.length === 0 && !isLoadingGbpAccounts && (
                          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <p className="text-sm font-medium text-amber-900 mb-2">
                              No accounts found?
                            </p>
                            <p className="text-xs text-amber-700 mb-3">
                              Google Business Profile API may require additional
                              approval. You can enter your business details
                              manually instead.
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                handleDisconnectGbp();
                                setGbpShowManualForm(true);
                              }}
                              className="w-full"
                              data-testid="button-switch-to-manual"
                            >
                              Enter Data Manually
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Button
                      onClick={handleConnectGbp}
                      disabled={
                        isConnectingGbp || gbpServerConfigured === false
                      }
                      className="w-full"
                      data-testid="button-connect-gbp"
                    >
                      {isConnectingGbp ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Connect Google Business Profile
                        </>
                      )}
                    </Button>
                    <div className="p-4 bg-muted/30 rounded-lg space-y-3">
                      <p className="text-sm font-semibold">What you'll need:</p>
                      <ul className="text-xs space-y-2 list-disc ml-4 text-muted-foreground">
                        <li>
                          A Google account with access to your business profile
                        </li>
                        <li>
                          Owner or Manager permissions on the business listing
                        </li>
                        <li>The business must be verified on Google</li>
                      </ul>
                      <p className="text-xs text-muted-foreground mt-3">
                        Clicking "Connect" will redirect you to Google to
                        authorize access. You'll be able to select which
                        business location to connect.
                      </p>
                    </div>
                    <div className="text-center">
                      <span className="text-xs text-muted-foreground">or</span>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setGbpShowManualForm(true)}
                      className="w-full"
                      data-testid="button-manual-entry-gbp"
                    >
                      Enter Business Details Manually
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
            */}
          </div>
        </ScrollArea>
      </main>
    </div>
  );
}
