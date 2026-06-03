"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "./context/AuthContext";
import { Navbar } from "./components/Navbar";
import { apiRequest } from "./utils/api";
import { useToast } from "./components/Toast";
import {
  TrainIcon,
  PlaneIcon,
  CalendarIcon,
  UserIcon,
  SwapIcon,
  SearchIcon,
  LoaderIcon,
} from "./components/Icons";

interface RouteItem {
  id: string;
  origin: string;
  destination: string;
  originCode: string;
  destinationCode: string;
  transportType: "kereta" | "pesawat";
}

export default function HomePage() {
  const { user, loading, activeCity } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  // Redirect logged-in admin/staff from homepage to admin panel
  useEffect(() => {
    if (user && user.role !== "user") {
      router.replace("/admin");
    }
  }, [user, router]);

  // Search form states
  const [transportType, setTransportType] = useState<"kereta" | "pesawat">("kereta");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState("");
  const [seatClass, setSeatClass] = useState<"ekonomi" | "vip" | "eksekutif" | "">("");

  // Route suggestion lists
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [routesLoading, setRoutesLoading] = useState(false);

  // Fetch routes from API to provide dropdown suggestions
  useEffect(() => {
    if (!user) return;

    const fetchRoutes = async () => {
      setRoutesLoading(true);
      try {
        const data = await apiRequest<RouteItem[]>("/api/routes");
        setRoutes(data);
      } catch (err) {
        console.error("Gagal memuat rute:", err);
      } finally {
        setRoutesLoading(false);
      }
    };

    fetchRoutes();
  }, [user]);

  // Set default date to tomorrow
  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setDate(tomorrow.toISOString().split("T")[0]);
  }, []);

  // Synchronize origin with activeCity if it's set to a specific city
  useEffect(() => {
    if (activeCity && activeCity !== "Semua Kota") {
      setOrigin(activeCity);
    }
  }, [activeCity]);

  const handleSwap = () => {
    const temp = origin;
    setOrigin(destination);
    setDestination(temp);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!origin || !destination) {
      showToast("Kota asal dan tujuan wajib diisi.", "error");
      return;
    }

    if (origin.toLowerCase() === destination.toLowerCase()) {
      showToast("Kota asal dan tujuan tidak boleh sama.", "error");
      return;
    }

    // Redirect to results page with query params
    const query = new URLSearchParams({
      transport_type: transportType,
      origin,
      destination,
      date,
      ...(seatClass ? { seat_class: seatClass } : {}),
    }).toString();

    router.push(`/tickets?${query}`);
  };

  // Filter routes based on transport type for suggestions
  const activeRoutes = (routes || []).filter((r) => r && r.transportType === transportType);
  const uniqueOrigins = Array.from(new Set(activeRoutes.map((r) => r.origin).filter(Boolean)));
  const uniqueDestinations = Array.from(new Set(activeRoutes.map((r) => r.destination).filter(Boolean)));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <LoaderIcon size={40} className="text-blue-600 animate-spin" />
          <p className="text-slate-500 font-medium text-sm">Memuat aplikasi...</p>
        </div>
      </div>
    );
  }

  // If not logged in, render a premium Travel Agency landing page with background image
  if (!user) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50">
        <Navbar />

        {/* Hero Landing Section */}
        <div
          className="relative min-h-[90vh] flex items-center justify-center py-24 px-4 sm:px-6 lg:px-8 text-center text-white bg-cover bg-center overflow-hidden"
          style={{ backgroundImage: "url('/travel_bg_premium.png')" }}
        >
          {/* Subtle overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-900/60 to-slate-950/90 backdrop-blur-[2px]"></div>
          
          {/* Animated decorative glowing circles */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none"></div>

          <div className="max-w-4xl mx-auto relative z-10 space-y-8">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-blue-300 text-xs font-bold uppercase tracking-widest backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
              🌐 GoTravel
            </span>
            
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black tracking-tight leading-none">
                Jelajahi Indonesia <br className="hidden sm:inline" />
                Tanpa Batas Bersama <span className="bg-gradient-to-r from-blue-400 via-sky-400 to-indigo-400 bg-clip-text text-transparent">GoTravel</span>
              </h1>
              <p className="text-base sm:text-lg lg:text-xl text-slate-200/90 max-w-2xl mx-auto leading-relaxed">
                Platform modern pemesanan tiket kereta api cepat KAI dan penerbangan domestik terlengkap. Proses reservasi instan, aman, dengan fitur pembatalan & refund otomatis.
              </p>
            </div>

            <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
              <Link
                href="/login"
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
              >
                <span>Mulai Cari Tiket</span>
                <span className="text-lg">&rarr;</span>
              </Link>
              <Link
                href="/register"
                className="w-full sm:w-auto px-8 py-4 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold rounded-2xl backdrop-blur-md hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center cursor-pointer text-sm"
              >
                <span>Daftar Akun Baru</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Feature Highlights Section */}
        <div className="bg-white py-24 border-t border-slate-100 no-print relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-slate-50 rounded-full blur-[80px] -z-10"></div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-blue-600 text-xs font-bold uppercase tracking-wider bg-blue-50 px-3 py-1 rounded-full">Layanan Unggulan</span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-800 tracking-tight mt-3">Kenapa Memilih Layanan Kami?</h2>
              <p className="text-slate-500 mt-3 text-sm max-w-md mx-auto leading-relaxed">
                Nikmati kemudahan merencanakan perjalanan kereta dan pesawat Anda dengan teknologi pemesanan tiket terkini.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  icon: "🚂",
                  bgIcon: "bg-orange-50 text-orange-600",
                  title: "Transportasi Terintegrasi",
                  desc: "Pesan tiket kereta api KAI dan penerbangan dari berbagai maskapai ternama dalam satu aplikasi terpadu secara instan."
                },
                {
                  icon: "💳",
                  bgIcon: "bg-emerald-50 text-emerald-600",
                  title: "Dompet Digital & Saldo",
                  desc: "Transaksi pembayaran praktis secara langsung dengan memotong saldo digital Anda yang terenkripsi aman."
                },
                {
                  icon: "🔄",
                  bgIcon: "bg-blue-50 text-blue-600",
                  title: "Refund Dana Instan",
                  desc: "Pengajuan pembatalan tiket secara mandiri dengan alur pengembalian dana saldo yang diproses cepat & transparan."
                }
              ].map((feat, i) => (
                <div key={i} className="bg-slate-50/50 p-8 rounded-3xl border border-slate-200/50 hover:border-blue-200 hover:bg-white hover:shadow-xl hover:shadow-slate-100 transition-all duration-300 group">
                  <span className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-6 shadow-sm group-hover:scale-110 transition-transform ${feat.bgIcon}`}>
                    {feat.icon}
                  </span>
                  <h3 className="font-bold text-slate-800 text-lg mb-3 group-hover:text-blue-600 transition-colors">{feat.title}</h3>
                  <p className="text-slate-500 text-xs leading-relaxed">{feat.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Informational stats row */}
        <div className="bg-slate-50 py-16 border-t border-slate-200/60 no-print">
          <div className="max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="grid grid-cols-3 gap-8">
              {[
                { val: "50+", label: "Kota Tujuan", desc: "Menghubungkan antar pulau & kota" },
                { val: "20k+", label: "Tiket Terjual", desc: "Kepercayaan ribuan pelanggan" },
                { val: "99.9%", label: "Transaksi Sukses", desc: "Sistem pembayaran handal & aman" }
              ].map((stat, i) => (
                <div key={i} className="space-y-1">
                  <p className="text-3xl sm:text-5xl font-black text-blue-600 tracking-tight">{stat.val}</p>
                  <p className="text-slate-800 text-xs sm:text-sm font-bold mt-2">{stat.label}</p>
                  <p className="text-slate-400 text-[10px] sm:text-xs hidden sm:block">{stat.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="bg-slate-900 text-slate-400 text-xs py-10 border-t border-slate-800 text-center no-print">
          <div className="max-w-7xl mx-auto px-4 space-y-4">
            <p className="font-bold text-slate-300">GoTravel UKL RPL Project</p>
            <p className="text-slate-500">Dibuat untuk Uji Kompetensi Keahlian (UKL) XI RPL oleh Muhammad Taufiqurrohman.</p>
            <div className="w-12 border-t border-slate-800 mx-auto my-4"></div>
            <p>&copy; {new Date().getFullYear()} GoTravel. Hak Cipta Dilindungi.</p>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Navbar />

      {/* Hero section */}
      <div className="relative bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-900 py-24 px-4 sm:px-6 lg:px-8 text-center text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
        
        <div className="max-w-3xl mx-auto relative z-10">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-none mb-4">
            Ke Mana Perjalanan Anda Berikutnya?
          </h1>
          <p className="text-base sm:text-lg text-blue-100/90 max-w-2xl mx-auto">
            Temukan tiket kereta api dan pesawat terbaik dengan rute terlengkap dan harga bersahabat.
          </p>
        </div>
      </div>

      {/* Floating Search Panel */}
      <div className="max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 -mt-12 mb-16 relative z-20">
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xl shadow-slate-200/50 p-6 sm:p-8">
          
          {/* Transport Type Toggle */}
          <div className="flex gap-4 border-b border-slate-100 pb-4 mb-6">
            <button
              onClick={() => {
                setTransportType("kereta");
                setOrigin("");
                setDestination("");
              }}
              className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                transportType === "kereta"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <TrainIcon size={18} />
              <span>Kereta Api</span>
            </button>
            <button
              onClick={() => {
                setTransportType("pesawat");
                setOrigin("");
                setDestination("");
              }}
              className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                transportType === "pesawat"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <PlaneIcon size={18} />
              <span>Pesawat Terbang</span>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSearch} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-7 items-center gap-4">
              
              {/* Origin (Asal) */}
              <div className="md:col-span-3">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Kota / Stasiun Asal
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    list="origins-list"
                    placeholder={transportType === "kereta" ? "Contoh: Malang" : "Contoh: Jakarta"}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm text-slate-800"
                  />
                  <datalist id="origins-list">
                    {uniqueOrigins.map((orig) => (
                      <option key={orig} value={orig} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Swap Button */}
              <div className="flex justify-center md:col-span-1 pt-4 md:pt-0">
                <button
                  type="button"
                  onClick={handleSwap}
                  className="p-3 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-blue-600 shadow-sm transition-all duration-300 hover:rotate-180 cursor-pointer"
                  title="Tukar Rute"
                >
                  <SwapIcon size={18} />
                </button>
              </div>

              {/* Destination (Tujuan) */}
              <div className="md:col-span-3">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Kota / Stasiun Tujuan
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    list="destinations-list"
                    placeholder={transportType === "kereta" ? "Contoh: Surabaya" : "Contoh: Bali"}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm text-slate-800"
                  />
                  <datalist id="destinations-list">
                    {uniqueDestinations.map((dest) => (
                      <option key={dest} value={dest} />
                    ))}
                  </datalist>
                </div>
              </div>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Date */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Tanggal Keberangkatan
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <CalendarIcon size={18} />
                  </span>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm text-slate-800"
                  />
                </div>
              </div>

              {/* Class Selection */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Kelas Kursi
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <UserIcon size={18} />
                  </span>
                  <select
                    value={seatClass}
                    onChange={(e) => setSeatClass(e.target.value as any)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm text-slate-800 appearance-none"
                  >
                    <option value="">Semua Kelas</option>
                    <option value="ekonomi">Ekonomi</option>
                    <option value="eksekutif">Eksekutif</option>
                    <option value="vip">VIP</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Search Submit Button */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="w-full md:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <SearchIcon size={18} />
                <span>Cari Tiket Perjalanan</span>
              </button>
            </div>

          </form>

        </div>
      </div>

      {/* CS contact floating bar at the bottom */}
      <div className="max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 mb-16">
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white rounded-2xl border border-slate-700 shadow-md p-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h4 className="text-lg font-bold">Butuh bantuan perjalanan Anda?</h4>
            <p className="text-sm text-slate-400 mt-1">Layanan CS kami aktif membantu kebutuhan rute kereta & penerbangan Anda.</p>
          </div>
          <a
            href="https://wa.me/6281234567890"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white text-sm font-semibold transition-all"
          >
            Hubungi Customer Service
          </a>
        </div>
      </div>
    </div>
  );
}
