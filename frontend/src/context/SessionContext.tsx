import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { start } from "../api/sessions";

interface SessionContextType {
  sessionId: string;
  setSessionId: (id: string) => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider = ({ children }: { children: ReactNode }) => {
  const [sessionId, setSessionId] = useState<string>("");

  useEffect(() => {
    const initSession = async () => {
      try {
        const data = await start(); // calls your backend /session
        setSessionId(data.session_id);
        console.log("Session initialized:", data.session_id);
      } catch (err) {
        console.error("Failed to start session:", err);
      }
    };

    if (!sessionId) {
      initSession();
    }
  }, [sessionId]);

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