"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { TicketIcon, LoaderIcon } from "../components/Icons";

export default function RegisterPage() {
  const { register } = useAuth();
  const { showToast } = useToast();

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !username || !email || !password) {
      showToast("Harap isi semua kolom yang wajib.", "error");
      return;
    }

    if (password.length < 6) {
      showToast("Password minimal terdiri dari 6 karakter.", "error");
      return;
    }

    if (password !== confirmPassword) {
      showToast("Konfirmasi password tidak cocok.", "error");
      return;
    }

    setSubmitting(true);
    try {
      await register({
        name,
        username,
        email,
        phone: phone || undefined,
        password,
      });
    } catch (err: any) {
      showToast(err.message || "Gagal melakukan pendaftaran.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50">
      {/* Left Banner: Premium Visual (Visible on large screens) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-700 via-indigo-700 to-indigo-900 relative overflow-hidden p-16 flex-col justify-between text-white">
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
            Mulai Perjalanan Anda Bersama Kami.
          </h1>
          <p className="text-lg text-blue-100/90 leading-relaxed">
            Daftar akun gratis dan nikmati kemudahan memesan tiket kereta api dan penerbangan dengan berbagai keuntungan menarik.
          </p>
        </div>

        {/* Footer info */}
        <div className="relative z-10 text-sm text-blue-200/70">
          &copy; {new Date().getFullYear()} GoTravel. All rights reserved.
        </div>
      </div>

      {/* Right Section: Register Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 lg:p-16">
        <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-100/50 p-8 my-8">
          
          {/* Header */}
          <div className="text-center sm:text-left mb-6">
            <div className="flex lg:hidden justify-center sm:justify-start items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white">
                <TicketIcon size={18} />
              </div>
              <span className="text-lg font-bold tracking-tight text-slate-800">GoTravel</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Daftar Akun Baru</h2>
            <p className="text-sm text-slate-500 mt-1">Buat akun untuk memesan tiket perjalanan Anda</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Nama Lengkap <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Masukkan nama lengkap Anda"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm text-slate-800"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Username */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Username <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ""))}
                  placeholder="Contoh: bayustang"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm text-slate-800"
                />
                {(username.includes("admin") || username.includes("petugas")) && (
                  <span className="text-[10px] text-amber-600 mt-1 block font-semibold">
                    ⚠️ Kata '{username.includes("admin") ? "admin" : "petugas"}' dicadangkan untuk staf internal/admin.
                  </span>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contoh@domain.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm text-slate-800"
                />
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Nomor Telepon (Opsional)
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="Contoh: 081234567890"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm text-slate-800"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Password */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm text-slate-800 pr-10"
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

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Konfirmasi Password <span className="text-rose-500">*</span>
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi password"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm text-slate-800"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all shadow-lg shadow-blue-500/15 hover:shadow-blue-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed mt-2"
            >
              {submitting ? (
                <>
                  <LoaderIcon size={18} />
                  <span>Mendaftarkan...</span>
                </>
              ) : (
                <span>Daftar Akun</span>
              )}
            </button>
          </form>

          {/* Bottom link to Login */}
          <div className="text-center mt-6 pt-5 border-t border-slate-100">
            <p className="text-sm text-slate-600">
              Sudah memiliki akun?{" "}
              <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                Masuk ke Akun Anda
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
