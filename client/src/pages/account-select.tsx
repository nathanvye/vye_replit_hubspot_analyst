import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "wouter";
import { api, type HubSpotAccount } from "@/lib/api";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, ChevronRight, LogOut, Loader2 } from "lucide-react";

export default function AccountSelectPage() {
  const { user, selectAccount, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [accounts, setAccounts] = useState<HubSpotAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLocation("/");
      return;
    }

    async function fetchAccounts() {
      try {
        const data = await api.getHubSpotAccounts();
        setAccounts(data);
      } catch (error) {
        console.error("Error fetching accounts:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchAccounts();
  }, [user, setLocation]);

  const handleSelect = async (id: string, name: string) => {
    await selectAccount(id, name);
    setLocation("/dashboard");
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
            <p className="text-muted-foreground">Choose a HubSpot instance to analyze</p>
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
                      <p className="text-sm text-muted-foreground">{account.type}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
