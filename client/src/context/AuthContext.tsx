import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { api } from "@/lib/api";

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  selectedAccount: string | null;
  selectedAccountName: string | null;
  conversationId: string | null;
  login: (email: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
  selectAccount: (accountId: string, accountName: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [selectedAccountName, setSelectedAccountName] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const checkSession = async () => {
    try {
      const response = await fetch("/api/auth/me", {
        credentials: "include",
      });
      const data = await response.json();
      if (data.user) {
        setUser(data.user);
      }
    } catch (error) {
      console.error("Session check error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  const login = async (email: string) => {
    try {
      const { user: loggedInUser } = await api.login(email);
      setUser(loggedInUser);
      return true;
    } catch (error) {
      console.error("Login error:", error);
      return false;
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout error:", error);
    }
    setUser(null);
    setSelectedAccount(null);
    setSelectedAccountName(null);
    setConversationId(null);
  };

  const selectAccount = async (accountId: string, accountName: string) => {
    setSelectedAccount(accountId);
    setSelectedAccountName(accountName);
    
    // Create a new conversation for this account
    if (user) {
      try {
        const conversation = await api.createConversation(user.id, accountId, accountName);
        setConversationId(conversation.id);
      } catch (error) {
        console.error("Error creating conversation:", error);
      }
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated: !!user, 
      isLoading,
      selectedAccount, 
      selectedAccountName,
      conversationId,
      login, 
      logout, 
      checkSession,
      selectAccount 
    }}>
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
