"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "../components/Navbar";
import { apiRequest } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import {
  LoaderIcon,
  TicketIcon,
  TrainIcon,
  PlaneIcon,
  CheckIcon,
  CloseIcon,
  AlertIcon,
  MapPinIcon,
  TrashIcon,
} from "../components/Icons";

interface OrderItem {
  id: string;
  passengerName: string;
  passengerIdNumber: string;
  passengerPhone: string;
  status: string;
  notes?: string;
  createdAt: string;
  boardingStatus?: string;
  boarding_status?: string;
  ticket: {
    id: string;
    seatNumber: string;
    seatClass: string;
    price: number;
    schedule: {
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
        transportType: "kereta" | "pesawat";
      };
    };
  };
}

export default function BoardingPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [allOrders, setAllOrders] = useState<OrderItem[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [boardingStatus, setBoardingStatus] = useState<"Booked" | "Boarded">("Booked");

  // Load orders from localStorage to allow simulator test
  useEffect(() => {
    if (user) {
      loadOrders();
    }
  }, [user]);

  const loadOrders = async (keepSelectedId?: string) => {
    if (typeof window !== "undefined") {
      let apiList: any[] = [];
      try {
        const res = await apiRequest<any>("/api/admin/orders");
        const ordersArray = Array.isArray(res) ? res : res.data || [];
        apiList = ordersArray;
      } catch (err: any) {
        console.warn("Failed to fetch real orders from API:", err);
      }

      const stored = localStorage.getItem("mock_orders");
      let mockList: any[] = [];
      if (stored) {
        try {
          mockList = JSON.parse(stored);
        } catch (e) {
          console.error("Failed to parse mock orders", e);
        }
      }

      const list = [...mockList, ...apiList];
      const storedBoarding = JSON.parse(localStorage.getItem("local_boarding_status") || "{}");
      
      // Role-based ticket filtering for officers
      let filteredList = list;
      if (user?.role === "petugas_kereta") {
        filteredList = list.filter(
          (o: any) => o.ticket?.schedule?.route?.transportType === "kereta"
        );
      } else if (user?.role === "petugas_pesawat") {
        filteredList = list.filter(
          (o: any) => o.ticket?.schedule?.route?.transportType === "pesawat"
        );
      }
      setAllOrders(filteredList);

      // Filter to show active orders that are not refunded, cancelled, or already boarded
      let activeOrders = filteredList.filter((o: any) => {
        const status = o.status;
        const bStatus = o.boardingStatus || o.boarding_status || storedBoarding[o.id] || "Booked";
        return status !== "refunded" && status !== "cancelled" && bStatus !== "Boarded";
      });

      setOrders(activeOrders);
      
      if (keepSelectedId) {
        const matched = list.find((o: any) => o.id === keepSelectedId);
        if (matched) {
          setSelectedOrder(matched);
          setBoardingStatus(matched.boardingStatus || matched.boarding_status || storedBoarding[matched.id] || "Booked");
        }
      } else {
        setSelectedOrder(null);
      }
    }
  };

  const handleGenerateDemoTicket = (type: "kereta" | "pesawat") => {
    if (typeof window !== "undefined") {
      const isKereta = type === "kereta";
      const randomId = `mock-order-${Math.random().toString(36).substring(2, 9)}`;
      const randomSeat = `${Math.floor(Math.random() * 8) + 1}${["A", "B", "C", "D"][Math.floor(Math.random() * 4)]}`;
      
      const newOrder = {
        id: randomId,
        passengerName: `Demo Passenger (${isKereta ? "Train" : "Plane"})`,
        passengerIdNumber: `12345678${Math.floor(100000 + Math.random() * 900000)}`,
        passengerPhone: `081234${Math.floor(100000 + Math.random() * 900000)}`,
        status: "paid",
        createdAt: new Date().toISOString(),
        ticket: {
          id: `mock-ticket-${randomId}`,
          seatNumber: randomSeat,
          seatClass: isKereta ? "ekonomi" : "vip",
          price: isKereta ? 150000 : 1720000,
          schedule: {
            vehicleName: isKereta ? "Argo Bromo Anggrek" : "Garuda Indonesia",
            vehicleCode: isKereta ? "KA-001" : "GA-204",
            departureTime: new Date(Date.now() + 2 * 3600000).toISOString(),
            arrivalTime: new Date(Date.now() + 5 * 3600000).toISOString(),
            route: {
              origin: "JAKARTA",
              destination: "SURABAYA",
              originCode: "JKT",
              destinationCode: "SUB",
              transportType: type
            }
          }
        }
      };

      const stored = localStorage.getItem("mock_orders");
      const list = stored ? JSON.parse(stored) : [];
      list.unshift(newOrder);
      localStorage.setItem("mock_orders", JSON.stringify(list));
      
      showToast(`Tiket Demo ${isKereta ? "Kereta" : "Pesawat"} berhasil dibuat.`, "success");
      loadOrders();
    }
  };

  // Sync boarding status when selected order changes
  useEffect(() => {
    if (selectedOrder) {
      const storedBoarding = JSON.parse(localStorage.getItem("local_boarding_status") || "{}");
      setBoardingStatus(storedBoarding[selectedOrder.id] || "Booked");
      setScanSuccess(false);
    }
  }, [selectedOrder]);

  // Delete ticket from local orders
  const handleDeleteTicket = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering selection
    if (confirm("Apakah Anda yakin ingin menghapus tiket ini dari daftar?")) {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("mock_orders");
        if (stored) {
          try {
            const list = JSON.parse(stored);
            const filtered = list.filter((o: any) => o.id !== id);
            localStorage.setItem("mock_orders", JSON.stringify(filtered));
            
            // Clean up boarding status
            const storedBoarding = JSON.parse(localStorage.getItem("local_boarding_status") || "{}");
            delete storedBoarding[id];
            localStorage.setItem("local_boarding_status", JSON.stringify(storedBoarding));

            showToast("Tiket berhasil dihapus.", "success");
            
            // Reload orders
            loadOrders();
            
            // If the deleted ticket was selected, clear selection
            if (selectedOrder?.id === id) {
              setSelectedOrder(null);
            }
          } catch (err) {
            console.error("Failed to delete order", err);
          }
        }
      }
    }
  };

  // Web Audio API beep effect
  const playScanBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.type = "sine";
      oscillator.frequency.value = 1200; // high pitch beep
      
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.25);
      
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.25);
    } catch (e) {
      console.warn("Audio Context failed", e);
    }
  };

  // Search and verify manual code input
  const handleSearchTicket = (codeToSearch?: string) => {
    const code = (codeToSearch !== undefined ? codeToSearch : manualCode).trim();
    if (!code) {
      showToast("Masukkan kode tiket atau order terlebih dahulu.", "error");
      return;
    }

    const matched = allOrders.find(
      (o) => o.id.toLowerCase() === code.toLowerCase() || 
             o.ticket.id.toLowerCase() === code.toLowerCase()
    );

    if (!matched) {
      showToast("Kode tiket atau order tidak ditemukan.", "error");
      return;
    }

    if (matched.status === "refunded") {
      showToast("Tiket ini telah direfund dan tidak valid untuk boarding.", "error");
      return;
    }
    if (matched.status === "cancelled") {
      showToast("Tiket ini telah dibatalkan dan tidak valid untuk boarding.", "error");
      return;
    }

    setSelectedOrder(matched);
    const storedBoarding = JSON.parse(localStorage.getItem("local_boarding_status") || "{}");
    const bStatus = matched.boardingStatus || matched.boarding_status || storedBoarding[matched.id] || "Booked";
    setBoardingStatus(bStatus as "Booked" | "Boarded");
    
    if (bStatus === "Boarded") {
      showToast("Tiket ditemukan. Status: Sudah Boarding.", "info");
    } else {
      showToast("Tiket ditemukan dan valid. Silakan lakukan boarding.", "success");
    }
  };

  // Confirm boarding manually
  const handleConfirmBoarding = () => {
    if (!selectedOrder) return;

    setIsScanning(true);
    setScanSuccess(false);

    // Simulate 1 second processing time
    setTimeout(async () => {
      setIsScanning(false);
      setScanSuccess(true);
      playScanBeep();

      if (selectedOrder) {
        if (!selectedOrder.id.startsWith("mock-order-")) {
          try {
            await apiRequest(`/api/tickets/${selectedOrder.id}/boarding`, {
              method: "PATCH",
              body: { boardingStatus: "Boarded" }
            });
          } catch (apiErr: any) {
            console.warn("Backend API boarding failed, using local fallback:", apiErr);
          }
        }

        const storedBoarding = JSON.parse(localStorage.getItem("local_boarding_status") || "{}");
        storedBoarding[selectedOrder.id] = "Boarded";
        localStorage.setItem("local_boarding_status", JSON.stringify(storedBoarding));
        
        setBoardingStatus("Boarded");
        showToast(`Boarding Sukses! Penumpang ${selectedOrder.passengerName} telah check-in.`, "success");
        
        loadOrders(selectedOrder.id);
      }
    }, 1000);
  };

  // Print boarding pass
  const handlePrintBoardingPass = () => {
    window.print();
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      return d.toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr || "";
    }
  };

  const formatRupiah = (val?: number) => {
    if (val === undefined || val === null) return "Rp 0";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col pb-12">
      <div className="no-print">
        <Navbar />
      </div>

      <main className="max-w-6xl mx-auto px-4 mt-8 flex-1 w-full">
        {/* Title */}
        <div className="mb-8 text-center md:text-left no-print">
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">
            Verifikasi Boarding & Check-In Tiket ({user?.role === "petugas_kereta" ? "Petugas Kereta" : "Petugas Pesawat"})
          </h1>
          <p className="text-slate-500 mt-2 font-medium">
            Verifikasi kode e-tiket penumpang secara manual, lakukan boarding check-in, dan cetak Boarding Pass fisik resmi.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Select Ticket (no-print) */}
          <div className="lg:col-span-5 space-y-6 no-print">
            <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xl shadow-slate-100/50">
              <h2 className="text-lg font-extrabold text-slate-800 mb-4 flex items-center gap-2">
                <TicketIcon size={20} className="text-blue-600" />
                Daftar Tiket Aktif
              </h2>

              <div className="space-y-4">
                {orders.length > 0 && (
                  <div className="flex gap-2 justify-end mb-2">
                    {(!user || user.role === "admin" || user.role === "petugas_kereta") && (
                      <button
                        type="button"
                        onClick={() => handleGenerateDemoTicket("kereta")}
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-[10px] font-extrabold transition-all cursor-pointer"
                      >
                        ➕ Demo Kereta
                      </button>
                    )}
                    {(!user || user.role === "admin" || user.role === "petugas_pesawat") && (
                      <button
                        type="button"
                        onClick={() => handleGenerateDemoTicket("pesawat")}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-[10px] font-extrabold transition-all cursor-pointer"
                      >
                        ➕ Demo Pesawat
                      </button>
                    )}
                  </div>
                )}

                {orders.length === 0 ? (
                  <div className="text-center py-8 px-4 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-4">
                    <div>
                      <p className="text-slate-400 text-sm font-medium">
                        Tidak ada tiket aktif yang siap untuk check-in.
                      </p>
                      <p className="text-slate-400 text-xs mt-2 font-medium">
                        Silakan lakukan pemesanan tiket terlebih dahulu melalui panel penumpang agar tiket muncul di sini, atau buat tiket demo instan di bawah ini.
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      {(!user || user.role === "admin" || user.role === "petugas_kereta") && (
                        <button
                          type="button"
                          onClick={() => handleGenerateDemoTicket("kereta")}
                          className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                          ➕ Generate Tiket Demo Kereta
                        </button>
                      )}
                      {(!user || user.role === "admin" || user.role === "petugas_pesawat") && (
                        <button
                          type="button"
                          onClick={() => handleGenerateDemoTicket("pesawat")}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                          ➕ Generate Tiket Demo Pesawat
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="max-h-[360px] overflow-y-auto pr-1 space-y-2">
                    {orders.map((o) => {
                      const isSelected = selectedOrder?.id === o.id;
                      const isKereta = o.ticket.schedule.route.transportType === "kereta";
                      const isBoarded =
                        (typeof window !== "undefined"
                          ? JSON.parse(localStorage.getItem("local_boarding_status") || "{}")[
                              o.id
                            ]
                          : "Booked") === "Boarded";

                      return (
                        <div
                          key={o.id}
                          className={`w-full group rounded-2xl border transition-all flex items-center pr-2 bg-white ${
                            isSelected
                              ? "border-blue-600 bg-blue-50/30 shadow-inner"
                              : "border-slate-100 hover:border-slate-200"
                          }`}
                        >
                          <button
                            onClick={() => {
                              setSelectedOrder(o);
                              setManualCode(o.id);
                            }}
                            className="flex-1 text-left p-3.5 flex items-center gap-3 cursor-pointer min-w-0"
                          >
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                isKereta ? "bg-amber-50 text-amber-600" : "bg-sky-50 text-sky-600"
                              }`}
                            >
                              {isKereta ? <TrainIcon size={20} /> : <PlaneIcon size={20} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-black text-slate-800 truncate">
                                {o.ticket.schedule.vehicleName} ({o.ticket.schedule.vehicleCode})
                              </p>
                              <p className="text-[10px] font-bold text-slate-400 truncate mt-0.5">
                                {o.ticket.schedule.route.originCode} ➔ {o.ticket.schedule.route.destinationCode} • {o.passengerName}
                              </p>
                            </div>
                            <div>
                              <span
                                className={`text-[9px] px-2 py-0.5 font-extrabold rounded-full shrink-0 ${
                                  isBoarded
                                    ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                    : "bg-amber-50 text-amber-600 border border-amber-100"
                                }`}
                              >
                                {isBoarded ? "BOARDED" : "PAID"}
                              </span>
                            </div>
                          </button>
                          <button
                            onClick={(e) => handleDeleteTicket(o.id, e)}
                            title="Hapus Tiket"
                            className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors cursor-pointer shrink-0"
                          >
                            <TrashIcon size={16} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Search & Verification Panel & Boarding Pass */}
          <div className="lg:col-span-7 flex flex-col items-center w-full">
            {/* 1. SEARCH FORM (When no ticket is selected) */}
            {!selectedOrder && (
              <div className="w-full bg-white rounded-3xl border border-slate-100 p-8 shadow-xl shadow-slate-100/50 no-print animate-scale-in">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <TicketIcon size={32} />
                  </div>
                  <h2 className="text-xl font-black text-slate-800">Verifikasi Tiket Penumpang</h2>
                  <p className="text-sm text-slate-400 mt-2 font-medium">
                    Masukkan kode order atau kode tiket penumpang untuk memeriksa validitas dan melakukan konfirmasi boarding manual.
                  </p>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSearchTicket();
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">
                      Kode Order / ID Tiket
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value)}
                        placeholder="Contoh: mock-order-abcdef atau mock-ticket-..."
                        className="w-full pl-4 pr-24 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner"
                      />
                      <button
                        type="submit"
                        className="absolute right-2 top-1.5 bottom-1.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        Verifikasi
                      </button>
                    </div>
                  </div>
                </form>

                <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                  <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                    💡 Cara Penggunaan: Klik salah satu tiket aktif di panel kiri atau masukkan ID tiket / order penumpang secara langsung di atas.
                  </p>
                </div>
              </div>
            )}

            {/* 2. VERIFICATION CONFIRMATION PANEL (When ticket is selected but NOT boarded yet) */}
            {selectedOrder && boardingStatus !== "Boarded" && (
              <div className="w-full bg-white rounded-3xl border border-slate-100 p-8 shadow-xl shadow-slate-100/50 no-print animate-scale-in space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <span className="text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-100 px-3 py-1 font-extrabold rounded-full uppercase tracking-wider">
                      ✓ Tiket Valid (Siap Boarding)
                    </span>
                    <h2 className="text-xl font-black text-slate-800 mt-2">Konfirmasi Boarding Penumpang</h2>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedOrder(null);
                      setManualCode("");
                    }}
                    className="text-xs font-extrabold text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    Batal / Cari Lain
                  </button>
                </div>

                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 grid grid-cols-2 gap-y-4 gap-x-2 text-xs font-bold">
                  <div>
                    <p className="text-slate-400">Nama Penumpang</p>
                    <p className="text-slate-800 text-sm mt-0.5 uppercase">{selectedOrder.passengerName}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">NIK / Nomor Identitas</p>
                    <p className="text-slate-800 text-sm mt-0.5 font-mono">{selectedOrder.passengerIdNumber}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Armada / No. Kendaraan</p>
                    <p className="text-slate-800 text-sm mt-0.5">
                      {selectedOrder.ticket.schedule.vehicleName} ({selectedOrder.ticket.schedule.vehicleCode})
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400">Nomor Kursi</p>
                    <p className="text-blue-600 text-sm mt-0.5 uppercase font-black">
                      {selectedOrder.ticket.seatNumber} ({selectedOrder.ticket.seatClass.toUpperCase()})
                    </p>
                  </div>
                  <div className="col-span-2 border-t border-slate-200/60 pt-3 mt-1">
                    <p className="text-slate-400">Rute Perjalanan</p>
                    <p className="text-slate-800 text-sm mt-0.5 flex items-center gap-1.5">
                      <span className="font-extrabold">{selectedOrder.ticket.schedule.route.origin} ({selectedOrder.ticket.schedule.route.originCode})</span>
                      <span className="text-slate-400">➔</span>
                      <span className="font-extrabold">{selectedOrder.ticket.schedule.route.destination} ({selectedOrder.ticket.schedule.route.destinationCode})</span>
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-slate-400">ID Pemesanan</p>
                    <p className="text-slate-800 font-mono mt-0.5">{selectedOrder.id}</p>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleConfirmBoarding}
                    disabled={isScanning}
                    className={`w-full py-4 rounded-2xl text-sm font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg ${
                      isScanning
                        ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                        : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/10 hover:shadow-emerald-600/20"
                    }`}
                  >
                    {isScanning ? (
                      <>
                        <LoaderIcon size={16} className="animate-spin" />
                        <span>Sedang Memproses Boarding...</span>
                      </>
                    ) : (
                      <span>Konfirmasi Keberangkatan (Boarding)</span>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* 3. SUCCESS BOARDING PASS VIEW (When ticket is selected and boarded) */}
            {selectedOrder && boardingStatus === "Boarded" && (
              <div className="w-full flex flex-col items-center space-y-6">
                
                {/* No Print Success Panel */}
                <div className="w-full max-w-md bg-emerald-50 border border-emerald-100 rounded-3xl p-5 text-center flex flex-col items-center no-print animate-scale-in">
                  <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-3 animate-pulse">
                    <CheckIcon size={24} />
                  </div>
                  <h3 className="text-emerald-800 font-extrabold text-base">Check-In Berhasil!</h3>
                  <p className="text-emerald-600 text-xs font-semibold mt-1">
                    Boarding status telah diperbarui. Silakan cetak boarding pass Anda.
                  </p>
                  <div className="flex flex-col gap-2 w-full mt-4">
                    <button
                      onClick={handlePrintBoardingPass}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black tracking-wider rounded-xl transition-all shadow-md cursor-pointer"
                    >
                      🖨️ Cetak Boarding Pass
                    </button>
                    <div className="flex gap-2 w-full">
                      <button
                        onClick={() => {
                          setSelectedOrder(null);
                          setManualCode("");
                        }}
                        className="flex-1 py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-black rounded-xl transition-all cursor-pointer"
                      >
                        Verifikasi Tiket Lain
                      </button>
                      {orders.length > 0 && (
                        <button
                          onClick={() => {
                            setSelectedOrder(orders[0]);
                            setManualCode(orders[0].id);
                          }}
                          className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-black rounded-xl transition-all cursor-pointer"
                        >
                          Tiket Aktif Berikutnya
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* BOARDING PASS CARD CONTAINER (Will be formatted nicely for printing) */}
                <div
                  id="boarding-pass-print"
                  className="bg-white rounded-3xl shadow-xl border border-slate-100 max-w-md w-full overflow-hidden relative animate-scale-in"
                >
                  {/* Digital Stamp "BOARDED" */}
                  <div className="absolute right-6 top-20 border-4 border-emerald-500 text-emerald-500 font-black text-sm uppercase tracking-widest px-4 py-1.5 rounded rotate-12 opacity-85 select-none font-mono z-20 bg-white">
                    BOARDED
                  </div>

                  {/* Header Banner */}
                  <div className="bg-gradient-to-r from-blue-700 to-indigo-700 p-6 text-white flex justify-between items-center print:bg-none print:text-black print:border-b print:border-slate-800">
                    <div className="flex items-center gap-2">
                      <TicketIcon size={22} className="text-white print:text-black" />
                      <span className="text-lg font-black tracking-widest print:text-black">BOARDING PASS</span>
                    </div>
                    <span className="text-[10px] font-bold opacity-75 uppercase tracking-wider print:text-black">
                      {selectedOrder.ticket.schedule.route.transportType === "kereta" ? "KA-BOARDING" : "FLIGHT-BOARDING"}
                    </span>
                  </div>

                  {/* Ticket Content */}
                  <div className="p-6 space-y-6">
                    {/* Departure & Arrival Codes */}
                    <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                      <div>
                        <h3 className="text-2xl font-black text-slate-800 print:text-black">
                          {selectedOrder.ticket.schedule.route.originCode}
                        </h3>
                        <p className="text-xs text-slate-400 font-semibold mt-0.5">
                          {selectedOrder.ticket.schedule.route.origin}
                        </p>
                      </div>

                      <div className="flex flex-col items-center">
                        {selectedOrder.ticket.schedule.route.transportType === "kereta" ? (
                          <TrainIcon size={24} className="text-blue-600 print:text-black" />
                        ) : (
                          <PlaneIcon size={24} className="text-blue-600 print:text-black" />
                        )}
                        <div className="w-16 border-t-2 border-dashed border-slate-200 mt-2"></div>
                      </div>

                      <div className="text-right">
                        <h3 className="text-2xl font-black text-slate-800 print:text-black">
                          {selectedOrder.ticket.schedule.route.destinationCode}
                        </h3>
                        <p className="text-xs text-slate-400 font-semibold mt-0.5">
                          {selectedOrder.ticket.schedule.route.destination}
                        </p>
                      </div>
                    </div>

                    {/* Meta Grid details */}
                    <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-xs font-bold text-slate-800">
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">Nama Penumpang</p>
                        <p className="text-sm text-slate-800 mt-0.5 uppercase print:text-black">{selectedOrder.passengerName}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">Nomor Kursi</p>
                        <p className="text-sm text-blue-600 mt-0.5 uppercase font-black print:text-black">
                          {selectedOrder.ticket.seatNumber} ({selectedOrder.ticket.seatClass.toUpperCase()})
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">Kendaraan / No</p>
                        <p className="text-sm mt-0.5 print:text-black">
                          {selectedOrder.ticket.schedule.vehicleName}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Code: {selectedOrder.ticket.schedule.vehicleCode}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">Waktu Keberangkatan</p>
                        <p className="text-sm mt-0.5 print:text-black">
                          {formatDateTime(selectedOrder.ticket.schedule.departureTime)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">Gerbang (Gate)</p>
                        <p className="text-sm text-indigo-600 mt-0.5 print:text-black">
                          {selectedOrder.ticket.schedule.route.transportType === "kereta" ? "Peron 3" : "Gate 2B"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">ID Pemesanan</p>
                        <p className="text-sm mt-0.5 font-mono text-slate-600 print:text-black">{selectedOrder.id}</p>
                      </div>
                    </div>

                    {/* Barcode representation */}
                    <div className="border-t border-slate-100 pt-6 flex flex-col items-center">
                      <div className="flex gap-[1.5px] items-stretch justify-center h-14 bg-white px-6 rounded-xl border border-slate-100 w-full max-w-[280px]">
                        {[3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 3, 1, 2, 1, 3, 4, 2, 1, 3, 2, 4, 1, 3, 1].map((w, idx) => (
                          <div key={idx} className="bg-slate-800" style={{ width: `${w}px` }}></div>
                        ))}
                      </div>
                      <p className="text-[9px] text-slate-400 font-mono tracking-widest mt-2">
                        *{selectedOrder.id.toUpperCase()}*
                      </p>
                    </div>
                  </div>

                  {/* Cut mark effect on print */}
                  <div className="absolute left-0 right-0 h-4 border-t border-dashed border-slate-300 pointer-events-none no-print">
                    <div className="absolute left-[-8px] top-[-9px] w-4 h-4 rounded-full bg-slate-50 border border-slate-150"></div>
                    <div className="absolute right-[-8px] top-[-9px] w-4 h-4 rounded-full bg-slate-50 border border-slate-150"></div>
                  </div>

                  {/* Footer Notice */}
                  <div className="bg-slate-50 p-4 border-t border-slate-100 flex items-center gap-2 justify-center text-[10px] text-slate-400 font-semibold print:hidden">
                    <CheckIcon size={12} className="text-emerald-500" />
                    <span>GoTravel - Simpan digital atau cetak sebagai pass fisik.</span>
                  </div>
                </div>

                {/* Printable Instruction checklist */}
                <div className="w-full max-w-md bg-white border border-slate-100 rounded-3xl p-6 shadow-md no-print space-y-3">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Langkah Selanjutnya:
                  </h4>
                  <ul className="space-y-2 text-xs font-semibold text-slate-500">
                    <li className="flex gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-[10px] font-black">1</span>
                      <span>Bawa E-Boarding Pass ini ke terminal keberangkatan Anda.</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-[10px] font-black">2</span>
                      <span>Tunjukkan kepada petugas gate tiket sebelum menaiki armada.</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-[10px] font-black">3</span>
                      <span>Duduklah sesuai nomor kursi yang tertera. Semoga perjalanan Anda menyenangkan!</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <style jsx global>{`
        @keyframes scanner-laser {
          0% { top: 10%; opacity: 0.2; }
          50% { top: 90%; opacity: 1; }
          100% { top: 10%; opacity: 0.2; }
        }
        .animate-scanner-laser {
          animation: scanner-laser 2s infinite ease-in-out;
        }
        
        @keyframes scale-in {
          0% { transform: scale(0.95); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-scale-in {
          animation: scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          #boarding-pass-print {
            border: 2px solid #000 !important;
            box-shadow: none !important;
            border-radius: 0px !important;
            max-width: 100% !important;
            width: 100% !important;
            margin: 0 auto !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            z-index: 9999 !important;
          }
          .print-only {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}
