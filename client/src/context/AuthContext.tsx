import { createContext, useContext, useState, ReactNode } from "react";
import { api } from "@/lib/api";

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  selectedAccount: string | null;
  selectedAccountName: string | null;
  conversationId: string | null;
  login: (email: string) => Promise<boolean>;
  logout: () => void;
  selectAccount: (accountId: string, accountName: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [selectedAccountName, setSelectedAccountName] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);

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

  const logout = () => {
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
      selectedAccount, 
      selectedAccountName,
      conversationId,
      login, 
      logout, 
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
