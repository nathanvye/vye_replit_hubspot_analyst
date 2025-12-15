import { useAuth } from "@/context/AuthContext";
import { useLocation } from "wouter";
import { MOCK_ACCOUNTS } from "@/lib/mockData";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, ChevronRight, LogOut } from "lucide-react";

export default function AccountSelectPage() {
  const { user, selectAccount, logout } = useAuth();
  const [, setLocation] = useLocation();

  if (!user) {
    setLocation("/");
    return null;
  }

  const handleSelect = (id: string) => {
    selectAccount(id);
    setLocation("/dashboard");
  };

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

        <div className="grid gap-4">
          {MOCK_ACCOUNTS.map((account, index) => (
            <motion.div
              key={account.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card 
                className="group hover:border-primary/50 transition-all cursor-pointer hover:shadow-md"
                onClick={() => handleSelect(account.id)}
                data-testid={`card-account-${account.id}`}
              >
                <div className="flex items-center p-6">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mr-4 group-hover:scale-105 transition-transform">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{account.name}</h3>
                    <p className="text-sm text-muted-foreground">{account.type} Plan</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
