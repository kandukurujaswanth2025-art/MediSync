import React, {
  createContext,
  useContext,
  useState,
  useCallback
} from "react";

import {
  currentSession,
  updateSession,
  logout as logoutService,
  loginHospital,
  loginResourceManager,
  loginPatient,
  registerPatient
} from "@/services/authService";

const AppAuthContext = createContext(null);

export function AppAuthProvider({ children }) {
  const [session, setSession] = useState(() => currentSession());

  const refresh = useCallback(() => {
    setSession(currentSession());
  }, []);

  const handleLogin = useCallback(async (fn, ...args) => {
    const s = await fn(...args);
    setSession(s);
    return s;
  }, []);

  const value = {
    session,

    role: session?.role || null,

    isAuthenticated: !!session,

    isHospital: session?.role === "hospital",

    isManager: session?.role === "manager",

    isPatient: session?.role === "patient",

    hospitalId: session?.hospitalId || null,

    patientId: session?.patientId || null,

    selectedHospitalId:
      session?.selectedHospitalId || null,

    loginHospital: (...args) =>
      handleLogin(loginHospital, ...args),

    loginResourceManager: (...args) =>
      handleLogin(loginResourceManager, ...args),

    loginPatient: (...args) =>
      handleLogin(loginPatient, ...args),

    registerPatient: (...args) =>
      handleLogin(registerPatient, ...args),

    selectHospital: (hospitalId) => {
      const next = updateSession({
        selectedHospitalId: hospitalId
      });

      setSession(next);
    },

    logout: async () => {
      await logoutService();
      setSession(null);
    },

    refresh
  };

  return (
    <AppAuthContext.Provider value={value}>
      {children}
    </AppAuthContext.Provider>
  );
}

export function useAppAuth() {
  const ctx = useContext(AppAuthContext);

  if (!ctx) {
    throw new Error(
      "useAppAuth must be used within AppAuthProvider"
    );
  }

  return ctx;
}