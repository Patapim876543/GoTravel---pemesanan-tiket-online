"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "../components/Navbar";
import { apiRequest } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import {
  LoaderIcon,
  TicketIcon,
  WalletIcon,
  TrainIcon,
  PlaneIcon,
  AlertIcon,
  CloseIcon,
  TrashIcon,
} from "../components/Icons";

interface OrderItem {
  id: string;
  passengerName: string;
  passengerIdNumber: string;
  passengerPhone: string;
  status: "paid" | "refunded" | "cancelled" | string;
  boardingStatus?: string;
  notes?: string;
  createdAt: string;
  ticket: {
    id: string;
    seatNumber: string;
    seatClass: string;
    price: number;
    schedule: {
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

export default function HistoryPage() {
  const { user, loading: authLoading, fetchBalance, balance } = useAuth();
  const { showToast } = useToast();

  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Refund modal states
  const [activeRefundOrder, setActiveRefundOrder] = useState<OrderItem | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [refundSubmitting, setRefundSubmitting] = useState(false);

  // View ticket details modal
  const [activeTicket, setActiveTicket] = useState<OrderItem | null>(null);

  const boardingStatus = activeTicket
    ? (activeTicket.id.startsWith("mock-order-")
      ? (typeof window !== "undefined" ? JSON.parse(localStorage.getItem("local_boarding_status") || "{}")[activeTicket.id] || "Booked" : "Booked")
      : activeTicket.boardingStatus || (activeTicket as any).boarding_status || "Booked")
    : "Booked";
  
  const schId = activeTicket
    ? (activeTicket.ticket?.schedule as any)?.id || activeTicket.ticket?.id?.split("-").slice(2, 6).join("-") || ""
    : "";

  const gateInfo = activeTicket && typeof window !== "undefined" && schId
    ? JSON.parse(localStorage.getItem("local_schedule_gates") || "{}")[schId] || null
    : null;

  // Wallet & Tab states
  const [activeTab, setActiveTab] = useState<"tickets" | "wallet">("tickets");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [transactions, setTransactions] = useState<any[]>([]);
  const [txLoading, setTxLoading] = useState(false);

  const loadOrders = async () => {
    setLoading(true);
    try {
      // API call GET /api/orders/my
      const data = await apiRequest<OrderItem[]>("/api/orders/my");
      
      let hiddenIds: string[] = [];
      if (typeof window !== "undefined") {
        hiddenIds = JSON.parse(localStorage.getItem("hidden_orders") || "[]");
      }
      
      const filtered = (data || []).filter((o) => !hiddenIds.includes(o.id));
      setOrders(filtered);
    } catch (err: any) {
      setOrders([]);
      showToast(err.message || "Gagal memuat riwayat pemesanan.", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    setTxLoading(true);
    try {
      let apiTx: any[] = [];
      try {
        apiTx = await apiRequest<any[]>("/api/users/transactions");
      } catch (e) {
        console.warn("Failed to fetch real wallet transactions:", e);
      }
      
      // Load simulated topups
      let mockTopups: any[] = [];
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("mock_topups");
        if (stored) {
          mockTopups = JSON.parse(stored).map((tx: any, idx: number) => ({
            id: `mock-tx-topup-${idx}`,
            amount: tx.amount,
            type: "topup",
            description: tx.description || "Topup Saldo",
            date: tx.date || tx.createdAt || new Date().toISOString()
          }));
        }
      }
      
      // Load refund statuses as refund transactions
      let mockRefunds: any[] = [];
      if (typeof window !== "undefined") {
        const localStatuses = JSON.parse(localStorage.getItem("local_refund_statuses") || "{}");
        Object.keys(localStatuses).forEach((id) => {
          const item = localStatuses[id];
          if (item.status === "refunded") {
            mockRefunds.push({
              id: `mock-tx-refund-${id}`,
              amount: item.price || 0,
              type: "refund",
              description: `Refund Tiket ${item.vehicleName || ""} - Kursi ${item.seatNumber || ""}`,
              date: item.timestamp || new Date().toISOString()
            });
          }
        });
      }

      // Load simulated bookings
      let mockBookings: any[] = [];
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("mock_orders");
        if (stored) {
          mockBookings = JSON.parse(stored).map((ord: any) => ({
            id: `mock-tx-booking-${ord.id}`,
            amount: -Number(ord.ticket?.price || 0),
            type: "booking",
            description: `Pembelian Tiket ${ord.ticket?.schedule?.vehicleName || ""} (${ord.ticket?.schedule?.vehicleCode || ""})`,
            date: ord.createdAt || new Date().toISOString()
          }));
        }
      }

      // Combine and sort
      const combined = [
        ...apiTx,
        ...mockTopups,
        ...mockRefunds,
        ...mockBookings
      ].sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime());

      setTransactions(combined);
    } catch (err: any) {
      showToast(err.message || "Gagal memuat riwayat transaksi.", "error");
    } finally {
      setTxLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadOrders();
      loadTransactions();
    }
  }, [user]);

  const handleDeleteHistory = (id: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus tiket ini dari riwayat pembelian?")) {
      if (typeof window !== "undefined") {
        // 1. If it's a mock order, delete it directly from mock_orders as well
        if (id.startsWith("mock-order-")) {
          const stored = localStorage.getItem("mock_orders");
          if (stored) {
            try {
              const list = JSON.parse(stored);
              const filtered = list.filter((o: any) => o.id !== id);
              localStorage.setItem("mock_orders", JSON.stringify(filtered));
            } catch (e) {
              console.error(e);
            }
          }
        }

        // 2. Add to hidden_orders to hide both mock and real API tickets from list
        const hiddenStored = localStorage.getItem("hidden_orders");
        const hiddenIds = hiddenStored ? JSON.parse(hiddenStored) : [];
        hiddenIds.push(id);
        localStorage.setItem("hidden_orders", JSON.stringify(hiddenIds));

        // 3. Remove from boarding status & refund status to clean up
        const storedBoarding = JSON.parse(localStorage.getItem("local_boarding_status") || "{}");
        delete storedBoarding[id];
        localStorage.setItem("local_boarding_status", JSON.stringify(storedBoarding));

        const localRefundStatuses = JSON.parse(localStorage.getItem("local_refund_statuses") || "{}");
        delete localRefundStatuses[id];
        localStorage.setItem("local_refund_statuses", JSON.stringify(localRefundStatuses));

        showToast("Tiket berhasil dihapus dari riwayat.", "success");
        loadOrders();
      }
    }
  };

  const handleRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRefundOrder) return;
    if (!refundReason.trim()) {
      showToast("Alasan refund harus diisi.", "error");
      return;
    }

    setRefundSubmitting(true);
    try {
      // Call backend API to request refund
      await apiRequest(`/api/orders/${activeRefundOrder.id}/request-refund`, {
        method: "POST",
        body: { refund_reason: refundReason }
      });

      showToast("Refund tiket berhasil diajukan, menunggu konfirmasi Admin.", "success");
      
      // Close modal and clear inputs
      setActiveRefundOrder(null);
      setRefundReason("");
      
      // Refresh list & balance
      loadOrders();
      fetchBalance();
    } catch (err: any) {
      showToast(err.message || "Gagal mengajukan refund.", "error");
    } finally {
      setRefundSubmitting(false);
    }
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoaderIcon size={40} className="text-blue-600 animate-spin" />
      </div>
    );
  }

  const filteredOrders = orders.filter((order) => {
    if (statusFilter === "all") return true;
    return order.status === statusFilter;
  });

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Navbar />

      {/* CSS print override styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden;
          }
          #boarding-pass-print, #boarding-pass-print * {
            visibility: visible !important;
          }
          #boarding-pass-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            max-width: 100% !important;
            border: 2px dashed #000 !important;
            padding: 24px !important;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
        }
        @media screen {
          .print-only {
            display: none !important;
          }
        }
      `}} />

      <div className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 no-print">
        <h2 className="text-2xl font-bold text-slate-800 mb-6">Daftar Pemesanan & Dompet</h2>

        {/* Tab Buttons */}
        <div className="flex border-b border-slate-200 mb-6 gap-6">
          <button
            onClick={() => setActiveTab("tickets")}
            className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "tickets"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <TicketIcon size={18} />
            <span>Tiket Perjalanan Saya</span>
          </button>
          
          <button
            onClick={() => {
              setActiveTab("wallet");
              loadTransactions();
            }}
            className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "wallet"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <WalletIcon size={18} />
            <span>Mutasi Saldo Dompet</span>
          </button>
        </div>

        {/* TAB 1: TICKETS */}
        {activeTab === "tickets" && (
          <div className="space-y-6">
            {/* Status Filters */}
            <div className="flex flex-wrap gap-2">
              {[
                { id: "all", label: "Semua" },
                { id: "paid", label: "Dibayar" },
                { id: "pending_refund", label: "Menunggu Refund" },
                { id: "refunded", label: "Selesai/Refunded" },
              ].map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => setStatusFilter(btn.id)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all ${
                    statusFilter === btn.id
                      ? "bg-blue-600 text-white shadow-md shadow-blue-500/10"
                      : "bg-white text-slate-655 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="space-y-4">
                {[1, 2].map((n) => (
                  <div key={n} className="bg-white rounded-2xl border border-slate-200/50 p-6 animate-pulse h-36"></div>
                ))}
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200/60 p-12 text-center shadow-sm">
                <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto text-slate-400 mb-4 border border-slate-100">
                  <TicketIcon size={24} />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Belum Ada Pemesanan</h3>
                <p className="text-slate-500 mt-1 max-w-sm mx-auto text-sm">
                  Tidak ditemukan pemesanan tiket dengan status ini.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {filteredOrders.map((order) => {
                  const ticket = order.ticket;
                  const schedule = ticket?.schedule;
                  const route = schedule?.route;
                  const transportType = route?.transportType || "kereta";

                  return (
                    <div
                      key={order.id}
                      className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden flex flex-col md:flex-row hover:shadow-md transition-shadow duration-300"
                    >
                      {/* Left Column: Route Details */}
                      <div className="flex-1 p-6 space-y-4">
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold text-xs capitalize">
                              {transportType === "kereta" ? <TrainIcon size={12} /> : <PlaneIcon size={12} />}
                              {schedule?.vehicleCode}
                            </span>
                            <h3 className="text-base font-bold text-slate-800 mt-1.5">{schedule?.vehicleName}</h3>
                          </div>
                          
                          {/* Order Status Badge */}
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${
                              order.status === "paid"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                : order.status === "pending_refund"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : order.status === "refunded"
                                ? "bg-rose-50 text-rose-700 border border-rose-100"
                                : "bg-slate-50 text-slate-500 border border-slate-200"
                            }`}
                          >
                            {order.status === "paid"
                              ? "Sudah Dibayar"
                              : order.status === "pending_refund"
                              ? "Menunggu Refund"
                              : order.status === "refunded"
                              ? "Refunded"
                              : order.status}
                          </span>
                        </div>

                        <div className="flex items-center gap-6 pt-2">
                          <div className="flex items-center gap-4 flex-wrap">
                            <div>
                              <p className="text-[10px] text-slate-400 font-semibold uppercase">Asal</p>
                              <p className="font-bold text-slate-800 text-sm">{route?.origin}</p>
                              <p className="text-[11px] text-slate-500 mt-0.5">{formatDateTime(schedule?.departureTime || "")}</p>
                            </div>
                            <span className="text-slate-300 font-bold">&rarr;</span>
                            <div>
                              <p className="text-[10px] text-slate-400 font-semibold uppercase">Tujuan</p>
                              <p className="font-bold text-slate-800 text-sm">{route?.destination}</p>
                              <p className="text-[11px] text-slate-500 mt-0.5">{formatDateTime(schedule?.arrivalTime || "")}</p>
                            </div>
                          </div>
                        </div>

                        {/* Passenger details summary */}
                        <div className="border-t border-slate-100 pt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
                          <div>
                            Penumpang: <span className="font-semibold text-slate-700">{order.passengerName}</span>
                          </div>
                          <div>
                            Kursi: <span className="font-bold text-blue-600">{ticket?.seatNumber} ({ticket?.seatClass?.toUpperCase()})</span>
                          </div>
                        </div>
                      </div>

                      {/* Right Column: Price & Actions (Ticket Stub design) */}
                      <div className="bg-slate-50 border-t md:border-t-0 md:border-l border-slate-200/80 p-6 flex flex-col justify-between items-end min-w-[200px] gap-4 relative">
                        {/* Visual dashed connector stub divider for desktop */}
                        <div className="hidden md:block absolute left-[-6px] top-4 bottom-4 border-l border-dashed border-slate-300"></div>

                        <div className="text-right w-full">
                          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Total Pembayaran</p>
                          <p className="text-lg font-black text-slate-900 mt-0.5">{formatRupiah(ticket?.price || 0)}</p>
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-2 w-full md:w-auto items-center">
                          <button
                            onClick={() => setActiveTicket(order)}
                            className="flex-1 md:flex-none px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 shadow-sm transition-colors cursor-pointer"
                          >
                            Lihat E-Ticket
                          </button>
                          
                          {/* Show refund button only if order status is paid and ticket NOT boarded */}
                          {order.status === "paid" && (
                            (() => {
                              const isOrderBoarded =
                                (typeof window !== "undefined"
                                  ? JSON.parse(localStorage.getItem("local_boarding_status") || "{}")[order.id]
                                  : "Booked") === "Boarded";
                              return !isOrderBoarded && (
                                <button
                                  onClick={() => setActiveRefundOrder(order)}
                                  className="flex-1 md:flex-none px-4 py-2 border border-rose-200 bg-rose-50/50 hover:bg-rose-50 rounded-xl text-xs font-bold text-rose-600 hover:text-rose-700 transition-colors cursor-pointer"
                                >
                                  Refund
                                </button>
                              );
                            })()
                          )}

                          <button
                            onClick={() => handleDeleteHistory(order.id)}
                            title="Hapus dari Histori"
                            className="p-2 border border-slate-200 hover:border-rose-200 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-all shadow-sm cursor-pointer flex items-center justify-center"
                          >
                            <TrashIcon size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: WALLET MUTATION */}
        {activeTab === "wallet" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Timeline Transaksi Dompet</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Catatan seluruh aliran dana keluar-masuk akun Anda</p>
                </div>
                <div className="bg-emerald-50 text-emerald-800 px-4 py-2 rounded-2xl border border-emerald-100 text-sm font-black">
                  Saldo: {formatRupiah(balance || 0)}
                </div>
              </div>

              {txLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <LoaderIcon size={32} className="text-blue-600 animate-spin" />
                  <p className="text-slate-500 text-xs font-semibold">Memuat mutasi...</p>
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-12 text-slate-400 font-medium italic">
                  Belum ada riwayat transaksi dompet terdaftar.
                </div>
              ) : (
                <div className="relative border-l border-slate-200/80 ml-4 pl-6 space-y-6">
                  {transactions.map((tx) => {
                    const isCredit = tx.amount > 0 || tx.type === "topup" || tx.type === "refund";
                    const amountVal = Math.abs(tx.amount);
                    return (
                      <div key={tx.id} className="relative">
                        {/* Timeline dot */}
                        <span className={`absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center shadow ${
                          isCredit ? "bg-emerald-500" : "bg-rose-500"
                        }`}></span>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50 p-4 rounded-xl border border-slate-200/40 hover:bg-slate-50 transition-colors">
                          <div>
                            <span className="text-[10px] font-mono text-slate-400 block">{formatDateTime(tx.date || tx.createdAt)}</span>
                            <span className="font-bold text-slate-800 text-sm mt-0.5 block">{tx.description}</span>
                            <span className="text-xs text-slate-500 mt-0.5 block capitalize font-medium">
                              Tipe: <span className="font-semibold">{tx.type}</span>
                            </span>
                          </div>
                          <div className={`text-right text-base font-extrabold font-mono ${
                            isCredit ? "text-emerald-600" : "text-rose-600"
                          }`}>
                            {isCredit ? "+" : "-"} {formatRupiah(amountVal)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* REFUND MODAL DIALOG */}
      {activeRefundOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm no-print">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-md w-full p-6 animate-scale-in">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-lg font-bold text-slate-900">Pengajuan Refund Tiket</h3>
              <button
                onClick={() => setActiveRefundOrder(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-50 transition-all cursor-pointer"
              >
                <CloseIcon size={18} />
              </button>
            </div>
            
            <form onSubmit={handleRefundSubmit} className="space-y-4">
              <div className="bg-amber-50 border border-amber-100 text-amber-800 p-4 rounded-xl text-xs flex gap-3">
                <AlertIcon size={20} className="text-amber-600 flex-shrink-0" />
                <p className="leading-relaxed">
                  <strong>Penting:</strong> Dana akan otomatis dikembalikan ke saldo dompet digital Anda secara instan setelah pengajuan refund berhasil disetujui.
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase">Detail Tiket Refund</p>
                <p className="font-bold text-slate-800 mt-1">
                  {activeRefundOrder.ticket?.schedule?.vehicleName} &bull; Kursi {activeRefundOrder.ticket?.seatNumber}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Rute: {activeRefundOrder.ticket?.schedule?.route?.origin} &rarr; {activeRefundOrder.ticket?.schedule?.route?.destination}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Alasan Refund <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="Contoh: Salah pilih tanggal, perubahan rencana liburan, dll."
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm text-slate-800"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveRefundOrder(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={refundSubmitting}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-rose-500/10"
                >
                  {refundSubmitting ? (
                    <>
                      <LoaderIcon size={16} />
                      <span>Memproses...</span>
                    </>
                  ) : (
                    <span>Konfirmasi Refund</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* E-TICKET VIEW MODAL DIALOG */}
      {activeTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            {/* Main Boarding Pass Wrapper */}
            <div id="boarding-pass-print" className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-scale-in border border-slate-100 relative">
              {/* Printed Header (Visible only when printing) */}
              <div className="hidden print-only p-4 border-b border-black text-center mb-4">
                <h1 className="text-xl font-bold tracking-widest uppercase">BOARDING PASS / E-TIKET TIKETKU</h1>
                <p className="text-[10px] text-slate-500 font-mono">ID Transaksi: {activeTicket.id}</p>
              </div>

              {/* Tilted green stamp for Boarded passengers */}
              {boardingStatus === "Boarded" && (
                <div className="absolute right-6 top-20 border-4 border-emerald-500 text-emerald-500 font-black text-xs uppercase tracking-widest px-3 py-1 rounded rotate-12 opacity-85 select-none font-mono z-50 bg-white">
                  BOARDED
                </div>
              )}

              {/* Header */}
              <div className="bg-gradient-to-r from-blue-700 to-indigo-700 p-6 text-white flex justify-between items-center no-print">
                <div className="flex items-center gap-2">
                  <TicketIcon size={20} />
                  <span className="text-lg font-black tracking-wider">E-TICKET</span>
                </div>
                <button
                  onClick={() => setActiveTicket(null)}
                  className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-all cursor-pointer"
                >
                  <CloseIcon size={20} />
                </button>
              </div>

              {/* Ticket Content */}
              <div className="p-6 space-y-6">
                
                {/* Trip visual */}
                <div className="flex justify-between items-center border-b border-slate-150 pb-4">
                  <div>
                    <h3 className="text-xl font-black text-slate-800">
                      {activeTicket.ticket?.schedule?.route?.originCode || activeTicket.ticket?.schedule?.route?.origin?.substring(0, 3)?.toUpperCase()}
                    </h3>
                    <p className="text-xs text-slate-400">{activeTicket.ticket?.schedule?.route?.origin}</p>
                  </div>
                  <div className="flex flex-col items-center">
                    {activeTicket.ticket?.schedule?.route?.transportType === "kereta" ? (
                      <TrainIcon size={24} className="text-blue-600" />
                    ) : (
                      <PlaneIcon size={24} className="text-blue-600" />
                    )}
                    <div className="w-16 border-t-2 border-dashed border-slate-200 mt-2"></div>
                  </div>
                  <div className="text-right">
                    <h3 className="text-xl font-black text-slate-800">
                      {activeTicket.ticket?.schedule?.route?.destinationCode || activeTicket.ticket?.schedule?.route?.destination?.substring(0, 3)?.toUpperCase()}
                    </h3>
                    <p className="text-xs text-slate-400">{activeTicket.ticket?.schedule?.route?.destination}</p>
                  </div>
                </div>

                {/* Grid detail */}
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="text-slate-400 font-semibold uppercase tracking-wider">Kendaraan</p>
                    <p className="font-bold text-slate-800 text-sm mt-0.5">{activeTicket.ticket?.schedule?.vehicleName}</p>
                    <p className="text-[10px] text-slate-400">Kode: {activeTicket.ticket?.schedule?.vehicleCode}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-semibold uppercase tracking-wider">Nomor Kursi</p>
                    <p className="font-extrabold text-blue-600 text-sm mt-0.5">
                      {activeTicket.ticket?.seatNumber} ({activeTicket.ticket?.seatClass?.toUpperCase()})
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-semibold uppercase tracking-wider">Waktu Berangkat</p>
                    <p className="font-bold text-slate-800 text-sm mt-0.5">{formatDateTime(activeTicket.ticket?.schedule?.departureTime)}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-semibold uppercase tracking-wider">Nama Penumpang</p>
                    <p className="font-bold text-slate-800 text-sm mt-0.5">{activeTicket.passengerName}</p>
                    <p className="text-[10px] text-slate-400">ID: {activeTicket.passengerIdNumber}</p>
                  </div>
                  {activeTicket.ticket?.schedule?.route?.transportType === "pesawat" && gateInfo && gateInfo.gate && (
                    <div>
                      <p className="text-slate-400 font-semibold uppercase tracking-wider">Gate Keberangkatan</p>
                      <p className="font-bold text-indigo-700 text-sm mt-0.5">{gateInfo.gate}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-slate-400 font-semibold uppercase tracking-wider">Status Boarding</p>
                    <p className={`font-bold text-xs mt-0.5 ${boardingStatus === "Boarded" ? "text-emerald-600" : "text-slate-500"}`}>
                      ● {boardingStatus === "Boarded" ? "BOARDED (Sudah Check-In)" : "BOOKED (Belum Check-In)"}
                    </p>
                  </div>
                </div>

                {/* QR Code graphic stub (simulated barcode/qr using inline visual styling) */}
                <div className="border-t border-dashed border-slate-200 pt-6 flex flex-col items-center gap-2">
                {/* Visual barcode block */}
                <div className="w-full max-w-[200px] bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 shadow-inner">
                  {/* barcode lines using styled flex row */}
                  <div className="w-full h-12 flex gap-[2px] items-center justify-center overflow-hidden bg-white px-2 py-1.5 rounded border">
                    <div className="w-[1px] h-full bg-slate-900"></div>
                    <div className="w-[3px] h-full bg-slate-900"></div>
                    <div className="w-[1px] h-full bg-slate-900"></div>
                    <div className="w-[1px] h-full bg-slate-900"></div>
                    <div className="w-[2px] h-full bg-slate-900"></div>
                    <div className="w-[4px] h-full bg-slate-900"></div>
                    <div className="w-[1px] h-full bg-slate-900"></div>
                    <div className="w-[2px] h-full bg-slate-900"></div>
                    <div className="w-[1px] h-full bg-slate-900"></div>
                    <div className="w-[3px] h-full bg-slate-900"></div>
                    <div className="w-[1px] h-full bg-slate-900"></div>
                    <div className="w-[4px] h-full bg-slate-900"></div>
                    <div className="w-[2px] h-full bg-slate-900"></div>
                    <div className="w-[1px] h-full bg-slate-900"></div>
                    <div className="w-[3px] h-full bg-slate-900"></div>
                    <div className="w-[1px] h-full bg-slate-900"></div>
                    <div className="w-[2px] h-full bg-slate-900"></div>
                    <div className="w-[1px] h-full bg-slate-900"></div>
                    <div className="w-[3px] h-full bg-slate-900"></div>
                    <div className="w-[1px] h-full bg-slate-900"></div>
                    <div className="w-[4px] h-full bg-slate-900"></div>
                  </div>
                  <span className="text-[10px] text-slate-400 tracking-widest font-mono uppercase">
                    ORDER-{activeTicket.id.substring(0, 8)}
                  </span>
                </div>
                <p className="text-[11px] text-center text-slate-400 no-print">
                  Tunjukkan barcode e-ticket ini kepada petugas saat check-in di stasiun/bandara.
                </p>
              </div>

              {/* Actions Footer inside modal (hides during print) */}
              <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4 no-print">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-blue-500/10 transition-colors cursor-pointer"
                >
                  <span>Cetak Tiket</span>
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
