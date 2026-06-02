"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth, UserRole } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { TicketIcon, UserIcon, ShieldIcon, TrainIcon, PlaneIcon, LoaderIcon } from "../components/Icons";

export default function LoginPage() {
  const { login } = useAuth();
  const { showToast } = useToast();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const inferRole = (uname: string): UserRole => {
    const lowercaseUname = uname.toLowerCase();
    if (lowercaseUname.includes("admin")) return "admin";
    if (lowercaseUname.includes("petugas-kereta") || lowercaseUname.includes("petugas_kereta")) return "petugas_kereta";
    if (lowercaseUname.includes("petugas-pesawat") || lowercaseUname.includes("petugas_pesawat")) return "petugas_pesawat";
    return "user";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      showToast("Username dan password wajib diisi.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const inferredRole = inferRole(username);
      await login({ username, password, role: inferredRole });
    } catch (err: any) {
      showToast(err.message || "Gagal masuk. Periksa kembali akun Anda.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50">
      {/* Left Banner: Premium Visual (Visible on large screens) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-tr from-blue-700 via-indigo-700 to-indigo-900 relative overflow-hidden p-16 flex-col justify-between text-white">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
        
        {/* Top Info */}
        <div className="flex items-center gap-2 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
            <TicketIcon size={22} className="text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">GoTravel</span>
        </div>

        {/* Hero Text */}
        <div className="max-w-md relative z-10 my-auto">
          <h1 className="text-4xl font-extrabold tracking-tight leading-tight mb-4">
            Perjalanan Impian Anda, Hanya Sekali Klik.
          </h1>
          <p className="text-lg text-blue-100/90 leading-relaxed">
            Dapatkan tiket kereta api dan pesawat terbang rute domestik dengan mudah, cepat, dan harga terbaik. Kelola jadwal perjalanan Anda dengan tenang.
          </p>
        </div>

        {/* Footer info */}
        <div className="relative z-10 text-sm text-blue-200/70">
          &copy; {new Date().getFullYear()} GoTravel. All rights reserved.
        </div>
      </div>

      {/* Right Section: Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 lg:p-16">
        <div className="w-full max-w-md bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-100/50 p-8">
          
          {/* Header */}
          <div className="text-center sm:text-left mb-8">
            <div className="flex lg:hidden justify-center sm:justify-start items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white">
                <TicketIcon size={18} />
              </div>
              <span className="text-lg font-bold tracking-tight text-slate-800">GoTravel</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Selamat Datang Kembali</h2>
            <p className="text-sm text-slate-500 mt-1">Silakan masuk menggunakan akun Anda</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Role is automatically detected on submission */}

            {/* Username Input */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username Anda"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm text-slate-800"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Password
                </label>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm text-slate-800 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors text-xs font-medium cursor-pointer"
                >
                  {showPassword ? "Sembunyikan" : "Tampilkan"}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all shadow-lg shadow-blue-500/15 hover:shadow-blue-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <LoaderIcon size={18} />
                  <span>Memverifikasi...</span>
                </>
              ) : (
                <span>Masuk Sekarang</span>
              )}
            </button>
          </form>

          {/* Hint Kredensial Pengujian */}
          <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 text-xs text-slate-600 space-y-2 mt-6 animate-scale-in">
            <p className="font-bold text-slate-700 flex items-center gap-1.5">
              <ShieldIcon size={14} className="text-blue-600" />
              Petunjuk Masuk Kredensial (Role):
            </p>
            <p className="leading-relaxed">
              Hak akses/role akan dideteksi otomatis berdasarkan nama username Anda:
            </p>
            <ul className="space-y-1.5 text-[11px] text-slate-500 list-disc list-inside pl-1">
              <li>
                <span className="font-semibold text-slate-700">Admin:</span> Username harus memiliki kata <code className="bg-slate-200/50 px-1 py-0.5 rounded text-blue-600 font-mono">admin</code> (contoh: <code className="font-mono">bayu-admin</code>)
              </li>
              <li>
                <span className="font-semibold text-slate-700">Petugas Kereta:</span> Username harus memiliki kata <code className="bg-slate-200/50 px-1 py-0.5 rounded text-blue-600 font-mono">petugas-kereta</code> (contoh: <code className="font-mono">bayu-petugas-kereta</code>)
              </li>
              <li>
                <span className="font-semibold text-slate-700">Petugas Pesawat:</span> Username harus memiliki kata <code className="bg-slate-200/50 px-1 py-0.5 rounded text-blue-600 font-mono">petugas-pesawat</code> (contoh: <code className="font-mono">bayu-petugas-pesawat</code>)
              </li>
              <li>
                <span className="font-semibold text-slate-700">User / Penumpang:</span> Username biasa lainnya (contoh: <code className="font-mono">bayu</code>)
              </li>
            </ul>
          </div>

          {/* Bottom link to Register */}
          <div className="text-center mt-6 pt-5 border-t border-slate-100">
            <p className="text-sm text-slate-600">
              Belum punya akun?{" "}
              <Link href="/register" className="font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                Daftar Akun Baru
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
