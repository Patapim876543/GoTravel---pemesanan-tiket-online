"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { apiRequest, ApiError } from "../utils/api";
import { useToast } from "../components/Toast";

export type UserRole = "admin" | "petugas_kereta" | "petugas_pesawat" | "user";

export interface UserProfile {
  id: string;
  name: string;
  username: string;
  email: string;
  phone?: string;
  role: UserRole;
  isActive: boolean;
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  balance: number;
  balanceLoading: boolean;
  login: (body: any) => Promise<void>;
  register: (body: any) => Promise<void>;
  logout: () => void;
  updateProfile: (body: any) => Promise<void>;
  fetchBalance: () => Promise<number>;
  activeCity: string;
  setActiveCity: (city: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [balance, setBalance] = useState<number>(0);
  const [balanceLoading, setBalanceLoading] = useState<boolean>(false);
  const [activeCity, setActiveCityState] = useState<string>("Semua Kota");

  const router = useRouter();
  const pathname = usePathname();
  const { showToast } = useToast();

  const setActiveCity = (city: string) => {
    setActiveCityState(city);
    if (typeof window !== "undefined") {
      localStorage.setItem("ticket_app_city", city);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("ticket_app_city");
      if (stored) {
        setActiveCityState(stored);
      } else {
        if (user && user.role !== "user") {
          setActiveCityState("Semua Kota");
        } else {
          setActiveCityState("Jakarta");
        }
      }
    }
  }, [user]);

  const fetchBalance = useCallback(async (): Promise<number> => {
    if (!token || user?.role !== "user") return 0;
    setBalanceLoading(true);
    try {
      const res = await apiRequest<any>("/api/users/balance");
      const baseBalance = Number(res.balance) || 0;

      // Calculate mock orders total price to simulate deduction locally
      // Funds for orders with 'paid' or 'pending_refund' are held (deduced)
      let mockDeduction = 0;
      let mockTopup = 0;
      
      if (typeof window !== "undefined") {
        // 1. Mock ticket deductions
        const storedOrders = localStorage.getItem("mock_orders");
        if (storedOrders) {
          const list = JSON.parse(storedOrders);
          mockDeduction = list
            .filter((ord: any) => ord.status === "paid" || ord.status === "pending_refund")
            .reduce((sum: number, ord: any) => sum + (ord.ticket?.price || 0), 0);
        }

        // 2. Mock topups additions
        const storedTopups = localStorage.getItem("mock_topups");
        if (storedTopups) {
          const list = JSON.parse(storedTopups);
          mockTopup = list.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0);
        }
      }

      const finalBalance = Math.max(0, baseBalance - mockDeduction + mockTopup);
      setBalance(finalBalance);
      return finalBalance;
    } catch (err) {
      console.error("Gagal mengambil saldo:", err);
      return 0;
    } finally {
      setBalanceLoading(false);
    }
  }, [token, user?.role]);

  // Load token and profile on mount
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem("ticket_app_token");
      if (storedToken) {
        setToken(storedToken);
        try {
          // Fetch profile to verify token and load user details
          const profile = await apiRequest<UserProfile>("/api/auth/profile", {
            headers: { Authorization: `Bearer ${storedToken}` },
          });
          setUser(profile);
        } catch (err) {
          console.error("Sesi kedaluwarsa:", err);
          localStorage.removeItem("ticket_app_token");
          setToken(null);
          setUser(null);
          showToast("Sesi masuk Anda telah kedaluwarsa. Silakan login kembali.", "info");
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, [showToast]);

  // Fetch balance if user role is "user"
  useEffect(() => {
    if (user?.role === "user" && token) {
      fetchBalance();
    } else {
      setBalance(0);
    }
  }, [user, token, fetchBalance]);

  // Route protection rules based on role
  useEffect(() => {
    if (loading) return;

    const publicRoutes = ["/", "/login", "/register"];
    const isPublicRoute = publicRoutes.includes(pathname);

    if (!user) {
      // If not logged in and trying to access protected route
      if (!isPublicRoute) {
        router.push("/login");
      }
    } else {
      // If logged in and trying to access login/register
      if (isPublicRoute) {
        if (user.role !== "user") {
          router.replace("/admin");
        } else {
          router.push("/");
        }
      }

      // Admin page protection
      if (pathname.startsWith("/admin")) {
        if (user.role !== "admin" && user.role !== "petugas_kereta" && user.role !== "petugas_pesawat") {
          showToast("Akses ditolak. Halaman khusus Administrator.", "error");
          router.push("/");
        }
      }

      // Boarding page protection: only for petugas_kereta and petugas_pesawat
      if (pathname.startsWith("/boarding")) {
        if (user.role !== "petugas_kereta" && user.role !== "petugas_pesawat") {
          showToast("Akses ditolak. Halaman khusus Petugas Operasional.", "error");
          if (user.role === "admin") {
            router.replace("/admin");
          } else {
            router.replace("/");
          }
        }
      }

      // Redirect staff/admin trying to access user-only pages
      if (user.role !== "user" && !pathname.startsWith("/admin") && !pathname.startsWith("/boarding")) {
        router.replace("/admin");
      }
    }
  }, [user, pathname, loading, router, showToast]);

  const login = async (loginData: any) => {
    try {
      const res = await apiRequest<any>("/api/auth/login", {
        method: "POST",
        body: loginData,
      });

      const accessToken = res.token;
      if (!accessToken) {
        throw new Error("Token tidak diterima dari server.");
      }

      localStorage.setItem("ticket_app_token", accessToken);
      setToken(accessToken);
      setUser(res.user);

      showToast("Selamat datang! Anda berhasil masuk.", "success");
      
      // Redirect based on role
      if (res.user.role === "admin" || res.user.role === "petugas_kereta" || res.user.role === "petugas_pesawat") {
        router.push("/admin");
      } else {
        router.push("/");
      }
    } catch (err) {
      throw err;
    }
  };

  const register = async (registerData: any) => {
    try {
      await apiRequest("/api/auth/register", {
        method: "POST",
        body: registerData,
      });
      showToast("Pendaftaran berhasil! Silakan masuk dengan akun Anda.", "success");
      router.push("/login");
    } catch (err) {
      throw err;
    }
  };

  const logout = useCallback(() => {
    localStorage.removeItem("ticket_app_token");
    setToken(null);
    setUser(null);
    setBalance(0);
    showToast("Anda telah keluar dari aplikasi.", "info");
    router.push("/login");
  }, [router, showToast]);

  const updateProfile = async (profileData: any) => {
    try {
      const updatedProfile = await apiRequest<UserProfile>("/api/auth/profile", {
        method: "PUT",
        body: profileData,
      });
      setUser(updatedProfile);
      showToast("Profil Anda berhasil diperbarui.", "success");
    } catch (err) {
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        balance,
        balanceLoading,
        login,
        register,
        logout,
        updateProfile,
        fetchBalance,
        activeCity,
        setActiveCity,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
