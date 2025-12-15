import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "wouter";
import { api, type HubSpotAccount } from "@/lib/api";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Building2, 
  ChevronRight, 
  LogOut, 
  Loader2, 
  Plus, 
  X,
  Key,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AccountSelectPage() {
  const { user, selectAccount, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [accounts, setAccounts] = useState<HubSpotAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [newApiKey, setNewApiKey] = useState("");
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState<{valid: boolean; accountName?: string} | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
      setLocation("/");
      return;
    }

    fetchAccounts();
  }, [user, setLocation]);

  async function fetchAccounts() {
    if (!user) return;
    try {
      const data = await api.getHubSpotAccounts(user.id);
      setAccounts(data);
    } catch (error) {
      console.error("Error fetching accounts:", error);
    } finally {
      setLoading(false);
    }
  }

  const handleSelect = async (id: string, name: string) => {
    await selectAccount(id, name);
    setLocation("/dashboard");
  };

  const handleValidateApiKey = async () => {
    if (!newApiKey.trim()) return;
    
    setValidating(true);
    setValidation(null);
    
    try {
      const result = await api.validateHubSpotApiKey(newApiKey);
      setValidation(result);
      
      if (result.valid && result.accountName && !newAccountName) {
        setNewAccountName(result.accountName);
      }
    } catch (error) {
      setValidation({ valid: false });
      toast({
        title: "Validation Failed",
        description: "Could not validate the API key. Please check and try again.",
        variant: "destructive"
      });
    } finally {
      setValidating(false);
    }
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newAccountName.trim() || !newApiKey.trim()) return;
    
    setAdding(true);
    
    try {
      const result = await api.addHubSpotAccount(user.id, newAccountName, newApiKey);
      
      toast({
        title: "Account Added",
        description: `Successfully connected to ${result.accountName || newAccountName}`,
      });
      
      setNewAccountName("");
      setNewApiKey("");
      setValidation(null);
      setShowAddForm(false);
      
      await fetchAccounts();
    } catch (error: any) {
      toast({
        title: "Failed to Add Account",
        description: error.message || "Could not add the HubSpot account. Please check your API key.",
        variant: "destructive"
      });
    } finally {
      setAdding(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen w-full bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-center mb-8"
        >
          <div>
            <h1 className="text-2xl font-display font-bold">Select Account</h1>
            <p className="text-muted-foreground">Choose a HubSpot account to analyze</p>
          </div>
          <Button variant="ghost" onClick={() => { logout(); setLocation("/"); }} size="sm">
            <LogOut className="w-4 h-4 mr-2" />
            Sign out
          </Button>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {accounts.length === 0 && !showAddForm ? (
              <div className="text-center py-12">
                <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No HubSpot Accounts</h3>
                <p className="text-muted-foreground mb-6">
                  Add your first HubSpot account to get started
                </p>
                <Button onClick={() => setShowAddForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add HubSpot Account
                </Button>
              </div>
            ) : (
              <>
                <div className="grid gap-4">
                  {accounts.map((account, index) => (
                    <motion.div
                      key={account.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card 
                        className="group hover:border-primary/50 transition-all cursor-pointer hover:shadow-md"
                        onClick={() => handleSelect(account.id, account.name)}
                        data-testid={`card-account-${account.id}`}
                      >
                        <div className="flex items-center p-6">
                          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mr-4 group-hover:scale-105 transition-transform">
                            <Building2 className="w-6 h-6" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">{account.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {account.portalId ? `Portal ID: ${account.portalId}` : 'HubSpot Account'}
                            </p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>

                {!showAddForm && (
                  <Button 
                    variant="outline" 
                    className="w-full mt-4"
                    onClick={() => setShowAddForm(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Another Account
                  </Button>
                )}
              </>
            )}

            {showAddForm && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-semibold">Add HubSpot Account</h3>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => {
                        setShowAddForm(false);
                        setNewAccountName("");
                        setNewApiKey("");
                        setValidation(null);
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  <form onSubmit={handleAddAccount} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="apiKey">HubSpot Private App Access Token</Label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="apiKey"
                            type="password"
                            placeholder="pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                            value={newApiKey}
                            onChange={(e) => {
                              setNewApiKey(e.target.value);
                              setValidation(null);
                            }}
                            className="pl-10"
                            data-testid="input-api-key"
                          />
                        </div>
                        <Button 
                          type="button"
                          variant="outline"
                          onClick={handleValidateApiKey}
                          disabled={validating || !newApiKey.trim()}
                        >
                          {validating ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            "Validate"
                          )}
                        </Button>
                      </div>
                      {validation && (
                        <div className={`flex items-center gap-2 text-sm ${validation.valid ? 'text-green-600' : 'text-red-600'}`}>
                          {validation.valid ? (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Valid API key - {validation.accountName}</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-4 h-4" />
                              <span>Invalid API key</span>
                            </>
                          )}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Create a Private App in HubSpot Settings → Integrations → Private Apps
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="accountName">Account Name</Label>
                      <Input
                        id="accountName"
                        placeholder="e.g., Acme Corp, Client XYZ"
                        value={newAccountName}
                        onChange={(e) => setNewAccountName(e.target.value)}
                        data-testid="input-account-name"
                      />
                      <p className="text-xs text-muted-foreground">
                        A friendly name to identify this HubSpot account
                      </p>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => {
                          setShowAddForm(false);
                          setNewAccountName("");
                          setNewApiKey("");
                          setValidation(null);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        className="flex-1"
                        disabled={adding || !newAccountName.trim() || !newApiKey.trim()}
                        data-testid="button-add-account"
                      >
                        {adding ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Adding...
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Account
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </Card>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
