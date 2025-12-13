import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from "react";
import { start } from "../api/sessions";

interface SessionContextType {
  sessionId: string;
  setSessionId: (id: string) => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider = ({ children }: { children: ReactNode }) => {
  const [sessionId, setSessionId] = useState<string>("");
  const isInitializing = useRef(false);

  useEffect(() => {
    const initSession = async () => {
      // Prevent double initialization in StrictMode
      if (isInitializing.current || sessionId) return;
      isInitializing.current = true;

      try {
        const data = await start();
        setSessionId(data.session_id);
        console.log("Session initialized:", data.session_id);
      } catch (err) { 
        console.error("Failed to start session:", err);
        isInitializing.current = false; // Reset on error to allow retry
      }
    };

    initSession();
  }, []); // Empty dependency array - only run once on mount

  return (
    <SessionContext.Provider value={{ sessionId, setSessionId }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession must be used within SessionProvider");
  return context;
};