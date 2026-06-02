"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Navbar } from "../components/Navbar";
import { apiRequest } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { LoaderIcon, TicketIcon, UserIcon, WalletIcon, CloseIcon } from "../components/Icons";

interface SeatTicket {
  id: string; // ticketId
  seatNumber: string;
  seatClass: "ekonomi" | "vip" | "eksekutif";
  price: number;
  status: "tersedia" | "dipesan";
}

interface ScheduleDetails {
  id: string;
  vehicleName: string;
  vehicleCode: string;
  departureTime: string;
  arrivalTime: string;
  route: {
    origin: string;
    destination: string;
    originCode: string;
    destinationCode: string;
  };
}

function CheckoutForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showToast } = useToast();
  const { balance, fetchBalance, user } = useAuth();

  const scheduleId = searchParams.get("scheduleId") || "";
  const selectedClass = searchParams.get("class") || "";

  // Data states
  const [schedule, setSchedule] = useState<ScheduleDetails | null>(null);
  const [seats, setSeats] = useState<SeatTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [passengerName, setPassengerName] = useState("");
  const [passengerIdNumber, setPassengerIdNumber] = useState("");
  const [passengerPhone, setPassengerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<SeatTicket | null>(null);

  // Top Up states
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("100000");

  // Admin / Staff customer selection states
  const [usersList, setUsersList] = useState<any[]>([]);
  const [buyerUserId, setBuyerUserId] = useState("");
  const [usersLoading, setUsersLoading] = useState(false);

  useEffect(() => {
    const loadUsers = async () => {
      if (user && user.role !== "user") {
        setUsersLoading(true);
        try {
          const res = await apiRequest<any>("/api/admin/users?role=user");
          const list = Array.isArray(res) ? res : res.data || [];
          setUsersList(list);
          if (list.length > 0) {
            setBuyerUserId(list[0].id);
          }
        } catch (err: any) {
          console.error("Gagal memuat daftar customer:", err);
        } finally {
          setUsersLoading(false);
        }
      }
    };
    loadUsers();
  }, [user]);

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
        description: "Top Up Mandiri via Checkout (Simulasi)"
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

  // Load schedule details and seats map
  useEffect(() => {
    const loadBookingData = async () => {
      setLoading(true);
      try {
        // 1. Fetch schedule detail (using the schedules list query or a specific schedule API)
        const schedulesList = await apiRequest<any[]>("/api/schedules");
        const matchedSch = schedulesList.find((s) => s.id === scheduleId);
        if (matchedSch) {
          setSchedule(matchedSch);
        }

        // 2. Fetch seats map from API /api/tickets/seats/{scheduleId}
        const seatData = await apiRequest<any>(`/api/tickets/seats/${scheduleId}`);
        
        let seatsObj: any = null;
        if (seatData) {
          if (seatData.data && typeof seatData.data === "object") {
            seatsObj = seatData.data.seats || seatData.data.tickets || seatData.data;
          } else {
            seatsObj = seatData.seats || seatData.tickets || seatData;
          }
        }

        let rawSeats: any[] = [];
        if (Array.isArray(seatsObj)) {
          rawSeats = seatsObj;
        } else if (seatsObj && typeof seatsObj === "object") {
          const classKey = selectedClass ? selectedClass.toLowerCase() : "";
          if (classKey && Array.isArray(seatsObj[classKey])) {
            rawSeats = seatsObj[classKey];
          } else {
            rawSeats = Object.keys(seatsObj).reduce<any[]>((acc, key) => {
              if (Array.isArray(seatsObj[key])) {
                return acc.concat(seatsObj[key]);
              }
              return acc;
            }, []);
          }
        }

        const seatList: SeatTicket[] = rawSeats;
        
        // Filter seats by the class selected in the search params
        const classFilteredSeats = selectedClass
          ? seatList.filter((s) => s && s.seatClass && s.seatClass.toLowerCase() === selectedClass.toLowerCase())
          : seatList;

        // Sort seats alphabetically/numerically (e.g. 1A, 1B, 2A, 2B)
        const sorted = [...classFilteredSeats].sort((a, b) =>
          (a.seatNumber || "").localeCompare(b.seatNumber || "", undefined, { numeric: true, sensitivity: "base" })
        );

        setSeats(sorted);
      } catch (err: any) {
        showToast(err.message || "Gagal memuat peta kursi.", "error");
      } finally {
        setLoading(false);
      }
    };

    if (scheduleId) {
      loadBookingData();
    }
  }, [scheduleId, selectedClass, showToast, searchParams]);

  const handleSeatClick = (seat: SeatTicket) => {
    if (seat.status === "dipesan") return;
    setSelectedTicket(seat === selectedTicket ? null : seat);
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTicket) {
      showToast("Pilih salah satu kursi terlebih dahulu.", "error");
      return;
    }

    if (!passengerName || !passengerIdNumber || !passengerPhone) {
      showToast("Harap isi semua informasi penumpang.", "error");
      return;
    }

    if (user && user.role !== "user" && !buyerUserId) {
      showToast("Harap pilih akun customer pembeli.", "error");
      return;
    }

    const selectedCustomer = usersList.find((u) => u.id === buyerUserId);
    const checkBalance = user && user.role !== "user"
      ? (selectedCustomer ? Number(selectedCustomer.balance) : 0)
      : balance;

    if (checkBalance < selectedTicket.price) {
      showToast(
        user && user.role !== "user"
          ? "Saldo customer terpilih tidak mencukupi."
          : "Saldo Anda tidak mencukupi. Silakan hubungi Admin untuk topup.",
        "error"
      );
      return;
    }

    setSubmitting(true);
    try {
      // Create real order via API POST /api/orders
      await apiRequest("/api/orders", {
        method: "POST",
        body: {
          ticketId: selectedTicket.id,
          passengerName,
          passengerIdNumber,
          passengerPhone,
          notes: notes || undefined,
          ...(user && user.role !== "user" ? { buyerUserId } : {})
        },
      });

      showToast("Pemesanan tiket berhasil diproses!", "success");
      // Update balance globally
      await fetchBalance();
      // Redirect to transaction history page
      router.push("/history");
    } catch (err: any) {
      showToast(err.message || "Gagal melakukan pemesanan tiket.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const selectedCustomer = usersList.find((u) => u.id === buyerUserId);
  const checkBalance = user && user.role !== "user"
    ? (selectedCustomer ? Number(selectedCustomer.balance) : 0)
    : balance;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <LoaderIcon size={40} className="text-blue-600 animate-spin" />
          <p className="text-slate-500 font-medium text-sm">Memuat peta kursi...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Title */}
      <h2 className="text-2xl font-bold text-slate-800 mb-8">Pemesanan & Pemilihan Kursi</h2>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Passenger Info Form */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Trip Summary Card */}
          {schedule && (
            <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm">
              <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4">
                Ringkasan Perjalanan
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-slate-600">
                <div>
                  <p className="text-xs text-slate-400 font-semibold uppercase">Kendaraan</p>
                  <p className="font-bold text-slate-800 mt-0.5">{schedule.vehicleName}</p>
                  <p className="text-xs text-slate-400">Kode: {schedule.vehicleCode}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-semibold uppercase">Jadwal Keberangkatan</p>
                  <p className="font-bold text-slate-800 mt-0.5">{formatDate(schedule.departureTime)}</p>
                </div>
                <div className="sm:col-span-2 pt-2 border-t border-slate-100/50 mt-2">
                  <p className="text-xs text-slate-400 font-semibold uppercase">Rute Perjalanan</p>
                  <div className="flex items-center gap-2 font-bold text-slate-800 mt-0.5">
                    <span>{schedule.route?.origin}</span>
                    <span>&rarr;</span>
                    <span>{schedule.route?.destination}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Passenger Details Form */}
          <form onSubmit={handleCheckout} className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-3 mb-2">
              Informasi Penumpang
            </h3>

            {/* Admin / Staff customer buyer selection dropdown */}
            {user && user.role !== "user" && (
              <div className="bg-slate-50 border border-slate-200/50 rounded-xl p-4 mb-4">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Akun Pembeli (Customer) <span className="text-rose-500">*</span>
                </label>
                {usersLoading ? (
                  <p className="text-xs text-slate-455 animate-pulse">Memuat daftar customer...</p>
                ) : (
                  <select
                    required
                    value={buyerUserId}
                    onChange={(e) => setBuyerUserId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 transition-all text-sm text-slate-800 bg-white font-medium"
                  >
                    <option value="">-- Pilih Akun Customer --</option>
                    {usersList.map((usr) => (
                      <option key={usr.id} value={usr.id}>
                        {usr.name} (@{usr.username}) - Saldo: {formatRupiah(Number(usr.balance))}
                      </option>
                    ))}
                  </select>
                )}
                <p className="text-[10px] text-slate-450 mt-2 leading-relaxed">
                  * Sebagai <strong>{user.role === "admin" ? "Administrator" : "Petugas"}</strong>, tiket yang Anda belikan akan terdaftar atas nama customer di atas dan memotong saldonya.
                </p>
              </div>
            )}
            
            {/* Name */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Nama Lengkap Penumpang <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={passengerName}
                onChange={(e) => setPassengerName(e.target.value)}
                placeholder="Sesuai KTP / SIM / Paspor"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm text-slate-800"
              />
            </div>

            {/* NIK */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Nomor Identitas NIK <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={passengerIdNumber}
                onChange={(e) => setPassengerIdNumber(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="16 digit NIK KTP Anda"
                maxLength={16}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm text-slate-800"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Nomor Telepon Penumpang <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                required
                value={passengerPhone}
                onChange={(e) => setPassengerPhone(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="Contoh: 08123456789"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm text-slate-800"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Catatan Tambahan (Opsional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contoh: Butuh kursi roda, alergi makanan, dll."
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm text-slate-800"
              />
            </div>

            {/* Payment Summary Box */}
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mt-6 space-y-2">
              <div className="flex justify-between items-center text-sm text-slate-600">
                <span>Harga Kursi ({selectedClass || "All"} Class)</span>
                <span className="font-semibold text-slate-800">
                  {selectedTicket ? formatRupiah(selectedTicket.price) : "Pilih kursi..."}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm text-slate-600 border-t border-slate-200/50 pt-2">
                <span>{user && user.role !== "user" ? "Saldo Customer saat ini" : "Saldo Anda saat ini"}</span>
                <span className="font-bold flex items-center gap-1.5 text-emerald-700">
                  <WalletIcon size={14} />
                  {formatRupiah(checkBalance)}
                </span>
              </div>
              
              {selectedTicket && checkBalance < selectedTicket.price && (
                <div className="bg-rose-50 border border-rose-100 text-rose-800 p-3.5 rounded-xl text-xs font-semibold mt-2 space-y-2.5">
                  <p>Peringatan: Saldo {user && user.role !== "user" ? "customer" : "Anda"} tidak mencukupi untuk melakukan transaksi ini.</p>
                  {user && user.role === "user" && (
                    <button
                      type="button"
                      onClick={() => setShowTopUpModal(true)}
                      className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <WalletIcon size={14} />
                      <span>Top Up Saldo Sekarang</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || !selectedTicket || checkBalance < selectedTicket.price}
              className="w-full mt-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white disabled:text-slate-400 font-semibold rounded-xl transition-all shadow-md shadow-blue-500/15 disabled:shadow-none flex items-center justify-center gap-2 cursor-pointer"
            >
              {submitting ? (
                <>
                  <LoaderIcon size={18} />
                  <span>Memproses Pemesanan...</span>
                </>
              ) : (
                <span>Beli & Bayar Sekarang</span>
              )}
            </button>

          </form>

        </div>

        {/* Right Column: Seat Map Selection Grid */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm flex flex-col items-center">
            
            <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-3 mb-6 w-full text-center">
              Peta Kursi ({selectedClass ? selectedClass.toUpperCase() : "Semua"})
            </h3>

            {/* Legend info */}
            <div className="flex flex-wrap justify-center gap-4 text-xs font-medium text-slate-500 mb-8 border border-slate-100 rounded-xl p-3 bg-slate-50">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-md border border-slate-200 bg-white"></div>
                <span>Tersedia</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-md bg-blue-600"></div>
                <span>Dipilih</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-md bg-slate-200/80 border border-slate-200"></div>
                <span>Dipesan</span>
              </div>
            </div>

            {/* Front indicator (e.g. cabin front / driver) */}
            <div className="w-full max-w-[280px] bg-slate-100 border border-slate-200 py-2.5 rounded-t-3xl text-center text-xs font-bold text-slate-400 mb-6 uppercase tracking-wider">
              Bagian Depan / Driver
            </div>

            {/* Seats Scrollable grid container */}
            <div className="w-full max-h-[380px] overflow-y-auto px-4 py-2 border border-slate-100 rounded-xl bg-slate-50/50 mb-6">
              {seats.length === 0 ? (
                <div className="text-center text-slate-400 py-12 text-sm">
                  Tidak ada data kursi tersedia untuk kelas ini.
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-3 max-w-[280px] mx-auto py-4">
                  {seats.map((seat) => {
                    const isSelected = selectedTicket?.id === seat.id;
                    const isBooked = seat.status === "dipesan";

                    return (
                      <button
                        key={seat.id}
                        type="button"
                        onClick={() => handleSeatClick(seat)}
                        disabled={isBooked}
                        className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center text-xs font-bold transition-all relative ${
                          isBooked
                            ? "bg-slate-200/80 border border-slate-200 text-slate-400 cursor-not-allowed"
                            : isSelected
                            ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                            : "bg-white border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-600 cursor-pointer shadow-sm"
                        }`}
                      >
                        <span>{seat.seatNumber}</span>
                        {!isBooked && !isSelected && (
                          <span className="text-[7px] text-slate-400 font-semibold absolute bottom-1 leading-none">
                            {seat.price > 1000 ? `${seat.price / 1000}k` : seat.price}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Selected Seat Indicator */}
            {selectedTicket && (
              <div className="w-full border-t border-slate-100 pt-4 flex justify-between items-center text-sm font-semibold">
                <span className="text-slate-500">Kursi Dipilih</span>
                <span className="px-3.5 py-1.5 rounded-xl bg-blue-50 border border-blue-100 text-blue-700 font-bold">
                  {selectedTicket.seatNumber} ({selectedTicket.seatClass.toUpperCase()})
                </span>
              </div>
            )}

          </div>
        </div>

      </div>

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
                type="button"
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

    </div>
  );
}

export default function CheckoutPage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Navbar />
      <Suspense
        fallback={
          <div className="flex-1 flex items-center justify-center bg-slate-50">
            <div className="flex flex-col items-center gap-3">
              <LoaderIcon size={40} className="text-blue-600 animate-spin" />
              <p className="text-slate-500 font-medium text-sm">Memuat form checkout...</p>
            </div>
          </div>
        }
      >
        <CheckoutForm />
      </Suspense>
    </div>
  );
}
