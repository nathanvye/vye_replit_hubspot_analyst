import { createContext, useContext, useState, ReactNode } from "react";
import { useToast } from "@/hooks/use-toast";

interface User {
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  selectedAccount: string | null;
  login: (email: string) => Promise<boolean>;
  logout: () => void;
  selectAccount: (accountId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const { toast } = useToast();

  const login = async (email: string) => {
    // Mock login logic
    if (email.endsWith("@vye.agency")) {
      setUser({
        email,
        name: email.split("@")[0].split(".").map(n => n.charAt(0).toUpperCase() + n.slice(1)).join(" "),
      });
      return true;
    } else {
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    setSelectedAccount(null);
  };

  const selectAccount = (accountId: string) => {
    setSelectedAccount(accountId);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, selectedAccount, login, logout, selectAccount }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
