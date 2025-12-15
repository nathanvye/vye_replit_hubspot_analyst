import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Lock, Mail, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate network delay
    setTimeout(async () => {
      const success = await login(email);
      setIsLoading(false);

      if (success) {
        toast({
          title: "Welcome back",
          description: "Successfully authenticated with Vye Agency.",
        });
        setLocation("/select-account");
      } else {
        toast({
          variant: "destructive",
          title: "Access Denied",
          description: "Please sign in with a valid @vye.agency email address.",
        });
      }
    }, 1000);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute -top-[30%] -right-[10%] w-[70%] h-[70%] bg-primary/5 rounded-full blur-[100px]" />
        <div className="absolute top-[60%] -left-[10%] w-[50%] h-[50%] bg-purple-500/5 rounded-full blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md px-4"
      >
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-4">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground">Vye Intelligence</h1>
          <p className="text-muted-foreground mt-2">Secure access for agency partners</p>
        </div>

        <Card className="border-border/50 shadow-xl glass-panel">
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>Enter your agency credentials to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@vye.agency"
                    className="pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    data-testid="input-email"
                  />
                </div>
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
                data-testid="button-login"
              >
                {isLoading ? "Authenticating..." : (
                  <span className="flex items-center gap-2">
                    Continue <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center border-t border-border/50 pt-4 mt-2">
            <p className="text-xs text-muted-foreground text-center">
              Restricted access. Authorized personnel only.
            </p>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
