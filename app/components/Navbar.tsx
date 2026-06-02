"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { useToast } from "./Toast";
import { apiRequest } from "../utils/api";
import {
  TrainIcon,
  WalletIcon,
  LogOutIcon,
  UserIcon,
  TicketIcon,
  ShieldIcon,
  MenuIcon,
  CloseIcon,
  PlusIcon,
  MapPinIcon,
  LoaderIcon,
} from "./Icons";

export const Navbar: React.FC = () => {
  const { user, logout, balance, fetchBalance, activeCity, setActiveCity, updateProfile } = useAuth();
  const { showToast } = useToast();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState<string>("100000");

  // Profile modal states
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profName, setProfName] = useState(user?.name || "");
  const [profEmail, setProfEmail] = useState(user?.email || "");
  const [profPhone, setProfPhone] = useState(user?.phone || "");
  const [profCurrentPassword, setProfCurrentPassword] = useState("");
  const [profNewPassword, setProfNewPassword] = useState("");
  const [profConfirmNewPassword, setProfConfirmNewPassword] = useState("");
  const [profileSubmitting, setProfileSubmitting] = useState(false);

  const [selectedAvatar, setSelectedAvatar] = useState<string>("🎒");

  React.useEffect(() => {
    if (user?.id) {
      setSelectedAvatar(localStorage.getItem(`local_user_avatar_${user.id}`) || "🎒");
    }
  }, [user?.id]);

  // Help modal states
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [csContacts, setCsContacts] = useState<any[]>([]);
  const [csLoading, setCsLoading] = useState(false);

  const handleOpenProfile = () => {
    if (user) {
      setProfName(user.name);
      setProfEmail(user.email);
      setProfPhone(user.phone || "");
      setProfCurrentPassword("");
      setProfNewPassword("");
      setProfConfirmNewPassword("");
    }
    setShowProfileModal(true);
  };

  const handleOpenHelp = async () => {
    setShowHelpModal(true);
    setCsLoading(true);
    try {
      const data = await apiRequest<any>("/api/users/cs-contact");
      setCsContacts(Array.isArray(data) ? data : data.contacts || data.data || []);
    } catch (err) {
      // Fallback CS contacts if API fails
      setCsContacts([
        { name: "Layanan Pelanggan Kereta Api", phone: "121", email: "cs@kai.id", transportType: "kereta" },
        { name: "Layanan Pelanggan Penerbangan", phone: "0804-1-807-807", email: "cs@airline.id", transportType: "pesawat" }
      ]);
    } finally {
      setCsLoading(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (profNewPassword && profNewPassword !== profConfirmNewPassword) {
      showToast("Konfirmasi password baru tidak cocok.", "error");
      return;
    }
    if (profNewPassword && !profCurrentPassword) {
      showToast("Masukkan password lama untuk mengubah password.", "error");
      return;
    }

    setProfileSubmitting(true);
    try {
      await updateProfile({
        name: profName,
        email: profEmail,
        phone: profPhone || undefined,
        current_password: profCurrentPassword || undefined,
        new_password: profNewPassword || undefined
      });
      setShowProfileModal(false);
    } catch (err: any) {
      showToast(err.message || "Gagal memperbarui profil.", "error");
    } finally {
      setProfileSubmitting(false);
    }
  };

  const handleTopUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(topUpAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      showToast("Jumlah top up harus valid.", "error");
      return;
    }

    try {
      const stored = localStorage.getItem("mock_topups");
      const list = stored ? JSON.parse(stored) : [];
      list.push({
        amount: amountNum,
        date: new Date().toISOString(),
        description: "Top Up Mandiri (Simulasi)"
      });
      localStorage.setItem("mock_topups", JSON.stringify(list));
      
      showToast(`Top up sebesar ${formatRupiah(amountNum)} berhasil!`, "success");
      setShowTopUpModal(false);
      setTopUpAmount("100000");
      await fetchBalance();
    } catch (err) {
      showToast("Gagal melakukan top up.", "error");
    }
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const isActive = (path: string) => pathname === path;

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin":
        return "Admin";
      case "petugas_kereta":
        return "Petugas Kereta";
      case "petugas_pesawat":
        return "Petugas Pesawat";
      default:
        return "User";
    }
  };

  return (
    <>
      <nav className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:bg-blue-700 transition-all duration-300">
                <TicketIcon size={20} />
              </div>
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                GoTravel
              </span>
            </Link>

            {/* Desktop Navigation Links */}
            {user && (
              <div className="hidden md:flex md:ml-8 items-center gap-2">
                {user.role === "user" ? (
                  <>
                    <Link
                      href="/"
                      className={`inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-300 ${
                        isActive("/")
                          ? "bg-blue-50 text-blue-700 border border-blue-100/40 shadow-inner"
                          : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                      }`}
                    >
                      Cari Tiket
                    </Link>
                    <Link
                      href="/history"
                      className={`inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-300 ${
                        isActive("/history")
                          ? "bg-blue-50 text-blue-700 border border-blue-100/40 shadow-inner"
                          : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                      }`}
                    >
                      Tiket Saya
                    </Link>
                    <button
                      onClick={handleOpenHelp}
                      className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-all cursor-pointer"
                    >
                      Bantuan
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/admin"
                      className={`inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-300 ${
                        pathname.startsWith("/admin")
                          ? "bg-blue-50 text-blue-700 border border-blue-100/40 shadow-inner"
                          : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                      }`}
                    >
                      <ShieldIcon size={12} className="mr-1.5" />
                      Dashboard Kelola
                    </Link>
                    {(user.role === "petugas_kereta" || user.role === "petugas_pesawat") && (
                      <Link
                        href="/boarding"
                        className={`inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-300 ${
                          isActive("/boarding")
                            ? "bg-blue-50 text-blue-700 border border-blue-100/40 shadow-inner"
                            : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                        }`}
                      >
                        Check-In Boarding
                      </Link>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* User Section (Right Side) */}
          <div className="hidden md:flex md:items-center md:gap-4">
            {user ? (
              <>
                {/* City/Station Selector */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold relative hover:bg-slate-100 transition-colors">
                  <MapPinIcon size={14} className="text-blue-600" />
                  <select
                    value={activeCity}
                    onChange={(e) => setActiveCity(e.target.value)}
                    className="bg-transparent border-none text-slate-700 text-xs font-bold focus:outline-none pr-1 cursor-pointer select-none appearance-none"
                    style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
                  >
                    {[
                      ...(user && user.role !== "user" ? ["Semua Kota"] : []),
                      "Jakarta",
                      "Surabaya",
                      "Bandung",
                      "Medan",
                      "Yogyakarta",
                      "Bali",
                      "Makassar",
                      "Semarang"
                    ].map((city) => (
                      <option key={city} value={city} className="text-slate-800 bg-white font-medium">
                        {city}
                      </option>
                    ))}
                  </select>
                  <span className="text-[9px] text-slate-400 pointer-events-none">&#9662;</span>
                </div>

                {/* Balance display for users */}
                {user.role === "user" && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100/50 text-emerald-700 font-bold text-xs shadow-inner">
                      <WalletIcon size={14} className="text-emerald-600" />
                      <span>{formatRupiah(balance)}</span>
                    </div>
                    <button
                      onClick={() => setShowTopUpModal(true)}
                      className="flex items-center justify-center p-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/25 transition-all cursor-pointer duration-300"
                      title="Top Up Saldo"
                    >
                      <PlusIcon size={12} />
                    </button>
                  </div>
                )}

                {/* Profile Badge */}
                <button
                  onClick={handleOpenProfile}
                  className="flex items-center gap-3 pl-2 border-l border-slate-200 hover:opacity-80 transition-all cursor-pointer text-left focus:outline-none"
                  title="Ubah Profil & Ganti Password"
                >
                  <div className="flex flex-col text-right">
                    <span className="text-xs font-black text-slate-800 leading-tight">
                      {user.name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold capitalize">
                      {getRoleLabel(user.role)}
                    </span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-blue-50/50 hover:bg-blue-100/70 border border-blue-200/50 flex items-center justify-center text-sm shadow-sm transition-all">
                    {selectedAvatar}
                  </div>
                </button>

                {/* Logout Button */}
                <button
                  onClick={logout}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                  title="Keluar"
                >
                  <LogOutIcon size={20} />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors"
                >
                  Masuk
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-all shadow-md shadow-blue-500/10"
                >
                  Daftar
                </Link>
              </div>
            )}
          </div>

          {/* Mobile hamburger menu button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 focus:outline-none cursor-pointer"
            >
              {mobileMenuOpen ? <CloseIcon size={24} /> : <MenuIcon size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {user ? (
              <>
                {/* Mobile Active City Selector */}
                <div className="flex items-center justify-between px-3 py-2.5 mb-2 border-b border-slate-100 bg-slate-50/50 rounded-xl">
                  <span className="text-sm font-semibold text-slate-600 flex items-center gap-1.5">
                    <MapPinIcon size={16} className="text-blue-600" />
                    Lokasi Aktif:
                  </span>
                  <select
                    value={activeCity}
                    onChange={(e) => {
                      setActiveCity(e.target.value);
                      setMobileMenuOpen(false);
                    }}
                    className="bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold rounded-xl px-2.5 py-1.5 focus:outline-none cursor-pointer"
                  >
                    {[
                      ...(user && user.role !== "user" ? ["Semua Kota"] : []),
                      "Jakarta",
                      "Surabaya",
                      "Bandung",
                      "Medan",
                      "Yogyakarta",
                      "Bali",
                      "Makassar",
                      "Semarang"
                    ].map((city) => (
                      <option key={city} value={city} className="text-slate-800 bg-white font-medium">
                        {city}
                      </option>
                    ))}
                  </select>
                </div>

                {user.role === "user" ? (
                  <>
                    <Link
                      href="/"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`block px-3 py-2.5 rounded-xl text-base font-medium ${
                        isActive("/")
                          ? "bg-blue-50 text-blue-600"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      Cari Tiket
                    </Link>
                    <Link
                      href="/history"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`block px-3 py-2.5 rounded-xl text-base font-medium ${
                        isActive("/history")
                          ? "bg-blue-50 text-blue-600"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      Tiket Saya
                    </Link>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        handleOpenHelp();
                      }}
                      className="block w-full text-left px-3 py-2.5 rounded-xl text-base font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
                    >
                      Bantuan & CS
                    </button>
                    <div className="flex items-center justify-between px-3 py-3 border-t border-slate-100">
                      <div className="flex items-center gap-2 text-emerald-700 font-semibold text-sm">
                        <WalletIcon size={18} />
                        <span>Saldo: {formatRupiah(balance)}</span>
                      </div>
                      <button
                        onClick={() => {
                          setMobileMenuOpen(false);
                          setShowTopUpModal(true);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer transition-colors"
                      >
                        <PlusIcon size={12} />
                        <span>Top Up</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <Link
                      href="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center px-3 py-2.5 rounded-xl text-base font-medium ${
                        pathname.startsWith("/admin")
                          ? "bg-blue-50 text-blue-600"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <ShieldIcon size={18} className="mr-2" />
                      Dashboard Kelola ({getRoleLabel(user.role)})
                    </Link>
                    {(user.role === "petugas_kereta" || user.role === "petugas_pesawat") && (
                      <Link
                        href="/boarding"
                        onClick={() => setMobileMenuOpen(false)}
                        className={`block px-3 py-2.5 rounded-xl text-base font-medium ${
                          isActive("/boarding")
                            ? "bg-blue-50 text-blue-600"
                            : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        Check-In Boarding
                      </Link>
                    )}
                  </>
                )}

                {/* Profile info on mobile */}
                <div className="pt-4 pb-2 border-t border-slate-200">
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleOpenProfile();
                    }}
                    className="flex w-full items-center px-3 gap-3 hover:bg-slate-50 py-2 rounded-xl text-left cursor-pointer focus:outline-none"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-50/50 border border-blue-200/50 flex items-center justify-center text-xl shadow-sm">
                      {selectedAvatar}
                    </div>
                    <div className="flex-1 flex flex-col">
                      <span className="text-sm font-semibold text-slate-800 flex items-center justify-between">
                        <span>{user.name}</span>
                        <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-bold">Ubah</span>
                      </span>
                      <span className="text-xs text-slate-400">{user.email}</span>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      logout();
                    }}
                    className="mt-3 flex w-full items-center px-3 py-2.5 text-base font-medium text-rose-600 hover:bg-rose-50 rounded-xl cursor-pointer"
                  >
                    <LogOutIcon size={18} className="mr-2" />
                    Keluar
                  </button>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-3 px-3 py-2">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Masuk
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
                >
                  Daftar
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>

    {/* TOP UP MODAL DIALOG */}
      {showTopUpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-sm w-full p-6 animate-scale-in">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <WalletIcon size={20} className="text-emerald-600" />
                <span>Top Up Saldo (Simulasi)</span>
              </h3>
              <button
                onClick={() => setShowTopUpModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-50 transition-all cursor-pointer"
              >
                <CloseIcon size={16} />
              </button>
            </div>

            <form onSubmit={handleTopUpSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Nominal Top Up (Rupiah)
                </label>
                <input
                  type="number"
                  required
                  min="1000"
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  placeholder="Masukkan nominal"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all text-sm text-slate-800 font-semibold"
                />
              </div>

              {/* Quick Select Grid */}
              <div className="grid grid-cols-2 gap-2">
                {[50000, 100000, 200000, 500000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setTopUpAmount(String(amt))}
                    className={`py-2 px-3 border rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      topUpAmount === String(amt)
                        ? "border-emerald-500 bg-emerald-50/50 text-emerald-700"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {formatRupiah(amt)}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-all shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer mt-2 text-sm"
              >
                <WalletIcon size={16} />
                <span>Top Up Sekarang</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* PROFILE SETTINGS & PASSWORD CHANGE MODAL */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-md w-full p-6 animate-scale-in">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserIcon size={20} className="text-blue-600" />
                <span>Pengaturan Profil & Sandi</span>
              </h3>
              <button
                onClick={() => setShowProfileModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-50 transition-all cursor-pointer"
              >
                <CloseIcon size={16} />
              </button>
            </div>

            <form onSubmit={handleProfileSubmit} className="space-y-4">
              {/* Avatar Selector */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Pilih Foto Profil (Avatar)</label>
                <div className="grid grid-cols-8 gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-200/60 shadow-inner">
                  {["🎒", "✈️", "🧑‍✈️", "👨‍✈️", "🏖️", "🚀", "💼", "🗺️"].map((av) => (
                    <button
                      key={av}
                      type="button"
                      onClick={() => {
                        setSelectedAvatar(av);
                        if (typeof window !== "undefined" && user?.id) {
                          localStorage.setItem(`local_user_avatar_${user.id}`, av);
                        }
                      }}
                      className={`h-9 w-9 flex items-center justify-center text-lg rounded-xl transition-all hover:scale-110 cursor-pointer ${
                        selectedAvatar === av
                          ? "bg-blue-600 border border-blue-700 shadow-md text-white scale-105"
                          : "bg-white border border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {av}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={profName}
                  onChange={(e) => setProfName(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 text-sm text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={profEmail}
                    onChange={(e) => setProfEmail(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 text-sm text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">No. HP</label>
                  <input
                    type="text"
                    value={profPhone}
                    onChange={(e) => setProfPhone(e.target.value.replace(/[^0-9]/g, ""))}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 text-sm text-slate-800"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <p className="text-xs font-bold text-slate-700 mb-2">Ganti Kata Sandi (Kosongkan jika tidak ingin mengubah)</p>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Password Lama</label>
                    <input
                      type="password"
                      value={profCurrentPassword}
                      onChange={(e) => setProfCurrentPassword(e.target.value)}
                      placeholder="Masukkan password saat ini"
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 text-sm text-slate-800"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Password Baru</label>
                      <input
                        type="password"
                        value={profNewPassword}
                        onChange={(e) => setProfNewPassword(e.target.value)}
                        placeholder="Minimal 6 karakter"
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 text-sm text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Konfirmasi Baru</label>
                      <input
                        type="password"
                        value={profConfirmNewPassword}
                        onChange={(e) => setProfConfirmNewPassword(e.target.value)}
                        placeholder="Ulangi password"
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 text-sm text-slate-800"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={profileSubmitting}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer text-sm"
              >
                {profileSubmitting ? <LoaderIcon size={16} /> : <span>Simpan Perubahan</span>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOMER SERVICE & HELP DESK CONTACTS MODAL */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-sm w-full p-6 animate-scale-in">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span className="text-lg">📞</span>
                <span>Pusat Bantuan & Kontak CS</span>
              </h3>
              <button
                onClick={() => setShowHelpModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-50 transition-all cursor-pointer"
              >
                <CloseIcon size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                Butuh bantuan terkait tiket Anda? Hubungi unit customer service kami di bawah ini:
              </p>

              {/* Scrollable list container to prevent screen overflow */}
              {csLoading ? (
                <div className="flex justify-center py-6">
                  <LoaderIcon size={24} className="text-blue-600 animate-spin" />
                </div>
              ) : (
                <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                  {csContacts.length > 0 ? (
                    csContacts.map((contact, idx) => (
                      <div key={idx} className="p-3.5 bg-slate-50 border border-slate-200/60 rounded-xl space-y-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-800">{contact.name || "Customer Service"}</h4>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                            contact.transportType === "kereta" ? "bg-orange-50 text-orange-600" : "bg-sky-50 text-sky-600"
                          }`}>
                            {contact.transportType || "Umum"}
                          </span>
                        </div>
                        {contact.phone && (
                          <p className="text-xs text-slate-600 font-semibold">
                            📞 Telepon: <a href={`tel:${contact.phone}`} className="text-blue-600 hover:underline">{contact.phone}</a>
                          </p>
                        )}
                        {contact.email && (
                          <p className="text-xs text-slate-600 font-semibold">
                            ✉️ Email: <a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline">{contact.email}</a>
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-xs text-slate-400 py-4">Kontak bantuan tidak tersedia.</div>
                  )}
                </div>
              )}

              <button
                onClick={() => setShowHelpModal(false)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
