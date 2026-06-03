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



  // Load schedule details and seats map
  useEffect(() => {
    const loadBookingData = async () => {
      setLoading(true);
      try {
        const isMockSchedule = scheduleId.startsWith("mock-");

        if (isMockSchedule) {
          // Set schedule info manually from mockId format: mock-sch-{type}-{date}-{index}
          const isKereta = scheduleId.includes("kereta");
          const vehicle = isKereta
            ? { name: "Argo Bromo Anggrek", code: "KA-001", price: 150000 }
            : { name: "Garuda Indonesia", code: "GA-204", price: 850000 };
          
          const parts = scheduleId.split("-");
          const dateVal = parts.slice(3, 6).join("-") || new Date().toISOString().split("T")[0];

          setSchedule({
            id: scheduleId,
            vehicleName: vehicle.name,
            vehicleCode: vehicle.code,
            departureTime: `${dateVal}T08:00:00.000Z`,
            arrivalTime: `${dateVal}T14:30:00.000Z`,
            route: {
              origin: searchParams.get("origin") || "JAKARTA",
              destination: searchParams.get("destination") || "SURABAYA",
              originCode: (searchParams.get("origin") || "JKT").substring(0, 3).toUpperCase(),
              destinationCode: (searchParams.get("destination") || "SUB").substring(0, 3).toUpperCase(),
            }
          });

          // Generate simulated seats
          const mockSeats: SeatTicket[] = [];
          const rows = 10;
          const cols = ["A", "B", "C", "D"];
          const seatClassVal = (selectedClass || "ekonomi") as any;
          const priceVal = seatClassVal === "vip" ? vehicle.price * 3 : seatClassVal === "eksekutif" ? vehicle.price * 2 : vehicle.price;

          // Get list of already booked mock seats from localStorage
          let bookedMockSeatIds: string[] = [];
          if (typeof window !== "undefined") {
            const stored = localStorage.getItem("mock_orders");
            if (stored) {
              try {
                const list = JSON.parse(stored);
                // Filter only paid/active tickets
                bookedMockSeatIds = list
                  .filter((o: any) => o.status === "paid" || o.status === "pending_refund")
                  .map((o: any) => o.ticket?.id);
              } catch (e) {
                console.error("Failed to parse mock_orders", e);
              }
            }
          }

          for (let r = 1; r <= rows; r++) {
            for (let c = 0; c < cols.length; c++) {
              const seatNum = `${r}${cols[c]}`;
              const seatId = `mock-ticket-${scheduleId}-${seatNum}`;
              
              // Booked if already purchased in localStorage OR randomly pre-booked
              const isAlreadyOrdered = bookedMockSeatIds.includes(seatId);
              const isBooked = isAlreadyOrdered || ((r * (c + 1)) % 3 === 0);
              
              mockSeats.push({
                id: seatId,
                seatNumber: seatNum,
                seatClass: seatClassVal,
                price: priceVal,
                status: isBooked ? "dipesan" : "tersedia"
              });
            }
          }
          setSeats(mockSeats);
        } else {
          // 1. Fetch seats map from API /api/tickets/seats/{scheduleId}
          const seatData = await apiRequest<any>(`/api/tickets/seats/${scheduleId}`);
          
          if (seatData && seatData.schedule) {
            setSchedule(seatData.schedule);
          }

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
              rawSeats = seatsObj[classKey].map((s: any) => ({ ...s, seatClass: classKey }));
            } else {
              rawSeats = Object.keys(seatsObj).reduce<any[]>((acc, key) => {
                if (Array.isArray(seatsObj[key])) {
                  const mapped = seatsObj[key].map((s: any) => ({ ...s, seatClass: key }));
                  return acc.concat(mapped);
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
        }
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

  // Group seats by row number
  const getGroupedRows = () => {
    const rowMap: Record<number, Record<string, SeatTicket>> = {};
    
    seats.forEach((seat) => {
      const cleanNum = seat.seatNumber.toUpperCase().replace(/^[EXV]/, "");
      const match = cleanNum.match(/^(\d+)([A-D])$/);
      if (match) {
        const rowNum = parseInt(match[1], 10);
        const letter = match[2];
        if (!rowMap[rowNum]) {
          rowMap[rowNum] = {};
        }
        rowMap[rowNum][letter] = seat;
      } else {
        // Fallback for seats with abnormal codes
        const rowNum = 1;
        const letter = seat.seatNumber.substring(seat.seatNumber.length - 1).toUpperCase();
        if (!rowMap[rowNum]) {
          rowMap[rowNum] = {};
        }
        rowMap[rowNum][letter] = seat;
      }
    });

    // Get sorted row numbers
    return Object.keys(rowMap)
      .map(Number)
      .sort((a, b) => a - b)
      .map((rowNum) => ({
        rowNum,
        seatsInRow: rowMap[rowNum],
      }));
  };

  const renderSeatButton = (seat?: SeatTicket) => {
    if (!seat) {
      return <div className="w-11 h-11" key={Math.random()}></div>;
    }
    const isSelected = selectedTicket?.id === seat.id;
    const isBooked = seat.status === "dipesan";
    const cleanNum = seat.seatNumber.toUpperCase().replace(/^[EXV]/, "");
    
    return (
      <button
        key={seat.id}
        type="button"
        onClick={() => handleSeatClick(seat)}
        disabled={isBooked}
        className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center text-xs font-bold transition-all relative ${
          isBooked
            ? "bg-slate-200/80 border border-slate-200 text-slate-400 cursor-not-allowed"
            : isSelected
            ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
            : "bg-white border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-600 cursor-pointer shadow-sm"
        }`}
      >
        <span>{cleanNum}</span>
        {!isBooked && !isSelected && (
          <span className="text-[7px] text-slate-400 font-semibold absolute bottom-1 leading-none">
            {Number(seat.price) > 1000 ? `${Number(seat.price) / 1000}k` : seat.price}
          </span>
        )}
      </button>
    );
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

    if (checkBalance < Number(selectedTicket.price)) {
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
      const isMockTicket = selectedTicket.id.startsWith("mock-ticket-");

      if (isMockTicket) {
        // Create mock order data
        const mockOrder = {
          id: `mock-order-${Math.random().toString(36).substring(2, 9)}`,
          passengerName,
          passengerIdNumber,
          passengerPhone,
          status: "paid",
          notes: notes || undefined,
          createdAt: new Date().toISOString(),
          ticket: {
            id: selectedTicket.id,
            seatNumber: selectedTicket.seatNumber,
            seatClass: selectedTicket.seatClass,
            price: Number(selectedTicket.price),
            schedule: {
              vehicleName: schedule?.vehicleName || "Kendaraan",
              vehicleCode: schedule?.vehicleCode || "TR-001",
              departureTime: schedule?.departureTime || new Date().toISOString(),
              arrivalTime: schedule?.arrivalTime || new Date().toISOString(),
              route: {
                origin: schedule?.route?.origin || "Kota Asal",
                destination: schedule?.route?.destination || "Kota Tujuan",
                originCode: schedule?.route?.originCode || "ASL",
                destinationCode: schedule?.route?.destinationCode || "TJN",
                transportType: scheduleId.includes("kereta") ? "kereta" : "pesawat"
              }
            }
          }
        };

        // Save order to localStorage so it persists in history page
        const existing = localStorage.getItem("mock_orders");
        const list = existing ? JSON.parse(existing) : [];
        list.unshift(mockOrder);
        localStorage.setItem("mock_orders", JSON.stringify(list));

        showToast("Pemesanan tiket berhasil diproses!", "success");
        await fetchBalance();
        router.push("/history");
      } else {
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
      }
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
      <h2 className="text-2xl font-bold text-slate-800 mb-3">Pemesanan & Pemilihan Kursi</h2>

      {/* Transaction Mode Banner */}
      {scheduleId.startsWith("mock-") ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-8 text-amber-800 flex items-start gap-3 shadow-sm animate-fade-in">
          <span className="text-lg">💡</span>
          <div className="text-xs font-medium leading-relaxed">
            <p className="font-bold text-amber-900 text-sm">Mode Simulasi (Demo Fallback)</p>
            <p className="mt-0.5">Rute & tanggal yang Anda pilih tidak memiliki jadwal aktif di database. Transaksi ini disimpan secara lokal di browser Anda (tidak terdaftar di database petugas).</p>
          </div>
        </div>
      ) : (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-8 text-emerald-800 flex items-start gap-3 shadow-sm animate-fade-in">
          <span className="text-lg">✅</span>
          <div className="text-xs font-medium leading-relaxed">
            <p className="font-bold text-emerald-900 text-sm">Mode Transaksi Riil (Database)</p>
            <p className="mt-0.5">Pembelian tiket ini akan dicatat langsung ke database server, memotong saldo akun secara real-time, dan terhubung langsung ke boarding scanner petugas.</p>
          </div>
        </div>
      )}

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
                  {selectedTicket ? formatRupiah(Number(selectedTicket.price)) : "Pilih kursi..."}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm text-slate-600 border-t border-slate-200/50 pt-2">
                <span>{user && user.role !== "user" ? "Saldo Customer saat ini" : "Saldo Anda saat ini"}</span>
                <span className="font-bold flex items-center gap-1.5 text-emerald-700">
                  <WalletIcon size={14} />
                  {formatRupiah(checkBalance)}
                </span>
              </div>
              
              {selectedTicket && checkBalance < Number(selectedTicket.price) && (
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
              disabled={submitting || !selectedTicket || checkBalance < Number(selectedTicket.price)}
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
                <div className="space-y-3 max-w-[280px] mx-auto py-4">
                  {getGroupedRows().map(({ rowNum, seatsInRow }) => (
                    <div key={rowNum} className="flex items-center justify-center gap-2">
                      {/* Seat A */}
                      {renderSeatButton(seatsInRow["A"])}
                      {/* Seat B */}
                      {renderSeatButton(seatsInRow["B"])}
                      
                      {/* Aisle Row Indicator */}
                      <div className="w-8 text-center text-xs font-bold text-slate-400 font-mono">
                        {rowNum}
                      </div>
                      
                      {/* Seat C */}
                      {renderSeatButton(seatsInRow["C"])}
                      {/* Seat D */}
                      {renderSeatButton(seatsInRow["D"])}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Seat Indicator */}
            {selectedTicket && (
              <div className="w-full border-t border-slate-100 pt-4 flex justify-between items-center text-sm font-semibold">
                <span className="text-slate-500">Kursi Dipilih</span>
                <span className="px-3.5 py-1.5 rounded-xl bg-blue-50 border border-blue-100 text-blue-700 font-bold">
                  {selectedTicket.seatNumber.toUpperCase().replace(/^[EXV]/, "")} ({selectedTicket.seatClass.toUpperCase()})
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
                <WalletIcon size={20} className="text-blue-600" />
                <span>Informasi Pengisian Saldo</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowTopUpModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-50 transition-all cursor-pointer"
              >
                <CloseIcon size={16} />
              </button>
            </div>

            <div className="space-y-4 text-slate-600 text-xs leading-relaxed font-medium">
              <p>
                Untuk menjaga keamanan finansial, pengisian saldo (Top Up) akun Anda tidak dapat dilakukan secara mandiri dari aplikasi customer.
              </p>
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-blue-700 space-y-1">
                <p className="font-bold flex items-center gap-1">💡 Cara Isi Saldo:</p>
                <ol className="list-decimal pl-4 space-y-1 mt-1 text-slate-600">
                  <li>Kunjungi stasiun kereta atau bandara terdekat.</li>
                  <li>Temui petugas loket pembayaran (Super Admin).</li>
                  <li>Sebutkan username akun Anda: <strong className="text-blue-700 font-bold font-mono">{user?.username}</strong></li>
                  <li>Lakukan pembayaran tunai/debit, dan Super Admin akan langsung melakukan Top Up saldo secara real-time ke akun Anda.</li>
                </ol>
              </div>
              <button
                type="button"
                onClick={() => setShowTopUpModal(false)}
                className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all cursor-pointer text-center"
              >
                Mengerti
              </button>
            </div>
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
