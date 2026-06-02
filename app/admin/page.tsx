"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "../components/Navbar";
import { apiRequest } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import {
  LoaderIcon,
  ShieldIcon,
  TrainIcon,
  PlaneIcon,
  UserIcon,
  WalletIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  CalendarIcon,
  AlertIcon,
  CloseIcon,
} from "../components/Icons";

type AdminTab = "dashboard" | "routes" | "schedules" | "users" | "shift_logs";

export default function AdminPage() {
  const { user, loading: authLoading, fetchBalance, activeCity } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const [stats, setStats] = useState<any>({
    totalUsers: 0,
    totalRoutes: 0,
    totalSchedules: 0,
    totalOrders: 0,
  });

  // Global lists
  const [users, setUsers] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [pendingRefunds, setPendingRefunds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form Modals states
  const [activeModal, setActiveModal] = useState<"addRoute" | "editRoute" | "addSchedule" | "topup" | "addUser" | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);

  // Form Field States
  // Route
  const [rtType, setRtType] = useState<"kereta" | "pesawat">("kereta");
  const [rtOrigin, setRtOrigin] = useState("");
  const [rtDestination, setRtDestination] = useState("");
  const [rtOriginCode, setRtOriginCode] = useState("");
  const [rtDestinationCode, setRtDestinationCode] = useState("");
  const [rtDistance, setRtDistance] = useState<number>(0);

  // Schedule
  const [schRouteId, setSchRouteId] = useState("");
  const [schVehicleName, setSchVehicleName] = useState("");
  const [schVehicleCode, setSchVehicleCode] = useState("");
  const [schDeparture, setSchDeparture] = useState("");
  const [schArrival, setSchArrival] = useState("");
  const [schSeatsEco, setSchSeatsEco] = useState<number>(60);
  const [schSeatsVip, setSchSeatsVip] = useState<number>(10);
  const [schSeatsExe, setSchSeatsExe] = useState<number>(20);
  const [schPriceEco, setSchPriceEco] = useState<number>(100000);
  const [schPriceVip, setSchPriceVip] = useState<number>(300000);
  const [schPriceExe, setSchPriceExe] = useState<number>(200000);

  // User
  const [usrName, setUsrName] = useState("");
  const [usrUsername, setUsrUsername] = useState("");
  const [usrEmail, setUsrEmail] = useState("");
  const [usrPhone, setUsrPhone] = useState("");
  const [usrPassword, setUsrPassword] = useState("");
  const [usrRole, setUsrRole] = useState("user");

  // Topup
  const [topupAmount, setTopupAmount] = useState<number>(100000);
  const [topupDesc, setTopupDesc] = useState("Topup oleh Admin");

  // Manifest states
  const [showManifestModal, setShowManifestModal] = useState(false);
  const [manifestSchedule, setManifestSchedule] = useState<any>(null);
  const [manifestPassengers, setManifestPassengers] = useState<any[]>([]);
  const [manifestLoading, setManifestLoading] = useState(false);

  // Audio Announcer States
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [announcementText, setAnnouncementText] = useState("");

  // Shift Logs States
  const [shiftLogs, setShiftLogs] = useState<any[]>([]);
  const [newLogText, setNewLogText] = useState("");
  const [newLogStatus, setNewLogStatus] = useState("Normal");

  // User CRUD states
  const [isEditUserMode, setIsEditUserMode] = useState(false);

  // Wagon & Delay & Gate states
  const [selectedWagon, setSelectedWagon] = useState<number>(1);
  const [showDelayModal, setShowDelayModal] = useState(false);
  const [showGateModal, setShowGateModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);
  const [delayMinutes, setDelayMinutes] = useState("Tepat Waktu");
  const [gateNumber, setGateNumber] = useState("Gate 1A");
  const [flightStatus, setFlightStatus] = useState("Scheduled");

  // Manifest search state
  const [manifestSearch, setManifestSearch] = useState("");
  const [isPrintingManifest, setIsPrintingManifest] = useState(false);

  const handleOpenManifest = async (sch: any) => {
    setManifestSchedule(sch);
    setShowManifestModal(true);
    setManifestLoading(true);
    setSelectedWagon(1); // Reset gerbong to 1 on open
    setManifestSearch(""); // Reset search query on open

    // Initialize default announcement text dynamically
    const isKereta = sch.route?.transportType === "kereta";
    const dest = sch.route?.destination || "Kota Tujuan";
    const vName = sch.vehicleName || "Armada";
    const vCode = sch.vehicleCode || "TR-01";
    if (isKereta) {
      setAnnouncementText(`Perhatian, Kereta Api ${vName} dengan nomor gerbong KA ${vCode} tujuan ${dest} segera diberangkatkan di Peron 3. Para penumpang dipersilakan melakukan check-in boarding dan naik ke atas kereta. Terima kasih.`);
    } else {
      const gates = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("local_schedule_gates") || "{}") : {};
      const gateVal = gates[sch.id]?.gate || "Gate 2B";
      setAnnouncementText(`Pemberitahuan kepada para penumpang pesawat ${vName} dengan nomor penerbangan ${vCode} tujuan ${dest}. Penerbangan Anda dipersilakan untuk naik ke pesawat melalui Gate ${gateVal}. Terima kasih.`);
    }

    try {
      const isMock = sch.id.startsWith("mock-");
      let passengers: any[] = [];
      const storedBoarding = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("local_boarding_status") || "{}") : {};
      const storedBaggage = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("local_baggage_weight") || "{}") : {};

      if (isMock) {
        if (typeof window !== "undefined") {
          const stored = localStorage.getItem("mock_orders");
          if (stored) {
            const list = JSON.parse(stored);
            passengers = list
              .filter((ord: any) => ord.ticket?.schedule?.vehicleCode === sch.vehicleCode && ord.status === "paid")
              .map((ord: any) => ({
                id: ord.id,
                passengerName: ord.passengerName,
                passengerIdNumber: ord.passengerIdNumber,
                passengerPhone: ord.passengerPhone,
                seatNumber: ord.ticket?.seatNumber || "-",
                seatClass: ord.ticket?.seatClass || "-",
                boardingStatus: storedBoarding[ord.id] || "Booked",
                baggageWeight: storedBaggage[ord.id] || 0
              }));
          }
        }
      } else {
        const data = await apiRequest<any>(`/api/tickets/passengers/${sch.id}`);
        const list = Array.isArray(data) ? data : data.passengers || data.data || [];
        passengers = list.map((p: any) => ({
          ...p,
          boardingStatus: p.boardingStatus || storedBoarding[p.id] || "Booked",
          baggageWeight: p.baggageWeight !== undefined && p.baggageWeight !== null ? p.baggageWeight : (storedBaggage[p.id] || 0)
        }));
      }
      setManifestPassengers(passengers);
    } catch (err: any) {
      showToast(err.message || "Gagal memuat manifest penumpang.", "error");
    } finally {
      setManifestLoading(false);
    }
  };

  const getScheduleDelay = (sch: any) => {
    if (typeof window === "undefined" || !sch) return "";
    const delays = JSON.parse(localStorage.getItem("local_schedule_delays") || "{}");
    return delays[sch.id] || sch.delayMinutes || sch.delay_minutes || "Tepat Waktu";
  };

  const getScheduleGate = (sch: any) => {
    if (typeof window === "undefined" || !sch) return { gate: "Gate 1A", status: "Scheduled" };
    const gates = JSON.parse(localStorage.getItem("local_schedule_gates") || "{}");
    return gates[sch.id] || { gate: sch.gateNumber || sch.gate_number || "Gate 1A", status: sch.flightStatus || sch.flight_status || "Scheduled" };
  };

  const handleOpenDelayModal = (sch: any) => {
    setSelectedSchedule(sch);
    const delays = JSON.parse(localStorage.getItem("local_schedule_delays") || "{}");
    setDelayMinutes(delays[sch.id] || sch.delayMinutes || sch.delay_minutes || "Tepat Waktu");
    setShowDelayModal(true);
  };

  const handleSaveDelay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchedule) return;
    try {
      if (!selectedSchedule.id.startsWith("mock-")) {
        await apiRequest(`/api/schedules/${selectedSchedule.id}/delay-gate`, {
          method: "PATCH",
          body: { delayMinutes }
        });
      }

      const delays = JSON.parse(localStorage.getItem("local_schedule_delays") || "{}");
      delays[selectedSchedule.id] = delayMinutes;
      localStorage.setItem("local_schedule_delays", JSON.stringify(delays));

      showToast(`Status keterlambatan jadwal ${selectedSchedule.vehicleCode} disimpan: ${delayMinutes}`, "success");
      setShowDelayModal(false);
      setSelectedSchedule(null);
      loadDashboardData();
    } catch (err: any) {
      showToast(err.message || "Gagal menyimpan status keterlambatan.", "error");
    }
  };

  const handleOpenGateModal = (sch: any) => {
    setSelectedSchedule(sch);
    const gates = JSON.parse(localStorage.getItem("local_schedule_gates") || "{}");
    const gateInfo = gates[sch.id] || { gate: sch.gateNumber || sch.gate_number || "Gate 1A", status: sch.flightStatus || sch.flight_status || "Scheduled" };
    setGateNumber(gateInfo.gate);
    setFlightStatus(gateInfo.status);
    setShowGateModal(true);
  };

  const handleSaveGate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchedule) return;
    try {
      if (!selectedSchedule.id.startsWith("mock-")) {
        await apiRequest(`/api/schedules/${selectedSchedule.id}/delay-gate`, {
          method: "PATCH",
          body: { gateNumber, flightStatus }
        });
      }

      const gates = JSON.parse(localStorage.getItem("local_schedule_gates") || "{}");
      gates[selectedSchedule.id] = { gate: gateNumber, status: flightStatus };
      localStorage.setItem("local_schedule_gates", JSON.stringify(gates));

      showToast(`Gate & status penerbangan ${selectedSchedule.vehicleCode} berhasil diupdate!`, "success");
      setShowGateModal(false);
      setSelectedSchedule(null);
      loadDashboardData();
    } catch (err: any) {
      showToast(err.message || "Gagal memperbarui gate & status.", "error");
    }
  };

  const handleToggleBoarding = async (passengerId: string) => {
    const storedBoarding = JSON.parse(localStorage.getItem("local_boarding_status") || "{}");
    const currentStatus = storedBoarding[passengerId] || "Booked";
    const newStatus = currentStatus === "Boarded" ? "Booked" : "Boarded";
    storedBoarding[passengerId] = newStatus;
    localStorage.setItem("local_boarding_status", JSON.stringify(storedBoarding));

    if (!passengerId.startsWith("mock-order-")) {
      try {
        await apiRequest(`/api/tickets/${passengerId}/boarding`, {
          method: "PATCH",
          body: { boardingStatus: newStatus }
        });
      } catch (err: any) {
        console.error("Gagal update boarding ke backend:", err);
      }
    }

    setManifestPassengers((prev) =>
      prev.map((p) => (p.id === passengerId ? { ...p, boardingStatus: newStatus } : p))
    );
    showToast(`Status boarding penumpang berhasil diubah menjadi: ${newStatus === "Boarded" ? "SUDAH BOARDING (Boarded)" : "BELUM BOARDING"}`, "success");
  };

  const handleUpdateBaggage = async (passengerId: string, weight: number) => {
    const storedBaggage = JSON.parse(localStorage.getItem("local_baggage_weight") || "{}");
    storedBaggage[passengerId] = weight;
    localStorage.setItem("local_baggage_weight", JSON.stringify(storedBaggage));

    if (!passengerId.startsWith("mock-order-")) {
      try {
        await apiRequest(`/api/tickets/${passengerId}/baggage`, {
          method: "PATCH",
          body: { baggageWeight: weight }
        });
      } catch (err: any) {
        console.error("Gagal update bagasi ke backend:", err);
      }
    }

    setManifestPassengers((prev) =>
      prev.map((p) => (p.id === passengerId ? { ...p, baggageWeight: weight } : p))
    );
  };

  // Voice Synthesizer / Audio Chime Broadcaster for Station & Airport
  const playBroadcastChime = (callback: () => void) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const notes = [587.33, 659.25, 698.46, 880.00]; // Westminster / Airport chord (D5, E5, F5, A5)
      const durations = [0.15, 0.15, 0.15, 0.45];
      const delays = [0, 0.18, 0.36, 0.54];
      
      delays.forEach((delay, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.type = "sine";
        osc.frequency.value = notes[idx];
        
        gain.gain.setValueAtTime(0, audioCtx.currentTime + delay);
        gain.gain.linearRampToValueAtTime(0.12, audioCtx.currentTime + delay + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + delay + durations[idx]);
        
        osc.start(audioCtx.currentTime + delay);
        osc.stop(audioCtx.currentTime + delay + durations[idx]);
      });
      
      setTimeout(callback, 1100);
    } catch (e) {
      console.warn("Chime failed", e);
      callback();
    }
  };

  const handleSpeakAnnouncement = (text: string) => {
    if (!text.trim()) {
      showToast("Teks pengumuman tidak boleh kosong.", "error");
      return;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      setIsBroadcasting(true);
      playBroadcastChime(() => {
        const utterance = new SpeechSynthesisUtterance(text);
        const voices = window.speechSynthesis.getVoices();
        const idVoice = voices.find(v => v.lang.startsWith("id") || v.lang.startsWith("in"));
        if (idVoice) utterance.voice = idVoice;
        utterance.rate = 0.85; // Slower speaking rate for clearer public address acoustics
        utterance.onend = () => setIsBroadcasting(false);
        utterance.onerror = () => setIsBroadcasting(false);
        window.speechSynthesis.speak(utterance);
      });
    } else {
      showToast("Browser Anda tidak mendukung fitur Voice Announcement.", "error");
    }
  };

  const handleSelectAnnounceTemplate = (templateKey: string) => {
    if (!manifestSchedule) return;
    const isKereta = manifestSchedule.route?.transportType === "kereta";
    const dest = manifestSchedule.route?.destination || "Kota Tujuan";
    const vName = manifestSchedule.vehicleName || "Armada";
    const vCode = manifestSchedule.vehicleCode || "TR-01";
    
    if (isKereta) {
      if (templateKey === "boarding") {
        setAnnouncementText(`Perhatian, Kereta Api ${vName} dengan nomor gerbong KA ${vCode} tujuan ${dest} segera diberangkatkan di Peron 3. Para penumpang dipersilakan melakukan check-in boarding dan naik ke atas kereta. Terima kasih.`);
      } else if (templateKey === "delay") {
        setAnnouncementText(`Perhatian, Kereta Api ${vName} KA ${vCode} tujuan ${dest} saat ini mengalami keterlambatan operasional. Kami memohon maaf yang sebesar-besarnya atas ketidaknyamanan perjalanan Anda. Terima kasih.`);
      } else if (templateKey === "last_call") {
        setAnnouncementText(`Panggilan terakhir. Kereta Api ${vName} KA ${vCode} tujuan ${dest} akan segera diberangkatkan dalam dua menit. Kepada penumpang yang belum boarding, dipersilakan segera memasuki gerbong. Terima kasih.`);
      }
    } else {
      const gates = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("local_schedule_gates") || "{}") : {};
      const gateVal = gates[manifestSchedule.id]?.gate || "Gate 2B";
      if (templateKey === "boarding") {
        setAnnouncementText(`Pemberitahuan kepada para penumpang pesawat ${vName} dengan nomor penerbangan ${vCode} tujuan ${dest}. Penerbangan Anda dipersilakan untuk naik ke pesawat melalui Gate ${gateVal}. Terima kasih.`);
      } else if (templateKey === "delay") {
        setAnnouncementText(`Pengumuman penundaan. Penerbangan ${vName} dengan nomor penerbangan ${vCode} tujuan ${dest} terpaksa mengalami penundaan keberangkatan karena alasan teknis operasional maskapai. Terima kasih atas pengertian Anda.`);
      } else if (templateKey === "last_call") {
        setAnnouncementText(`Panggilan terakhir bagi para penumpang pesawat ${vName} dengan nomor penerbangan ${vCode} tujuan ${dest}. Silakan segera menuju Gate ${gateVal} karena pintu keberangkatan pesawat akan segera ditutup. Terima kasih.`);
      }
    }
  };



  const handleEditUserClick = (usr: any) => {
    setSelectedItem(usr);
    setUsrName(usr.name || "");
    setUsrUsername(usr.username || "");
    setUsrEmail(usr.email || "");
    setUsrPhone(usr.phone || "");
    setUsrRole(usr.role || "user");
    setUsrPassword(""); // Keep password empty
    setIsEditUserMode(true);
    setActiveModal("addUser");
  };

  const handleEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    setModalSubmitting(true);
    try {
      await apiRequest(`/api/admin/users/${selectedItem.id}`, {
        method: "PUT",
        body: {
          name: usrName,
          username: usrUsername,
          email: usrEmail,
          phone: usrPhone || undefined,
          role: usrRole,
          isActive: true,
          ...(usrPassword ? { password: usrPassword } : {})
        },
      });
      showToast(`Profil pengguna ${usrUsername} berhasil diperbarui!`, "success");
      setActiveModal(null);
      resetUserForm();
      loadDashboardData();
    } catch (err: any) {
      showToast(err.message || "Gagal memperbarui user.", "error");
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus pengguna "${name}"? Tindakan ini tidak dapat dibatalkan.`)) return;
    try {
      await apiRequest(`/api/admin/users/${id}`, { method: "DELETE" });
      showToast("Pengguna berhasil dihapus.", "success");
      loadDashboardData();
    } catch (err: any) {
      showToast(err.message || "Gagal menghapus pengguna.", "error");
    }
  };

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Users (only if role is admin)
      let uList: any[] = [];
      if (user?.role === "admin") {
        try {
          uList = await apiRequest<any[]>("/api/admin/users");
        } catch (err: any) {
          console.warn("Failed to fetch users:", err);
        }
      }
      setUsers(uList || []);

      // 2. Fetch Routes
      const rList = await apiRequest<any[]>("/api/routes");
      setRoutes(rList || []);

      // 3. Fetch Schedules
      const sList = await apiRequest<any[]>("/api/schedules");
      setSchedules(sList || []);

      // 4. Fetch All Orders (only if role is admin)
      let oList: any[] = [];
      if (user?.role === "admin") {
        try {
          oList = await apiRequest<any[]>("/api/admin/orders");
        } catch (err: any) {
          console.warn("Failed to fetch admin orders:", err);
        }
      }
      
      let mockList: any[] = [];
      let localRefundStatuses: any = {};
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("mock_orders");
        if (stored) {
          mockList = JSON.parse(stored);
        }
        localRefundStatuses = JSON.parse(localStorage.getItem("local_refund_statuses") || "{}");
      }

      // Apply overrides to mock list and real list
      const allOrders = [
        ...mockList.map(o => ({ ...o, isMock: true })),
        ...(oList || []).map(o => {
          let mappedStatus = o.status;
          if (o.status === "aktif") mappedStatus = "paid";
          else if (o.status === "direfund") mappedStatus = "refunded";
          else if (o.status === "dibatalkan") mappedStatus = "cancelled";
          return { ...o, status: mappedStatus, isMock: false };
        })
      ];

      const processedOrders = allOrders.map((ord: any) => {
        if (localRefundStatuses[ord.id]) {
          return { ...ord, status: localRefundStatuses[ord.id].status };
        }
        return ord;
      });

      setOrders(processedOrders);

      // Build pending refunds list
      const pendingList: any[] = [];

      // Scan local_refund_statuses for pending_refunds (covers both mock and real)
      for (const id in localRefundStatuses) {
        const item = localRefundStatuses[id];
        if (item.status === "pending_refund") {
          pendingList.push({
            id,
            passengerName: item.passengerName || "Penumpang",
            vehicleName: item.vehicleName || "Transportasi",
            origin: item.origin || "-",
            destination: item.destination || "-",
            price: item.price || 0,
            seatNumber: item.seatNumber || "-",
            isMock: id.startsWith("mock-order-"),
            refundReason: item.refundReason || "",
            transportType: item.transportType || "kereta"
          });
        }
      }

      // Also scan processedOrders
      processedOrders.forEach((ord: any) => {
        if (ord.status === "pending_refund" && !pendingList.some(p => p.id === ord.id)) {
          pendingList.push({
            id: ord.id,
            passengerName: ord.passengerName,
            vehicleName: ord.ticket?.schedule?.vehicleName || "Kereta/Pesawat",
            origin: ord.ticket?.schedule?.route?.origin || "-",
            destination: ord.ticket?.schedule?.route?.destination || "-",
            price: ord.ticket?.price || 0,
            seatNumber: ord.ticket?.seatNumber || "-",
            isMock: ord.isMock,
            refundReason: ord.refundReason || ord.notes || "",
            transportType: ord.ticket?.schedule?.route?.transportType || "kereta"
          });
        }
      });

      setPendingRefunds(pendingList);

      // 5. Try to fetch dashboard statistics (only for admin)
      if (user?.role === "admin") {
        try {
          const dashboardStats = await apiRequest<any>("/api/admin/dashboard");
          setStats(dashboardStats);
        } catch {
          // Fallback calculation from arrays if backend dashboard API doesn't return count directly
          setStats({
            totalUsers: uList?.length || 0,
            totalRoutes: rList?.length || 0,
            totalSchedules: sList?.length || 0,
            totalOrders: processedOrders.length || 0,
          });
        }
      } else {
        // Calculate dynamically for petugas based on their filtered lists
        setStats({
          totalUsers: 0,
          totalRoutes: rList?.length || 0,
          totalSchedules: sList?.length || 0,
          totalOrders: processedOrders.length || 0,
        });
      }
    } catch (err: any) {
      showToast(err.message || "Gagal memuat data dashboard.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRefund = async (order: any) => {
    if (!window.confirm("Apakah Anda yakin ingin menyetujui refund untuk pesanan ini?")) return;
    
    try {
      if (order.isMock) {
        // Update inside mock_orders
        const stored = localStorage.getItem("mock_orders");
        if (stored) {
          const list = JSON.parse(stored);
          const updated = list.map((o: any) => {
            if (o.id === order.id) {
              return { ...o, status: "refunded" };
            }
            return o;
          });
          localStorage.setItem("mock_orders", JSON.stringify(updated));
        }
      } else {
        // Call backend API
        await apiRequest(`/api/orders/${order.id}/refund`, {
          method: "POST",
          body: { refund_reason: order.refundReason || "Disetujui Admin" }
        });
      }

      // Update in local_refund_statuses
      const localRefundStatuses = JSON.parse(localStorage.getItem("local_refund_statuses") || "{}");
      if (localRefundStatuses[order.id]) {
        localRefundStatuses[order.id].status = "refunded";
      } else {
        localRefundStatuses[order.id] = {
          status: "refunded",
          price: order.price,
          passengerName: order.passengerName,
          vehicleName: order.vehicleName,
          origin: order.origin,
          destination: order.destination,
          seatNumber: order.seatNumber
        };
      }
      localStorage.setItem("local_refund_statuses", JSON.stringify(localRefundStatuses));

      showToast("Refund tiket berhasil disetujui dan dana telah dikembalikan.", "success");
      
      // Reload and fetch
      loadDashboardData();
      fetchBalance();
    } catch (err: any) {
      showToast(err.message || "Gagal menyetujui refund.", "error");
    }
  };

  useEffect(() => {
    if (user && (user.role === "admin" || user.role === "petugas_kereta" || user.role === "petugas_pesawat")) {
      loadDashboardData();
    }
  }, [user]);

  // Load Shift logs on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("local_shift_logs");
      if (stored) {
        setShiftLogs(JSON.parse(stored));
      } else {
        const defaultLogs = [
          { id: "1", officer: "Budi Santoso", role: "Petugas Kereta", text: "Kereta Argo Dwipangga (KA-012) telah diberangkatkan tepat waktu dari Peron 3. Manifest gerbong 1-3 lengkap dan sudah boarding.", status: "Normal", timestamp: new Date(Date.now() - 3600000 * 2).toISOString() },
          { id: "2", officer: "Sarah Wijaya", role: "Petugas Pesawat", text: "Penerbangan GA-204 tujuan Bali boarding kondusif melalui Gate 2B. Total berat kargo bagasi terdaftar 410 Kg (di bawah batas overload 500 Kg).", status: "Normal", timestamp: new Date(Date.now() - 3600000 * 5).toISOString() },
          { id: "3", officer: "Adi Pratama", role: "Petugas Kereta", text: "Kereta Gajayana (KA-042) rute Surabaya mengalami keterlambatan 15 menit karena kendala persinyalan di daerah Cikampek. Status delay telah diperbarui di sistem.", status: "Delay", timestamp: new Date(Date.now() - 3600000 * 8).toISOString() }
        ];
        localStorage.setItem("local_shift_logs", JSON.stringify(defaultLogs));
        setShiftLogs(defaultLogs);
      }
    }
  }, []);

  const handleAddShiftLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLogText.trim()) {
      showToast("Teks catatan shift tidak boleh kosong.", "error");
      return;
    }

    const newLog = {
      id: `log-${Date.now()}`,
      officer: user?.name || "Petugas Operasional",
      role: user?.role === "admin" ? "Super Admin" : user?.role === "petugas_kereta" ? "Petugas Kereta" : "Petugas Pesawat",
      text: newLogText,
      status: newLogStatus,
      timestamp: new Date().toISOString()
    };

    const updated = [newLog, ...shiftLogs];
    setShiftLogs(updated);
    localStorage.setItem("local_shift_logs", JSON.stringify(updated));
    setNewLogText("");
    setNewLogStatus("Normal");
    showToast("Catatan shift berhasil disimpan ke dalam Jurnal Operasional!", "success");
  };

  // Route CRUD handlers
  const handleAddRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeCity && activeCity !== "Semua Kota") {
      const matchOrigin = rtOrigin.toLowerCase().includes(activeCity.toLowerCase());
      const matchDest = rtDestination.toLowerCase().includes(activeCity.toLowerCase());
      if (!matchOrigin && !matchDest) {
        showToast(`Akses ditolak: Anda hanya diizinkan mengelola rute untuk wilayah ${activeCity}.`, "error");
        return;
      }
    }
    setModalSubmitting(true);
    try {
      await apiRequest("/api/routes", {
        method: "POST",
        body: {
          transportType: rtType,
          origin: rtOrigin,
          destination: rtDestination,
          originCode: rtOriginCode || undefined,
          destinationCode: rtDestinationCode || undefined,
          distanceKm: Number(rtDistance) || undefined,
        },
      });
      showToast("Rute baru berhasil ditambahkan!", "success");
      setActiveModal(null);
      resetRouteForm();
      loadDashboardData();
    } catch (err: any) {
      showToast(err.message || "Gagal menambahkan rute.", "error");
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleEditRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    if (activeCity && activeCity !== "Semua Kota") {
      const matchOrigin = rtOrigin.toLowerCase().includes(activeCity.toLowerCase());
      const matchDest = rtDestination.toLowerCase().includes(activeCity.toLowerCase());
      if (!matchOrigin && !matchDest) {
        showToast(`Akses ditolak: Anda hanya diizinkan mengelola rute untuk wilayah ${activeCity}.`, "error");
        return;
      }
    }
    setModalSubmitting(true);
    try {
      await apiRequest(`/api/routes/${selectedItem.id}`, {
        method: "PUT",
        body: {
          origin: rtOrigin,
          destination: rtDestination,
          originCode: rtOriginCode || undefined,
          destinationCode: rtDestinationCode || undefined,
          distanceKm: Number(rtDistance) || undefined,
        },
      });
      showToast("Rute berhasil diperbarui!", "success");
      setActiveModal(null);
      resetRouteForm();
      loadDashboardData();
    } catch (err: any) {
      showToast(err.message || "Gagal memperbarui rute.", "error");
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleDeleteRoute = async (id: string) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus rute ini?")) return;
    try {
      await apiRequest(`/api/routes/${id}`, { method: "DELETE" });
      showToast("Rute berhasil dihapus.", "success");
      loadDashboardData();
    } catch (err: any) {
      showToast(err.message || "Gagal menghapus rute.", "error");
    }
  };

  const resetRouteForm = () => {
    setRtOrigin("");
    setRtDestination("");
    setRtOriginCode("");
    setRtDestinationCode("");
    setRtDistance(0);
    setSelectedItem(null);
  };

  // Schedule CRUD handlers
  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schRouteId) {
      showToast("Pilih rute perjalanan terlebih dahulu.", "error");
      return;
    }

    setModalSubmitting(true);
    try {
      await apiRequest("/api/schedules", {
        method: "POST",
        body: {
          routeId: schRouteId,
          vehicleName: schVehicleName,
          vehicleCode: schVehicleCode || undefined,
          departureTime: new Date(schDeparture).toISOString(),
          arrivalTime: new Date(schArrival).toISOString(),
          totalSeatsEconomy: Number(schSeatsEco),
          totalSeatsVip: Number(schSeatsVip),
          totalSeatsExecutive: Number(schSeatsExe),
          priceEconomy: Number(schPriceEco),
          priceVip: Number(schPriceVip),
          priceExecutive: Number(schPriceExe),
        },
      });
      showToast("Jadwal baru berhasil dibuat!", "success");
      setActiveModal(null);
      resetScheduleForm();
      loadDashboardData();
    } catch (err: any) {
      showToast(err.message || "Gagal membuat jadwal baru.", "error");
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus jadwal ini?")) return;
    try {
      await apiRequest(`/api/schedules/${id}`, { method: "DELETE" });
      showToast("Jadwal berhasil dihapus.", "success");
      loadDashboardData();
    } catch (err: any) {
      showToast(err.message || "Gagal menghapus jadwal.", "error");
    }
  };

  const resetScheduleForm = () => {
    setSchRouteId("");
    setSchVehicleName("");
    setSchVehicleCode("");
    setSchDeparture("");
    setSchArrival("");
    setSchSeatsEco(60);
    setSchSeatsVip(10);
    setSchSeatsExe(20);
    setSchPriceEco(100000);
    setSchPriceVip(300000);
    setSchPriceExe(200000);
  };

  // User Actions
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalSubmitting(true);
    try {
      await apiRequest("/api/admin/users", {
        method: "POST",
        body: {
          name: usrName,
          username: usrUsername,
          email: usrEmail,
          phone: usrPhone || undefined,
          password: usrPassword,
          role: usrRole,
        },
      });
      showToast(`User dengan role ${usrRole} berhasil dibuat!`, "success");
      setActiveModal(null);
      resetUserForm();
      loadDashboardData();
    } catch (err: any) {
      showToast(err.message || "Gagal membuat user baru.", "error");
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleOpenTopUp = (usr: any) => {
    setSelectedItem(usr);
    setTopupAmount(100000);
    setTopupDesc("Topup oleh Admin");
    setActiveModal("topup");
  };

  const handleTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    setModalSubmitting(true);
    try {
      await apiRequest(`/api/admin/users/${selectedItem.id}/topup`, {
        method: "POST",
        body: { amount: Number(topupAmount), description: topupDesc },
      });
      showToast(`Saldo ${selectedItem.name} berhasil ditambahkan!`, "success");
      setActiveModal(null);
      setSelectedItem(null);
      setTopupAmount(100000);
      loadDashboardData();
      fetchBalance(); // Refresh own admin balance representation if applicable
    } catch (err: any) {
      showToast(err.message || "Gagal melakukan topup.", "error");
    } finally {
      setModalSubmitting(false);
    }
  };

  const resetUserForm = () => {
    setUsrName("");
    setUsrUsername("");
    setUsrEmail("");
    setUsrPhone("");
    setUsrPassword("");
    setUsrRole("user");
    setIsEditUserMode(false);
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderSeat = (seatCode: string) => {
    const passenger = manifestPassengers.find((p) => {
      if (!p.seatNumber) return false;
      const cleanPassengerSeat = p.seatNumber.toUpperCase().replace(/^[EXV]/, "");
      return cleanPassengerSeat === seatCode.toUpperCase();
    });
    const isOccupied = !!passenger;
    const isBoarded = passenger && passenger.boardingStatus === "Boarded";
    
    return (
      <div
        key={seatCode}
        onClick={() => isOccupied && handleToggleBoarding(passenger.id)}
        className={`w-9 h-9 rounded-lg flex items-center justify-center text-[10px] font-bold transition-all relative group shadow-sm ${
          isBoarded
            ? "bg-emerald-600 text-white border border-emerald-700 hover:bg-emerald-700 cursor-pointer active:scale-95"
            : isOccupied
            ? "bg-blue-600 text-white border border-blue-700 hover:bg-blue-700 cursor-pointer active:scale-95"
            : "bg-white text-slate-400 border border-slate-200/80 hover:bg-slate-50 hover:border-slate-305 cursor-default"
        }`}
        title={isOccupied ? `${passenger.seatNumber}: ${passenger.passengerName} (Klik untuk Check-In)` : `${seatCode}: Tersedia`}
      >
        <span>{passenger ? passenger.seatNumber : seatCode}</span>
        {isOccupied && (
          <div className="absolute bottom-full mb-1.5 hidden group-hover:block z-50 w-44 bg-slate-900/95 text-white text-[10px] p-2.5 rounded-lg shadow-xl leading-relaxed border border-slate-700 text-center font-bold">
            <span className="block">{passenger.passengerName}</span>
            <span className="block opacity-75 font-mono text-[9px] mt-0.5">{passenger.passengerIdNumber || "NIK -"}</span>
            <span className={`block text-[8px] uppercase mt-1.5 ${isBoarded ? 'text-emerald-400' : 'text-blue-300'}`}>
              ● {isBoarded ? 'Boarded (Checked-in)' : 'Booked (Belum)'}
            </span>
            <span className="block text-[8px] text-slate-400 font-medium mt-1 border-t border-slate-800 pt-1">
              🖱️ Klik untuk Ubah Status
            </span>
          </div>
        )}
      </div>
    );
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoaderIcon size={40} className="text-blue-600 animate-spin" />
      </div>
    );
  }

  // If user role is user, redirection is handled inside AuthContext, render null here
  if (!user || user.role === "user") return null;

  // Filter lists based on role and active city to separate concerns (Train Officer vs Plane Officer vs Super Admin)
  const filteredRoutes = routes.filter((rt) => {
    // 1. Role Filter
    if (user.role === "petugas_kereta" && rt.transportType !== "kereta") return false;
    if (user.role === "petugas_pesawat" && rt.transportType !== "pesawat") return false;
    
    // 2. City Filter
    if (activeCity && activeCity !== "Semua Kota") {
      const matchOrigin = rt.origin.toLowerCase().includes(activeCity.toLowerCase());
      const matchDest = rt.destination.toLowerCase().includes(activeCity.toLowerCase());
      if (!matchOrigin && !matchDest) return false;
    }
    return true;
  });

  const filteredSchedules = schedules.filter((sch) => {
    // 1. Role Filter
    const type = sch.route?.transportType;
    if (user.role === "petugas_kereta" && type !== "kereta") return false;
    if (user.role === "petugas_pesawat" && type !== "pesawat") return false;
    
    // 2. City Filter
    if (activeCity && activeCity !== "Semua Kota") {
      const origin = sch.route?.origin || "";
      const dest = sch.route?.destination || "";
      const matchOrigin = origin.toLowerCase().includes(activeCity.toLowerCase());
      const matchDest = dest.toLowerCase().includes(activeCity.toLowerCase());
      if (!matchOrigin && !matchDest) return false;
    }
    return true;
  });

  const filteredOrders = orders.filter((ord) => {
    // 1. Role Filter
    const type = ord.ticket?.schedule?.route?.transportType;
    if (user.role === "petugas_kereta" && type !== "kereta") return false;
    if (user.role === "petugas_pesawat" && type !== "pesawat") return false;
    
    // 2. City Filter
    if (activeCity && activeCity !== "Semua Kota") {
      const origin = ord.ticket?.schedule?.route?.origin || "";
      const dest = ord.ticket?.schedule?.route?.destination || "";
      const matchOrigin = origin.toLowerCase().includes(activeCity.toLowerCase());
      const matchDest = dest.toLowerCase().includes(activeCity.toLowerCase());
      if (!matchOrigin && !matchDest) return false;
    }
    return true;
  });

  const filteredPendingRefunds = pendingRefunds.filter((ord) => {
    // 1. Role Filter
    if (user.role === "petugas_kereta" && ord.transportType !== "kereta") return false;
    if (user.role === "petugas_pesawat" && ord.transportType !== "pesawat") return false;
    
    // 2. City Filter
    if (activeCity && activeCity !== "Semua Kota") {
      const origin = ord.origin || "";
      const dest = ord.destination || "";
      const matchOrigin = origin.toLowerCase().includes(activeCity.toLowerCase());
      const matchDest = dest.toLowerCase().includes(activeCity.toLowerCase());
      if (!matchOrigin && !matchDest) return false;
    }
    return true;
  });

  // Calculate filtered stats counts dynamically for dashboard display
  const statsRoutesCount = filteredRoutes.length;
  const statsSchedulesCount = filteredSchedules.length;
  const statsOrdersCount = filteredOrders.length;

  // Daily sales stats calculation for the last 7 days
  const last7DaysData = (() => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
      
      // Match orders (must be paid)
      const matched = filteredOrders.filter(o => {
        const oDate = o.createdAt ? new Date(o.createdAt) : o.date ? new Date(o.date) : null;
        if (!oDate) return false;
        return oDate.toDateString() === d.toDateString() && o.status === "paid";
      });
      
      const revenue = matched.reduce((acc, curr) => acc + Number(curr.ticket?.price || curr.price || 0), 0);
      data.push({
        label: dateStr,
        revenue,
        count: matched.length
      });
    }
    return data;
  })();

  const maxRev = Math.max(...last7DaysData.map(d => d.revenue), 100000);
  
  // Build points for SVG path
  const svgWidth = 500;
  const svgHeight = 200;
  const paddingX = 55;
  const paddingY = 30;
  const chartWidth = svgWidth - paddingX - 20;
  const chartHeight = svgHeight - paddingY - 20;
  
  const points = last7DaysData.map((d, index) => {
    const x = paddingX + (index * (chartWidth / 6));
    const y = svgHeight - paddingY - (d.revenue / maxRev) * chartHeight;
    return { x, y, label: d.label, revenue: d.revenue, count: d.count };
  });
  
  const pathD = points.length > 0 
    ? `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(" ")
    : "";
     
  const areaD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x} ${svgHeight - paddingY} L ${points[0].x} ${svgHeight - paddingY} Z`
    : "";

  // Donut Chart Calculations (Train vs Plane)
  const trainOrders = filteredOrders.filter(o => {
    const type = o.ticket?.schedule?.route?.transportType || o.transportType || "kereta";
    return type === "kereta" && o.status === "paid";
  });
  const planeOrders = filteredOrders.filter(o => {
    const type = o.ticket?.schedule?.route?.transportType || o.transportType || "pesawat";
    return type === "pesawat" && o.status === "paid";
  });
  
  const trainRev = trainOrders.reduce((acc, o) => acc + Number(o.ticket?.price || o.price || 0), 0);
  const planeRev = planeOrders.reduce((acc, o) => acc + Number(o.ticket?.price || o.price || 0), 0);
  const totalRev = trainRev + planeRev || 1;
  
  const trainPercentage = Math.round((trainRev / totalRev) * 100);
  const planePercentage = Math.round((planeRev / totalRev) * 100);
  
  // SVG donut parameters: radius 40, stroke 10
  // Circumference: 2 * Math.PI * 40 = 251.327
  const circ = 251.327;
  const trainStrokeDash = (trainRev / totalRev) * circ;
  const planeStrokeDash = circ - trainStrokeDash;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Navbar />

      {/* CSS print override styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden;
          }
          .print-active, .print-active * {
            visibility: visible !important;
          }
          .print-active {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
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

      <div className="flex-1 flex flex-col md:flex-row">
        
        {/* Left Sidebar Navigation */}
        <aside className="w-full md:w-64 bg-white border-r border-slate-200 no-print">
          <div className="p-6">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Panel Kontrol</h2>
          </div>
          <nav className="px-3 pb-6 space-y-1">
            {[
              { id: "dashboard", label: "Ringkasan Statistik", icon: <ShieldIcon size={18} /> },
              ...(user.role === "admin"
                ? [
                    { id: "routes", label: "Kelola Rute Perjalanan", icon: <TrainIcon size={18} /> },
                    { id: "users", label: "Kelola User & Saldo", icon: <UserIcon size={18} /> }
                  ]
                : []),
              { id: "schedules", label: "Kelola Jadwal & Tiket", icon: <CalendarIcon size={18} /> },
              ...(user.role !== "admin"
                ? [{ id: "shift_logs", label: "Jurnal & Catatan Shift", icon: <EditIcon size={18} /> }]
                : [])
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as AdminTab)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/10"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Right Dashboard Area */}
        <main className="flex-1 p-6 sm:p-8 space-y-8 overflow-x-hidden">
          
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <LoaderIcon size={40} className="text-blue-600 animate-spin" />
              <p className="text-slate-500 font-medium text-sm">Memuat data panel...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW STATISTICS */}
              {activeTab === "dashboard" && (
                <div className={`space-y-8 animate-fade-in ${!isPrintingManifest ? "print-active" : ""}`}>
                  {/* Printed Header (Visible only when printing) */}
                  <div className="hidden print-only text-center pb-4 mb-6 border-b border-slate-300">
                    <h1 className="text-xl font-bold tracking-widest uppercase">LAPORAN KINERJA & PENJUALAN TIKET</h1>
                    <p className="text-xs text-slate-500 font-mono mt-1">
                      Wilayah Kerja: {activeCity} &bull; Operator: {user?.name || "Petugas"} ({user?.role === "admin" ? "Administrator" : user?.role === "petugas_kereta" ? "Petugas Kereta" : user?.role === "petugas_pesawat" ? "Petugas Pesawat" : "Petugas"}) &bull; Tanggal: {new Date().toLocaleDateString("id-ID")}
                    </p>
                  </div>

                  <div className="flex justify-between items-center flex-wrap gap-4 no-print">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-800">Dashboard Administrator</h2>
                      <p className="text-slate-500 text-sm mt-0.5">Statistik dan data transaksi sistem saat ini</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          if (confirm("Apakah Anda yakin ingin menghapus seluruh data simulasi/mock lokal di browser ini? Ini akan membersihkan riwayat tiket offline, saldo tambahan, dan mereset ke data riil database.")) {
                            localStorage.removeItem("mock_orders");
                            localStorage.removeItem("mock_topups");
                            localStorage.removeItem("local_boarding_status");
                            localStorage.removeItem("local_refund_statuses");
                            localStorage.removeItem("local_schedule_gates");
                            showToast("Seluruh data simulasi lokal berhasil dibersihkan!", "success");
                            loadDashboardData();
                            fetchBalance();
                          }
                        }}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer transition-all border border-slate-200"
                      >
                        <span>🔄 Reset Simulasi</span>
                      </button>
                      <button
                        onClick={() => window.print()}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/10 flex items-center gap-1.5 cursor-pointer transition-all"
                      >
                        <span>🖨️ Cetak Laporan</span>
                      </button>
                      {activeCity && (
                        <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold shadow-sm">
                          <span>📍</span>
                          <span>Wilayah Kerja: {activeCity}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Summary Grid Cards */}
                  <div className={`grid grid-cols-1 sm:grid-cols-2 ${user.role === "admin" ? "lg:grid-cols-4" : "lg:grid-cols-3"} gap-6`}>
                    {[
                      ...(user.role === "admin"
                        ? [{ label: "Total Pengguna", val: stats.totalUsers || 0, color: "bg-blue-50 border-blue-100 text-blue-700" }]
                        : []),
                      { label: "Total Rute", val: statsRoutesCount, color: "bg-emerald-50 border-emerald-100 text-emerald-700" },
                      { label: "Jadwal Aktif", val: statsSchedulesCount, color: "bg-amber-50 border-amber-100 text-amber-700" },
                      { label: "Tiket Terjual", val: statsOrdersCount, color: "bg-purple-50 border-purple-100 text-purple-700" },
                    ].map((card, i) => (
                      <div key={i} className={`p-6 rounded-2xl border ${card.color} shadow-sm`}>
                        <p className="text-xs font-semibold uppercase tracking-wider opacity-85">{card.label}</p>
                        <p className="text-3xl font-extrabold mt-1">{card.val}</p>
                      </div>
                    ))}
                  </div>

                  {/* Visual SVG Statistical Graphs */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Donut Chart: Porsi Penjualan */}
                    <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm flex flex-col justify-between">
                      <div>
                        <h3 className="font-bold text-slate-800 text-base">Porsi Penjualan Tiket</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Perbandingan omzet Kereta Api vs Pesawat Terbang</p>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row items-center justify-around gap-6 my-6">
                        <div className="relative flex items-center justify-center">
                          {/* SVG Donut */}
                          <svg className="w-36 h-36 transform -rotate-90" viewBox="0 0 100 100">
                            <circle
                              cx="50"
                              cy="50"
                              r="40"
                              fill="transparent"
                              stroke="#f1f5f9"
                              strokeWidth="10"
                            />
                            {trainRev > 0 && (
                              <circle
                                cx="50"
                                cy="50"
                                r="40"
                                fill="transparent"
                                stroke="#f97316"
                                strokeWidth="10"
                                strokeDasharray={`${trainStrokeDash} ${circ}`}
                                strokeLinecap="round"
                              />
                            )}
                            {planeRev > 0 && (
                              <circle
                                cx="50"
                                cy="50"
                                r="40"
                                fill="transparent"
                                stroke="#0ea5e9"
                                strokeWidth="10"
                                strokeDasharray={`${planeStrokeDash} ${circ}`}
                                strokeDashoffset={-trainStrokeDash}
                                strokeLinecap="round"
                              />
                            )}
                          </svg>
                          {/* Inner Text */}
                          <div className="absolute flex flex-col items-center justify-center">
                            <span className="text-xs font-black text-slate-800 text-center">
                              {formatRupiah(trainRev + planeRev)}
                            </span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total</span>
                          </div>
                        </div>

                        <div className="space-y-3.5 w-full sm:w-auto min-w-[150px]">
                          {/* Train legend */}
                          <div className="flex items-center justify-between gap-4 p-2.5 rounded-xl bg-orange-50/50 border border-orange-100/50">
                            <div className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                              <span className="text-xs font-bold text-slate-700">Kereta Api</span>
                            </div>
                            <div className="text-right">
                              <span className="block text-xs font-black text-orange-700">{trainPercentage}%</span>
                              <span className="block text-[10px] text-slate-400 font-mono font-bold">{formatRupiah(trainRev)}</span>
                            </div>
                          </div>
                          
                          {/* Plane legend */}
                          <div className="flex items-center justify-between gap-4 p-2.5 rounded-xl bg-sky-50/50 border border-sky-100/50">
                            <div className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full bg-sky-500"></span>
                              <span className="text-xs font-bold text-slate-700">Pesawat</span>
                            </div>
                            <div className="text-right">
                              <span className="block text-xs font-black text-sky-700">{planePercentage}%</span>
                              <span className="block text-[10px] text-slate-400 font-mono font-bold">{formatRupiah(planeRev)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-center text-[10px] text-slate-400 font-semibold border-t border-slate-100 pt-3">
                        Dihitung berdasarkan transaksi sukses di sistem.
                      </div>
                    </div>

                    {/* Line Chart: Tren Omset 7 Hari Terakhir */}
                    <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm flex flex-col justify-between">
                      <div>
                        <h3 className="font-bold text-slate-800 text-base">Tren Omset Penjualan</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Grafik omset harian selama 7 hari terakhir</p>
                      </div>

                      <div className="my-4">
                        <svg className="w-full h-auto" viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
                          {/* Y-axis gridlines */}
                          {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
                            const y = svgHeight - paddingY - ratio * chartHeight;
                            return (
                              <g key={index}>
                                <line
                                  x1={paddingX}
                                  y1={y}
                                  x2={svgWidth - 20}
                                  y2={y}
                                  stroke="#f1f5f9"
                                  strokeWidth="1"
                                />
                                <text
                                  x={paddingX - 10}
                                  y={y + 4}
                                  textAnchor="end"
                                  className="text-[9px] font-mono fill-slate-400 font-bold"
                                >
                                  {ratio === 0 ? "Rp 0" : formatRupiah(ratio * maxRev)}
                                </text>
                              </g>
                            );
                          })}

                          {/* X-axis labels */}
                          {points.map((p, i) => (
                            <text
                              key={i}
                              x={p.x}
                              y={svgHeight - 10}
                              textAnchor="middle"
                              className="text-[9px] font-semibold fill-slate-400"
                            >
                              {p.label}
                            </text>
                          ))}

                          {/* Gradient Fill Under Line */}
                          {areaD && (
                            <path
                              d={areaD}
                              fill="url(#chartGradient)"
                              opacity="0.15"
                            />
                          )}

                          {/* Spark Line */}
                          {pathD && (
                            <path
                              d={pathD}
                              fill="none"
                              stroke="#3b82f6"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          )}

                          {/* Nodes */}
                          {points.map((p, i) => (
                            <g key={i} className="group cursor-pointer">
                              <circle
                                cx={p.x}
                                cy={p.y}
                                r="4"
                                className="fill-blue-600 stroke-white stroke-2 hover:r-6 hover:fill-blue-800 transition-all"
                              />
                              {/* Hover text value tooltip (rendered in SVG) */}
                              <g className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                <rect
                                  x={p.x - 55}
                                  y={p.y - 32}
                                  width="110"
                                  height="22"
                                  rx="4"
                                  fill="#1e293b"
                                />
                                <text
                                  x={p.x}
                                  y={p.y - 18}
                                  textAnchor="middle"
                                  className="text-[9px] fill-white font-mono font-bold"
                                >
                                  {formatRupiah(p.revenue)} ({p.count} tkt)
                                </text>
                              </g>
                            </g>
                          ))}

                          {/* Gradients */}
                          <defs>
                            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#3b82f6" />
                              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                            </linearGradient>
                          </defs>
                        </svg>
                      </div>

                      <div className="text-center text-[10px] text-slate-400 font-semibold border-t border-slate-100 pt-3">
                        Arahkan kursor ke bulatan grafik untuk melihat detail.
                      </div>
                    </div>
                  </div>

                  {/* Menunggu Persetujuan Refund */}
                  {user.role === "admin" && (
                    <div className="bg-white rounded-2xl border border-rose-200/70 p-6 shadow-sm animate-slide-in">
                      <div className="flex items-center gap-2 border-b border-rose-100 pb-3 mb-4 text-rose-700">
                        <AlertIcon size={20} className="text-rose-600 flex-shrink-0" />
                        <h3 className="font-bold text-sm uppercase tracking-wider">Permintaan Refund Menunggu Persetujuan ({filteredPendingRefunds.length})</h3>
                      </div>
                      {filteredPendingRefunds.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 font-semibold text-xs italic">
                          Tidak ada permintaan refund tiket yang menunggu persetujuan saat ini.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm text-slate-600 border-collapse">
                            <thead>
                              <tr className="text-xs text-slate-400 font-bold border-b border-slate-100 uppercase tracking-wider">
                                <th className="pb-3 pr-4">ID Order</th>
                                <th className="pb-3 pr-4">Penumpang</th>
                                <th className="pb-3 pr-4">Kendaraan</th>
                                <th className="pb-3 pr-4">Rute</th>
                                <th className="pb-3 pr-4">Nominal</th>
                                <th className="pb-3 pr-4">Alasan</th>
                                <th className="pb-3 text-right">Aksi</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {filteredPendingRefunds.map((ord) => (
                                <tr key={ord.id} className="hover:bg-rose-50/20 transition-colors">
                                  <td className="py-3.5 pr-4 font-mono text-xs text-slate-800 font-bold">{ord.id.substring(0, 8)}</td>
                                  <td className="py-3.5 pr-4 font-semibold text-slate-800">{ord.passengerName}</td>
                                  <td className="py-3.5 pr-4 text-xs">
                                    <span className="font-medium">{ord.vehicleName}</span>
                                    <span className="block text-[10px] text-slate-400">Kursi: {ord.seatNumber}</span>
                                  </td>
                                  <td className="py-3.5 pr-4 text-xs">
                                    {ord.origin} &rarr; {ord.destination}
                                  </td>
                                  <td className="py-3.5 pr-4 font-extrabold text-rose-600">{formatRupiah(ord.price)}</td>
                                  <td className="py-3.5 pr-4 text-xs italic text-slate-500 max-w-[150px] truncate" title={ord.refundReason}>
                                    {ord.refundReason || "-"}
                                  </td>
                                  <td className="py-3.5 text-right">
                                    <button
                                      onClick={() => handleApproveRefund(ord)}
                                      className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-500/10 cursor-pointer transition-all"
                                    >
                                      Setujui Refund
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Orders transaction log */}
                  <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm">
                    <h3 className="font-bold text-slate-900 mb-4 border-b border-slate-100 pb-3">Riwayat Transaksi Terkini</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm text-slate-600 border-collapse">
                        <thead>
                          <tr className="text-xs text-slate-400 font-bold border-b border-slate-100 uppercase tracking-wider">
                            <th className="pb-3 pr-4">ID Transaksi</th>
                            <th className="pb-3 pr-4">Penumpang</th>
                            <th className="pb-3 pr-4">Kendaraan</th>
                            <th className="pb-3 pr-4">Rute</th>
                            <th className="pb-3 pr-4">Status</th>
                            <th className="pb-3">Harga</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredOrders.slice(0, 10).map((ord) => (
                            <tr key={ord.id} className="hover:bg-slate-50/50">
                              <td className="py-3.5 pr-4 font-mono text-xs">{ord.id.substring(0, 8)}</td>
                              <td className="py-3.5 pr-4 font-semibold text-slate-800">{ord.passengerName}</td>
                              <td className="py-3.5 pr-4 capitalize text-xs">
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100 font-medium">
                                  {ord.ticket?.schedule?.vehicleCode}
                                </span>
                              </td>
                              <td className="py-3.5 pr-4 text-xs font-medium">
                                {ord.ticket?.schedule?.route?.origin} &rarr; {ord.ticket?.schedule?.route?.destination}
                              </td>
                              <td className="py-3.5 pr-4">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold capitalize ${
                                  ord.status === "paid" ? "bg-emerald-50 text-emerald-700" : "bg-slate-50 text-slate-500"
                                }`}>
                                  {ord.status}
                                </span>
                              </td>
                              <td className="py-3.5 font-bold text-slate-800">{formatRupiah(ord.ticket?.price || 0)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: MANAGE ROUTES */}
              {activeTab === "routes" && user.role === "admin" && (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex justify-between items-center flex-wrap gap-4">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-800">Kelola Rute Perjalanan</h2>
                      <p className="text-slate-500 text-sm mt-0.5">Tambah dan modifikasi stasiun & bandara tujuan</p>
                    </div>
                    <button
                      onClick={() => {
                        resetRouteForm();
                        if (user.role === "petugas_kereta") setRtType("kereta");
                        else if (user.role === "petugas_pesawat") setRtType("pesawat");
                        if (activeCity && activeCity !== "Semua Kota") {
                          setRtOrigin(activeCity);
                        }
                        setActiveModal("addRoute");
                      }}
                      className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-500/10"
                    >
                      <PlusIcon size={16} />
                      <span>Tambah Rute Baru</span>
                    </button>
                  </div>

                  {/* Routes Table */}
                  <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm text-slate-600 border-collapse">
                        <thead>
                          <tr className="bg-slate-50/50 text-xs text-slate-400 font-bold border-b border-slate-200/60 uppercase tracking-wider">
                            <th className="p-4">Jenis</th>
                            <th className="p-4">Kode Asal</th>
                            <th className="p-4">Kota Asal</th>
                            <th className="p-4">Kode Tujuan</th>
                            <th className="p-4">Kota Tujuan</th>
                            <th className="p-4">Jarak</th>
                            <th className="p-4 text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredRoutes.map((rt) => (
                            <tr key={rt.id} className="hover:bg-slate-50/50">
                              <td className="p-4 capitalize">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${
                                  rt.transportType === "kereta" ? "bg-orange-50 text-orange-700" : "bg-sky-50 text-sky-700"
                                }`}>
                                  {rt.transportType === "kereta" ? <TrainIcon size={12} /> : <PlaneIcon size={12} />}
                                  {rt.transportType}
                                </span>
                              </td>
                              <td className="p-4 font-mono font-bold text-slate-800">{rt.originCode || "-"}</td>
                              <td className="p-4 font-semibold text-slate-800">{rt.origin}</td>
                              <td className="p-4 font-mono font-bold text-slate-800">{rt.destinationCode || "-"}</td>
                              <td className="p-4 font-semibold text-slate-800">{rt.destination}</td>
                              <td className="p-4">{rt.distanceKm ? `${rt.distanceKm} Km` : "-"}</td>
                              <td className="p-4 text-right flex justify-end gap-2">
                                <button
                                  onClick={() => {
                                    setSelectedItem(rt);
                                    setRtType(rt.transportType);
                                    setRtOrigin(rt.origin);
                                    setRtDestination(rt.destination);
                                    setRtOriginCode(rt.originCode || "");
                                    setRtDestinationCode(rt.destinationCode || "");
                                    setRtDistance(rt.distanceKm || 0);
                                    setActiveModal("editRoute");
                                  }}
                                  className="p-2 border border-slate-200 hover:border-blue-500 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-xl cursor-pointer transition-all"
                                  title="Edit"
                                >
                                  <EditIcon size={16} />
                                </button>
                                <button
                                  onClick={() => handleDeleteRoute(rt.id)}
                                  className="p-2 border border-slate-200 hover:border-rose-500 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl cursor-pointer transition-all"
                                  title="Hapus"
                                >
                                  <TrashIcon size={16} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: MANAGE SCHEDULES */}
              {activeTab === "schedules" && (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex justify-between items-center flex-wrap gap-4">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-800">Kelola Jadwal Keberangkatan</h2>
                      <p className="text-slate-500 text-sm mt-0.5">Atur jadwal rute kereta & penerbangan aktif</p>
                    </div>
                    {user.role === "admin" && (
                      <button
                        onClick={() => {
                          resetScheduleForm();
                          setActiveModal("addSchedule");
                        }}
                        className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-500/10"
                      >
                        <PlusIcon size={16} />
                        <span>Buat Jadwal Baru</span>
                      </button>
                    )}
                  </div>

                  {/* Schedules Table */}
                  <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm text-slate-600 border-collapse">
                        <thead>
                          <tr className="bg-slate-50/50 text-xs text-slate-400 font-bold border-b border-slate-200/60 uppercase tracking-wider">
                            <th className="p-4">Kode/Nama</th>
                            <th className="p-4">Jenis</th>
                            <th className="p-4">Rute Perjalanan</th>
                            <th className="p-4">Keberangkatan</th>
                            <th className="p-4">Harga Ekonomi</th>
                            <th className="p-4">Harga Exe</th>
                            <th className="p-4 text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredSchedules.map((sch) => {
                             const isKereta = sch.route?.transportType === "kereta";
                             const delayInfo = getScheduleDelay(sch);
                             const gateInfo = getScheduleGate(sch);

                             return (
                               <tr key={sch.id} className="hover:bg-slate-50/50">
                                 <td className="p-4">
                                   <span className="block font-bold text-slate-800">{sch.vehicleName}</span>
                                   <span className="text-[10px] font-mono text-slate-400">ID: {sch.vehicleCode}</span>
                                   {isKereta && delayInfo && delayInfo !== "Tepat Waktu" && (
                                     <span className="block text-[10px] font-bold text-rose-600 mt-1 animate-pulse">
                                       ⚠️ {delayInfo}
                                     </span>
                                   )}
                                   {!isKereta && gateInfo.gate && (
                                     <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded mt-1 ${
                                       gateInfo.status === "Boarding Now"
                                         ? "bg-emerald-50 text-emerald-700 animate-pulse"
                                         : gateInfo.status === "Delayed"
                                         ? "bg-rose-50 text-rose-700"
                                         : gateInfo.status === "Gate Closed"
                                         ? "bg-slate-100 text-slate-500"
                                         : "bg-blue-50 text-blue-700"
                                     }`}>
                                       🚪 {gateInfo.gate} ({gateInfo.status})
                                     </span>
                                   )}
                                 </td>
                                 <td className="p-4 capitalize text-xs">
                                   <span className="font-semibold">{sch.route?.transportType}</span>
                                 </td>
                                 <td className="p-4 font-medium">
                                   {sch.route?.origin} &rarr; {sch.route?.destination}
                                 </td>
                                 <td className="p-4 text-xs font-semibold text-slate-800">
                                   {formatDateTime(sch.departureTime)}
                                 </td>
                                 <td className="p-4">{formatRupiah(sch.priceEconomy || 0)}</td>
                                 <td className="p-4">{formatRupiah(sch.priceExecutive || 0)}</td>
                                 <td className="p-4 text-right flex justify-end gap-2">
                                   {user.role !== "admin" && (
                                     <>
                                       <button
                                         onClick={() => handleOpenManifest(sch)}
                                         className="px-2.5 py-1.5 border border-blue-200 hover:border-blue-500 bg-blue-50/50 hover:bg-blue-50 text-blue-600 font-bold rounded-xl cursor-pointer transition-all flex items-center gap-1.5 text-xs"
                                         title="Lihat Manifest Penumpang"
                                       >
                                         <UserIcon size={12} />
                                         <span>Manifest</span>
                                       </button>
                                       {isKereta ? (
                                         <button
                                           onClick={() => handleOpenDelayModal(sch)}
                                           className="p-2 border border-slate-200 hover:border-amber-500 hover:bg-amber-50 text-slate-400 hover:text-amber-600 rounded-xl cursor-pointer transition-all"
                                           title="Atur Keterlambatan Kereta"
                                         >
                                           <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                             <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                           </svg>
                                         </button>
                                       ) : (
                                         <button
                                           onClick={() => handleOpenGateModal(sch)}
                                           className="p-2 border border-slate-200 hover:border-sky-500 hover:bg-sky-50 text-slate-400 hover:text-sky-600 rounded-xl cursor-pointer transition-all"
                                           title="Atur Gate & Boarding"
                                         >
                                           <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                             <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                           </svg>
                                         </button>
                                       )}
                                     </>
                                   )}
                                   {user.role === "admin" && (
                                     <button
                                       onClick={() => handleDeleteSchedule(sch.id)}
                                       className="p-2 border border-slate-200 hover:border-rose-500 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl cursor-pointer transition-all"
                                       title="Hapus"
                                     >
                                       <TrashIcon size={16} />
                                     </button>
                                   )}
                                 </td>
                               </tr>
                             );
                           })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: MANAGE USERS & WALLET */}
              {activeTab === "users" && user.role === "admin" && (
                <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                  <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
                    <div>
                      <h3 className="font-extrabold text-slate-800 text-base font-sans">Daftar Pengguna Aplikasi</h3>
                      <p className="text-xs text-slate-500 mt-1">Mengelola nama, email, tipe role, dan saldo e-wallet penumpang.</p>
                    </div>
                    <button
                      onClick={() => {
                        setIsEditUserMode(false);
                        setUsrName("");
                        setUsrUsername("");
                        setUsrEmail("");
                        setUsrPhone("");
                        setUsrRole("user");
                        setUsrPassword("");
                        setActiveModal("addUser");
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-500/10 transition-all border border-blue-600"
                    >
                      <PlusIcon size={14} />
                      <span>Buat User Baru</span>
                    </button>
                  </div>
                  <div className="p-4 flex-1">
                    <div className="overflow-x-auto rounded-xl border border-slate-150">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="bg-slate-50 text-slate-400 font-extrabold uppercase border-b border-slate-150">
                            <th className="p-3">Nama</th>
                            <th className="p-3">Username</th>
                            <th className="p-3">Email</th>
                            <th className="p-3">Role</th>
                            <th className="p-3">Saldo</th>
                            <th className="p-3 text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {users.map((usr) => (
                            <tr key={usr.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="p-3 font-semibold text-slate-800">{usr.name}</td>
                              <td className="p-3 font-semibold text-slate-500">{usr.username}</td>
                              <td className="p-3 text-slate-500">{usr.email}</td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                  usr.role === "admin"
                                    ? "bg-rose-50 text-rose-700 border border-rose-100"
                                    : usr.role.startsWith("petugas")
                                    ? "bg-amber-50 text-amber-700 border border-amber-100"
                                    : "bg-blue-50 text-blue-700 border border-blue-100"
                                }`}>
                                  {usr.role === "admin" ? "Admin" : usr.role === "petugas_kereta" ? "Staff KA" : usr.role === "petugas_pesawat" ? "Staff Penerbangan" : "Penumpang"}
                                </span>
                              </td>
                              <td className="p-3 font-mono font-bold text-slate-700">{formatRupiah(usr.balance)}</td>
                              <td className="p-3 text-right flex justify-end gap-2">
                                {usr.role === "user" && (
                                  <button
                                    onClick={() => handleOpenTopUp(usr)}
                                    className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-all border border-emerald-200"
                                    title="Top Up Saldo"
                                  >
                                    <WalletIcon size={12} />
                                    <span>Top Up</span>
                                  </button>
                                )}
                                <button
                                  onClick={() => handleEditUserClick(usr)}
                                  className="p-1.5 border border-slate-200 hover:border-blue-500 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-xl cursor-pointer transition-all"
                                  title="Ubah Profil Pengguna"
                                >
                                  <EditIcon size={14} />
                                </button>
                                {usr.id !== user.id && (
                                  <button
                                    onClick={() => handleDeleteUser(usr.id, usr.name)}
                                    className="p-1.5 border border-slate-200 hover:border-rose-500 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl cursor-pointer transition-all"
                                    title="Hapus Pengguna"
                                  >
                                    <TrashIcon size={14} />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "shift_logs" && user.role !== "admin" && (
                <div className="space-y-6 animate-scale-in">
                  <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                    <div>
                      <h2 className="text-xl font-bold text-slate-800">Jurnal Catatan & Serah Terima Shift</h2>
                      <p className="text-xs text-slate-500 mt-1">
                        Pusat koordinasi operasional petugas. Tulis catatan kendala armada, serah terima shift kerja, dan status stasiun/bandara.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left: Input Form */}
                    <div className="lg:col-span-5 bg-white border border-slate-200/80 p-6 rounded-2xl shadow-sm space-y-4">
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                        <span>📝</span>
                        <span>Tambah Catatan Baru</span>
                      </h3>
                      
                      <form onSubmit={handleAddShiftLog} className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                            Status Operasional
                          </label>
                          <select
                            value={newLogStatus}
                            onChange={(e) => setNewLogStatus(e.target.value)}
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-white focus:outline-none focus:border-blue-500 transition-colors"
                          >
                            <option value="Normal">🟢 Operasional Normal</option>
                            <option value="Delay">🟡 Armada Delay / Terlambat</option>
                            <option value="Overweight">🔴 Kargo Overweight / Overload</option>
                            <option value="Maintenance">🔧 Kendala Teknis / Perbaikan</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                            Catatan Detail Operasional
                          </label>
                          <textarea
                            rows={5}
                            value={newLogText}
                            onChange={(e) => setNewLogText(e.target.value)}
                            placeholder="Tulis kendala persinyalan, kargo bagasi, perbaikan gerbang, atau catatan untuk shift berikutnya..."
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all leading-relaxed"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-blue-500/10 transition-all cursor-pointer text-center border border-blue-600"
                        >
                          Simpan ke Jurnal Shift
                        </button>
                      </form>
                    </div>

                    {/* Right: Chronological Feed */}
                    <div className="lg:col-span-7 bg-white border border-slate-200/80 p-6 rounded-2xl shadow-sm space-y-4">
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-4">
                        <span>📖</span>
                        <span>Linimasa Jurnal Operasional (Terbaru)</span>
                      </h3>

                      <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                        {shiftLogs.length === 0 ? (
                          <div className="text-center py-12 text-slate-400 text-xs font-semibold">
                            Tidak ada catatan operasional di jurnal ini.
                          </div>
                        ) : (
                          shiftLogs.map((log) => {
                            const isKereta = log.role === "Petugas Kereta";
                            const statusStyles = 
                              log.status === "Normal" 
                                ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                                : log.status === "Delay"
                                ? "bg-amber-50 text-amber-700 border-amber-100"
                                : log.status === "Overweight"
                                ? "bg-rose-50 text-rose-700 border-rose-100"
                                : "bg-indigo-50 text-indigo-700 border-indigo-100";

                            return (
                              <div
                                key={log.id}
                                className="p-4 rounded-2xl border border-slate-100 bg-slate-50/30 space-y-2.5 transition-all hover:border-slate-200"
                              >
                                <div className="flex justify-between items-start gap-3">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isKereta ? 'bg-amber-50' : 'bg-sky-50'}`}>
                                      {isKereta ? "🚂" : "✈️"}
                                    </div>
                                    <div>
                                      <p className="text-xs font-black text-slate-800">{log.officer}</p>
                                      <p className="text-[9px] text-slate-400 font-bold uppercase">{log.role}</p>
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-end gap-1">
                                    <span className={`text-[8px] font-extrabold px-2 py-0.5 rounded-full border ${statusStyles}`}>
                                      {log.status.toUpperCase()}
                                    </span>
                                    <span className="text-[9px] text-slate-400 font-bold font-mono">
                                      {formatDateTime(log.timestamp)}
                                    </span>
                                  </div>
                                </div>

                                <p className="text-xs text-slate-650 font-semibold leading-relaxed pl-10 border-l border-slate-250">
                                  {log.text}
                                </p>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}


            </>
          )}
        </main>
      </div>

      {/* MODAL 1: ADD ROUTE */}
      {activeModal === "addRoute" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-md w-full p-6 animate-scale-in">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-lg font-bold text-slate-900">Tambah Rute Perjalanan Baru</h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <CloseIcon size={18} />
              </button>
            </div>
            
            <form onSubmit={handleAddRoute} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Jenis Transportasi</label>
                <select
                  value={rtType}
                  onChange={(e) => setRtType(e.target.value as any)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800"
                >
                  <option value="kereta">Kereta Api</option>
                  <option value="pesawat">Pesawat Terbang</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Kota Asal</label>
                  <input
                    type="text"
                    required
                    value={rtOrigin}
                    onChange={(e) => setRtOrigin(e.target.value)}
                    placeholder="Contoh: Malang"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Kode Asal (Opsional)</label>
                  <input
                    type="text"
                    value={rtOriginCode}
                    onChange={(e) => setRtOriginCode(e.target.value.toUpperCase())}
                    placeholder="Contoh: ML"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Kota Tujuan</label>
                  <input
                    type="text"
                    required
                    value={rtDestination}
                    onChange={(e) => setRtDestination(e.target.value)}
                    placeholder="Contoh: Surabaya"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Kode Tujuan (Opsional)</label>
                  <input
                    type="text"
                    value={rtDestinationCode}
                    onChange={(e) => setRtDestinationCode(e.target.value.toUpperCase())}
                    placeholder="Contoh: SB"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Jarak (KM)</label>
                <input
                  type="number"
                  value={rtDistance}
                  onChange={(e) => setRtDistance(Number(e.target.value))}
                  placeholder="Jarak dalam Kilometer"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-800"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setActiveModal(null)} className="px-4 py-2 border border-slate-200 rounded-xl text-sm cursor-pointer">Batal</button>
                <button type="submit" disabled={modalSubmitting} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold flex items-center gap-1.5 cursor-pointer">
                  {modalSubmitting ? <LoaderIcon size={16} /> : <span>Tambah</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT ROUTE */}
      {activeModal === "editRoute" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-md w-full p-6 animate-scale-in">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-lg font-bold text-slate-900">Ubah Data Rute</h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <CloseIcon size={18} />
              </button>
            </div>
            
            <form onSubmit={handleEditRoute} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Kota Asal</label>
                  <input
                    type="text"
                    required
                    value={rtOrigin}
                    onChange={(e) => setRtOrigin(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Kode Asal</label>
                  <input
                    type="text"
                    value={rtOriginCode}
                    onChange={(e) => setRtOriginCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Kota Tujuan</label>
                  <input
                    type="text"
                    required
                    value={rtDestination}
                    onChange={(e) => setRtDestination(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Kode Tujuan</label>
                  <input
                    type="text"
                    value={rtDestinationCode}
                    onChange={(e) => setRtDestinationCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Jarak (KM)</label>
                <input
                  type="number"
                  value={rtDistance}
                  onChange={(e) => setRtDistance(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-800"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setActiveModal(null)} className="px-4 py-2 border border-slate-200 rounded-xl text-sm cursor-pointer">Batal</button>
                <button type="submit" disabled={modalSubmitting} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold flex items-center gap-1.5 cursor-pointer">
                  {modalSubmitting ? <LoaderIcon size={16} /> : <span>Perbarui</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: TOPUP BALANCE */}
      {activeModal === "topup" && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-sm w-full p-6 animate-scale-in">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-lg font-bold text-slate-900">Top Up Saldo User</h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <CloseIcon size={18} />
              </button>
            </div>
            
            <form onSubmit={handleTopup} className="space-y-4">
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase">Nama Pengguna</p>
                <p className="font-bold text-slate-800 mt-0.5">{selectedItem.name}</p>
                <p className="text-xs text-slate-500">Saldo saat ini: {formatRupiah(selectedItem.balance || 0)}</p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Jumlah Top Up (Rp)</label>
                <input
                  type="number"
                  required
                  min={10000}
                  value={topupAmount}
                  onChange={(e) => setTopupAmount(Number(e.target.value))}
                  placeholder="Jumlah nominal uang"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Deskripsi / Keterangan</label>
                <input
                  type="text"
                  required
                  value={topupDesc}
                  onChange={(e) => setTopupDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-800"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setActiveModal(null)} className="px-4 py-2 border border-slate-200 rounded-xl text-sm cursor-pointer">Batal</button>
                <button type="submit" disabled={modalSubmitting} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold flex items-center gap-1.5 cursor-pointer">
                  {modalSubmitting ? <LoaderIcon size={16} /> : <span>Top Up</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: ADD SCHEDULE */}
      {activeModal === "addSchedule" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-lg w-full p-6 animate-scale-in overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-lg font-bold text-slate-900">Buat Jadwal & Generate Kursi</h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <CloseIcon size={18} />
              </button>
            </div>
            
            <form onSubmit={handleAddSchedule} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Rute Perjalanan <span className="text-rose-500">*</span></label>
                <select
                  required
                  value={schRouteId}
                  onChange={(e) => setSchRouteId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-800"
                >
                  <option value="">-- Pilih Rute --</option>
                  {filteredRoutes.map((r) => (
                    <option key={r.id} value={r.id}>
                      [{r.transportType.toUpperCase()}] {r.origin} ({r.originCode}) &rarr; {r.destination} ({r.destinationCode})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Nama Kendaraan</label>
                  <input
                    type="text"
                    required
                    value={schVehicleName}
                    onChange={(e) => setSchVehicleName(e.target.value)}
                    placeholder="Contoh: Argo Wilis"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Kode Kendaraan (No.)</label>
                  <input
                    type="text"
                    required
                    value={schVehicleCode}
                    onChange={(e) => setSchVehicleCode(e.target.value.toUpperCase())}
                    placeholder="Contoh: KA-002 / GA-201"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Waktu Berangkat</label>
                  <input
                    type="datetime-local"
                    required
                    value={schDeparture}
                    onChange={(e) => setSchDeparture(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Waktu Sampai</label>
                  <input
                    type="datetime-local"
                    required
                    value={schArrival}
                    onChange={(e) => setSchArrival(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-800"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <h4 className="font-bold text-slate-800 text-xs mb-3">Kapasitas Kursi & Harga per Kelas</h4>
                <div className="grid grid-cols-3 gap-3">
                  {/* Economy */}
                  <div className="bg-slate-50 p-2.5 rounded-xl border space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Ekonomi</p>
                    <input
                      type="number"
                      value={schSeatsEco}
                      onChange={(e) => setSchSeatsEco(Number(e.target.value))}
                      placeholder="Kursi"
                      className="w-full p-1.5 border rounded bg-white text-xs text-slate-800"
                      title="Jumlah kursi ekonomi"
                    />
                    <input
                      type="number"
                      value={schPriceEco}
                      onChange={(e) => setSchPriceEco(Number(e.target.value))}
                      placeholder="Harga"
                      className="w-full p-1.5 border rounded bg-white text-xs font-semibold text-slate-800"
                      title="Harga tiket ekonomi"
                    />
                  </div>
                  {/* Executive */}
                  <div className="bg-slate-50 p-2.5 rounded-xl border space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Eksekutif</p>
                    <input
                      type="number"
                      value={schSeatsExe}
                      onChange={(e) => setSchSeatsExe(Number(e.target.value))}
                      placeholder="Kursi"
                      className="w-full p-1.5 border rounded bg-white text-xs text-slate-800"
                      title="Jumlah kursi eksekutif"
                    />
                    <input
                      type="number"
                      value={schPriceExe}
                      onChange={(e) => setSchPriceExe(Number(e.target.value))}
                      placeholder="Harga"
                      className="w-full p-1.5 border rounded bg-white text-xs font-semibold text-slate-800"
                      title="Harga tiket eksekutif"
                    />
                  </div>
                  {/* VIP */}
                  <div className="bg-slate-50 p-2.5 rounded-xl border space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">VIP</p>
                    <input
                      type="number"
                      value={schSeatsVip}
                      onChange={(e) => setSchSeatsVip(Number(e.target.value))}
                      placeholder="Kursi"
                      className="w-full p-1.5 border rounded bg-white text-xs text-slate-800"
                      title="Jumlah kursi VIP"
                    />
                    <input
                      type="number"
                      value={schPriceVip}
                      onChange={(e) => setSchPriceVip(Number(e.target.value))}
                      placeholder="Harga"
                      className="w-full p-1.5 border rounded bg-white text-xs font-semibold text-slate-800"
                      title="Harga tiket VIP"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setActiveModal(null)} className="px-4 py-2 border border-slate-200 rounded-xl text-sm cursor-pointer">Batal</button>
                <button type="submit" disabled={modalSubmitting} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-500/10">
                  {modalSubmitting ? <LoaderIcon size={16} /> : <span>Buat Jadwal</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: ADD USER */}
      {activeModal === "addUser" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-md w-full p-6 animate-scale-in">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-lg font-bold text-slate-900">
                {isEditUserMode ? "Ubah Data Pengguna" : "Buat User / Staff Baru"}
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <CloseIcon size={18} />
              </button>
            </div>
            
            <form onSubmit={isEditUserMode ? handleEditUserSubmit : handleAddUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={usrName}
                  onChange={(e) => setUsrName(e.target.value)}
                  placeholder="Nama Lengkap"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Username</label>
                  <input
                    type="text"
                    required
                    value={usrUsername}
                    disabled={isEditUserMode}
                    onChange={(e) => setUsrUsername(e.target.value.toLowerCase().replace(/\s+/g, ""))}
                    placeholder="username"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-800 disabled:bg-slate-50 disabled:text-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Role Akses</label>
                  <select
                    value={usrRole}
                    onChange={(e) => setUsrRole(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800"
                  >
                    <option value="user">User / Penumpang</option>
                    <option value="admin">Administrator</option>
                    <option value="petugas_kereta">Petugas Kereta</option>
                    <option value="petugas_pesawat">Petugas Pesawat</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Email</label>
                  <input
                    type="email"
                    required
                    value={usrEmail}
                    onChange={(e) => setUsrEmail(e.target.value)}
                    placeholder="email@domain.com"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">No. Telepon</label>
                  <input
                    type="text"
                    value={usrPhone}
                    onChange={(e) => setUsrPhone(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="081xxx"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Password {isEditUserMode && "(Kosongkan jika tidak diubah)"}
                </label>
                <input
                  type="password"
                  required={!isEditUserMode}
                  value={usrPassword}
                  onChange={(e) => setUsrPassword(e.target.value)}
                  placeholder={isEditUserMode ? "Masukkan password baru jika ingin diubah" : "Min. 6 karakter"}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-800"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setActiveModal(null)} className="px-4 py-2 border border-slate-200 rounded-xl text-sm cursor-pointer">Batal</button>
                <button type="submit" disabled={modalSubmitting} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold flex items-center gap-1.5 cursor-pointer">
                  {modalSubmitting ? <LoaderIcon size={16} /> : <span>{isEditUserMode ? "Simpan" : "Buat"}</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL 6: MANIFEST & SEAT MAP */}
      {showManifestModal && manifestSchedule && (() => {
        const isKereta = manifestSchedule.route?.transportType === "kereta";
        const rowsStart = isKereta ? (selectedWagon - 1) * 5 + 1 : 1;
        const rowsEnd = isKereta ? selectedWagon * 5 : 15;

        const displayedPassengers = manifestPassengers.filter((p) => {
          if (!isKereta) return true;
          const seatNum = p.seatNumber || "";
          const match = seatNum.match(/(\d+)/);
          if (!match) return false;
          const row = parseInt(match[1]);
          return row >= rowsStart && row <= rowsEnd;
        });

        const filteredDisplayedPassengers = displayedPassengers.filter((p) => {
          if (!manifestSearch) return true;
          const query = manifestSearch.toLowerCase();
          return (
            p.passengerName?.toLowerCase().includes(query) ||
            p.passengerIdNumber?.toLowerCase().includes(query) ||
            p.seatNumber?.toLowerCase().includes(query)
          );
        });

        const totalBaggage = manifestPassengers.reduce((sum, p) => sum + (Number(p.baggageWeight) || 0), 0);
        const maxBaggageCapacity = 500;
        const isOverweight = totalBaggage > maxBaggageCapacity;

        const boardedCount = manifestPassengers.filter((p) => p.boardingStatus === "Boarded").length;
        const totalCount = manifestPassengers.length;
        const boardedPercentage = totalCount > 0 ? Math.round((boardedCount / totalCount) * 100) : 0;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-4xl w-full p-6 animate-scale-in overflow-y-auto max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 font-sans">Manifest & Peta Kursi Penumpang</h3>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">
                    {manifestSchedule.vehicleName} ({manifestSchedule.vehicleCode}) &bull; {manifestSchedule.route?.origin} &rarr; {manifestSchedule.route?.destination}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  {/* Progress Boarding Tracker */}
                  {!manifestLoading && totalCount > 0 && (
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Progres Boarding</span>
                      <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/50 px-2.5 py-1 rounded-xl shadow-inner">
                        <div className="w-16 h-2.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
                            style={{ width: `${boardedPercentage}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-black text-slate-700 font-mono">{boardedCount}/{totalCount} ({boardedPercentage}%)</span>
                      </div>
                    </div>
                  )}
                  {!manifestLoading && totalCount > 0 && (
                    <button
                      onClick={() => {
                        setIsPrintingManifest(true);
                        setTimeout(() => {
                          window.print();
                          setIsPrintingManifest(false);
                        }, 200);
                      }}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/10 flex items-center gap-1.5 cursor-pointer transition-all no-print border border-blue-500"
                    >
                      <span>🖨️ Cetak Manifest</span>
                    </button>
                  )}
                  <button onClick={() => setShowManifestModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer p-1.5 rounded-lg hover:bg-slate-50">
                    <CloseIcon size={18} />
                  </button>
                </div>
              </div>

              {manifestLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <LoaderIcon size={32} className="text-blue-600 animate-spin" />
                  <p className="text-slate-500 text-xs font-semibold">Memuat manifest...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Wagon Selector (For Trains only) */}
                  {isKereta && (
                    <div className="flex items-center gap-4 bg-slate-50 border border-slate-200/60 px-4 py-3 rounded-xl text-xs font-semibold">
                      <span className="text-slate-500">Pilih Gerbong:</span>
                      <div className="flex gap-2">
                        {[1, 2, 3].map((wNum) => {
                          const wagonClass = wNum === 1 ? "Gerbong Eksekutif 1" : wNum === 2 ? "Gerbong Eksekutif 2" : "Gerbong Ekonomi 1";
                          return (
                            <button
                              key={wNum}
                              type="button"
                              onClick={() => setSelectedWagon(wNum)}
                              className={`px-3.5 py-1.5 border rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                selectedWagon === wNum
                                  ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                              }`}
                            >
                              {wagonClass}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Cargo / Baggage warning (For Flights only) */}
                  {!isKereta && (
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 border border-slate-200/60 px-4 py-3 rounded-xl text-xs font-semibold">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">Total Berat Bagasi Lambung:</span>
                        <span className={`font-mono font-bold text-sm ${isOverweight ? "text-rose-600 animate-pulse" : "text-emerald-700"}`}>
                          {totalBaggage} Kg / {maxBaggageCapacity} Kg
                        </span>
                      </div>
                      {isOverweight && (
                        <div className="px-3 py-1 rounded bg-rose-50 border border-rose-100 text-rose-800 text-[10px] font-bold">
                          ⚠️ Kargo Overweight: Kapasitas Lambung Melebihi Batas!
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
                    {/* Visual Seat Map (5 columns in grid) */}
                    <div className="lg:col-span-5 bg-slate-50 p-4 rounded-xl border border-slate-200/60 flex flex-col items-center">
                      <h4 className="font-bold text-xs text-slate-600 uppercase tracking-wider mb-4">
                        Peta Kursi Kabin {isKereta ? `(Gerbong ${selectedWagon})` : ""}
                      </h4>
                      
                      {/* Front/Driver Indicator */}
                      <div className="w-full bg-slate-200 text-slate-500 text-[10px] py-1 text-center font-bold rounded-lg mb-6 uppercase tracking-widest border border-slate-300">
                        Bagian Depan / Driver
                      </div>

                      {/* Seat grid */}
                      <div className="space-y-2.5 max-h-[350px] overflow-y-auto w-full px-2">
                        {Array.from({ length: rowsEnd - rowsStart + 1 }, (_, index) => {
                          const rowNum = rowsStart + index;
                          return (
                            <div key={rowNum} className="flex items-center justify-center gap-2">
                              {/* Seat A */}
                              {renderSeat(`${rowNum}A`)}
                              {/* Seat B */}
                              {renderSeat(`${rowNum}B`)}
                              
                              {/* Row Number (Aisle) */}
                              <div className="w-6 text-center text-xs font-bold text-slate-400 font-mono">
                                {rowNum}
                              </div>
                              
                              {/* Seat C */}
                              {renderSeat(`${rowNum}C`)}
                              {/* Seat D */}
                              {renderSeat(`${rowNum}D`)}
                            </div>
                          );
                        })}
                      </div>

                      {/* Legend */}
                      <div className="flex items-center gap-4 mt-6 text-xs border-t border-slate-200/80 pt-3 w-full justify-center">
                        <div className="flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded bg-white border border-slate-300 inline-block"></span>
                          <span className="text-slate-500 text-[10px] font-medium">Tersedia</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded bg-blue-600 border border-blue-700 inline-block"></span>
                          <span className="text-slate-500 text-[10px] font-medium">Terisi</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded bg-emerald-600 border border-emerald-700 inline-block"></span>
                          <span className="text-slate-500 text-[10px] font-medium">Boarded</span>
                        </div>
                      </div>
                    </div>

                    {/* Manifest List Table (7 columns in grid) */}
                    <div className="lg:col-span-7 flex flex-col min-h-[300px]">
                      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between mb-3">
                        <h4 className="font-bold text-xs text-slate-600 uppercase tracking-wider">
                          Daftar Manifest Penumpang {isKereta ? `(Gerbong ${selectedWagon})` : ""} ({filteredDisplayedPassengers.length})
                        </h4>
                        <div className="relative max-w-[200px] w-full">
                          <input
                            type="text"
                            value={manifestSearch}
                            onChange={(e) => setManifestSearch(e.target.value)}
                            placeholder="Cari nama, NIK, kursi..."
                            className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-[11px] text-slate-800 bg-white"
                          />
                        </div>
                      </div>
                      
                      <div className="border border-slate-200/60 rounded-xl overflow-hidden bg-white flex-1 overflow-y-auto max-h-[420px]">
                        <table className="w-full text-left text-xs text-slate-600 border-collapse">
                          <thead>
                            <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 border-b border-slate-100 uppercase tracking-wider">
                              <th className="p-3">Kursi</th>
                              <th className="p-3">Nama</th>
                              <th className="p-3">NIK</th>
                              {!isKereta && <th className="p-3">Bagasi (Kg)</th>}
                              <th className="p-3">Status</th>
                              <th className="p-3 text-right">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {filteredDisplayedPassengers.length === 0 ? (
                              <tr>
                                <td colSpan={isKereta ? 5 : 6} className="p-8 text-center text-slate-400 font-medium italic">
                                  {manifestSearch ? "Pencarian manifest tidak ditemukan." : "Belum ada penumpang terdaftar untuk gerbong/kabin ini."}
                                </td>
                              </tr>
                            ) : (
                              filteredDisplayedPassengers
                                .sort((a, b) => {
                                  const parseSeat = (s: string) => {
                                    const match = s.match(/^[EXV]?(\d+)([A-F])$/i);
                                    return match ? { num: parseInt(match[1]), letter: match[2].toUpperCase() } : { num: 999, letter: s };
                                  };
                                  const seatA = parseSeat(a.seatNumber || "");
                                  const seatB = parseSeat(b.seatNumber || "");
                                  if (seatA.num !== seatB.num) return seatA.num - seatB.num;
                                  return seatA.letter.localeCompare(seatB.letter);
                                })
                                .map((p) => (
                                  <tr key={p.id} className="hover:bg-slate-50/50">
                                    <td className="p-3 font-mono font-bold text-blue-600">{p.seatNumber}</td>
                                    <td className="p-3 font-semibold text-slate-800">{p.passengerName}</td>
                                    <td className="p-3 font-mono text-slate-500">{p.passengerIdNumber || "-"}</td>
                                    {!isKereta && (
                                      <td className="p-3">
                                        <input
                                          type="number"
                                          min="0"
                                          value={p.baggageWeight || ""}
                                          onChange={(e) => handleUpdateBaggage(p.id, Number(e.target.value))}
                                          className="w-16 px-1.5 py-1 border border-slate-200 rounded text-center text-xs font-mono font-bold"
                                          placeholder="0"
                                        />
                                      </td>
                                    )}
                                    <td className="p-3">
                                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                        p.boardingStatus === "Boarded" ? "bg-emerald-50 text-emerald-700" : "bg-slate-50 text-slate-500"
                                      }`}>
                                        {p.boardingStatus === "Boarded" ? "BOARDED" : "BOOKED"}
                                      </span>
                                    </td>
                                    <td className="p-3 text-right">
                                      <button
                                        onClick={() => handleToggleBoarding(p.id)}
                                        className={`px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                                          p.boardingStatus === "Boarded"
                                            ? "bg-slate-100 hover:bg-slate-200 text-slate-600"
                                            : "bg-blue-600 hover:bg-blue-700 text-white"
                                        }`}
                                      >
                                        {p.boardingStatus === "Boarded" ? "Batal" : "Check-in"}
                                      </button>
                                    </td>
                                  </tr>
                                ))
                            )}
                          </tbody>
                        </table>
                    </div>
                  </div>

                  {/* AIRPORT/STATION AUDIO ANNOUNCEMENT BROADCASTER (No-Print) */}
                  <div className="bg-slate-950 border border-slate-900 text-white rounded-2xl p-5 mt-6 no-print shadow-2xl relative overflow-hidden">
                    {/* Live indicator decoration */}
                    {isBroadcasting && (
                      <div className="absolute top-3 right-4 flex items-center gap-1.5 bg-rose-500/20 border border-rose-500/40 text-rose-400 text-[9px] font-black tracking-widest px-2.5 py-1 rounded-full uppercase animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block animate-ping"></span>
                        <span>ON AIR / LIVE</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">🔊</span>
                      <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-200">
                        Pusat Pengumuman Suara {isKereta ? "Stasiun" : "Bandara"} (Voice TTS Broadcaster)
                      </h4>
                    </div>

                    <p className="text-[11px] text-slate-400 font-medium mb-5 leading-relaxed">
                      Gunakan fitur ini untuk menyiarkan pengumuman keberangkatan atau keterlambatan armada secara langsung. 
                      Sistem akan melantunkan nada bel pengumuman {isKereta ? "stasiun" : "bandara"} (chime) secara otomatis sebelum membacakan teks dengan suara digital.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                      {/* Left: Template selection */}
                      <div className="md:col-span-3 flex flex-col gap-2">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Pilih Template Siaran</span>
                        <div className="flex flex-col gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSelectAnnounceTemplate("boarding")}
                            className="w-full text-left px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 hover:text-white text-slate-300 rounded-xl text-xs font-bold transition-all border border-slate-800/80 cursor-pointer shadow-sm"
                          >
                            📢 Panggilan Boarding
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSelectAnnounceTemplate("delay")}
                            className="w-full text-left px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 hover:text-white text-slate-300 rounded-xl text-xs font-bold transition-all border border-slate-800/80 cursor-pointer shadow-sm"
                          >
                            ⏱️ Info Delay (Keterlambatan)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSelectAnnounceTemplate("last_call")}
                            className="w-full text-left px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 hover:text-white text-slate-300 rounded-xl text-xs font-bold transition-all border border-slate-800/80 cursor-pointer shadow-sm"
                          >
                            ⚠️ Panggilan Terakhir (Last Call)
                          </button>
                        </div>
                      </div>

                      {/* Right: Text editor and speak button */}
                      <div className="md:col-span-9 flex flex-col gap-2">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Editor Teks Pengumuman</span>
                        <textarea
                          rows={3}
                          value={announcementText}
                          onChange={(e) => setAnnouncementText(e.target.value)}
                          placeholder="Ketik pengumuman khusus di sini..."
                          className="w-full bg-slate-900 border border-slate-850 rounded-xl p-3.5 text-xs text-slate-200 font-medium placeholder-slate-600 focus:outline-none focus:border-slate-850 focus:bg-slate-900/50 resize-none leading-relaxed transition-all"
                        />
                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            disabled={isBroadcasting}
                            onClick={() => handleSpeakAnnouncement(announcementText)}
                            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md ${
                              isBroadcasting
                                ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-750"
                                : "bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer shadow-indigo-500/10 hover:shadow-indigo-500/20 border border-indigo-500"
                            }`}
                          >
                            {isBroadcasting ? (
                              <>
                                <LoaderIcon size={14} className="animate-spin text-slate-500" />
                                <span>Sedang Menyiarkan...</span>
                              </>
                            ) : (
                              <>
                                <span>🔊 Putar & Siarkan Suara</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            )}
            </div>
          </div>
        );
      })()}

      {/* MODAL 7: DELAY UPDATE (KERETA) */}
      {showDelayModal && selectedSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-sm w-full p-6 animate-scale-in">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>⏱️</span>
                <span>Atur Keterlambatan Kereta</span>
              </h3>
              <button onClick={() => setShowDelayModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <CloseIcon size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveDelay} className="space-y-4">
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase">Kereta Api</p>
                <p className="font-bold text-slate-800 mt-0.5">{selectedSchedule.vehicleName} ({selectedSchedule.vehicleCode})</p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Pilih Estimasi Keterlambatan
                </label>
                <select
                  value={delayMinutes}
                  onChange={(e) => setDelayMinutes(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 bg-white font-medium"
                >
                  <option value="Tepat Waktu">Tepat Waktu</option>
                  <option value="Terlambat 10 Menit">Terlambat 10 Menit</option>
                  <option value="Terlambat 15 Menit">Terlambat 15 Menit</option>
                  <option value="Terlambat 30 Menit">Terlambat 30 Menit</option>
                  <option value="Terlambat 45 Menit">Terlambat 45 Menit</option>
                  <option value="Terlambat 1 Jam">Terlambat 1 Jam</option>
                  <option value="Terlambat 2 Jam">Terlambat 2 Jam</option>
                </select>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowDelayModal(false)} className="px-4 py-2 border border-slate-200 rounded-xl text-xs cursor-pointer">Batal</button>
                <button type="submit" className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold">
                  Simpan Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 8: GATE & FLIGHT STATUS UPDATE (PESAWAT) */}
      {showGateModal && selectedSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-sm w-full p-6 animate-scale-in">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>✈️</span>
                <span>Kelola Gate & Status</span>
              </h3>
              <button onClick={() => setShowGateModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <CloseIcon size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveGate} className="space-y-4">
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase">Penerbangan</p>
                <p className="font-bold text-slate-800 mt-0.5">{selectedSchedule.vehicleName} ({selectedSchedule.vehicleCode})</p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Nomor Gate Keberangkatan
                </label>
                <input
                  type="text"
                  required
                  value={gateNumber}
                  onChange={(e) => setGateNumber(e.target.value.toUpperCase())}
                  placeholder="Contoh: GATE 2B"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Status Penerbangan (Real-Time)
                </label>
                <select
                  value={flightStatus}
                  onChange={(e) => setFlightStatus(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 bg-white font-medium"
                >
                  <option value="Scheduled">Scheduled</option>
                  <option value="Boarding Now">Boarding Now</option>
                  <option value="Delayed">Delayed</option>
                  <option value="Gate Closed">Gate Closed</option>
                </select>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowGateModal(false)} className="px-4 py-2 border border-slate-200 rounded-xl text-xs cursor-pointer">Batal</button>
                <button type="submit" className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold">
                  Update Gate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINTABLE MANIFEST REPORT (Visible only when printing) */}
      {isPrintingManifest && manifestSchedule && (
        <div className="print-active print-only font-sans p-8 bg-white text-black leading-relaxed">
          <div className="text-center pb-4 mb-6 border-b-2 border-black">
            <h1 className="text-2xl font-bold tracking-wider uppercase">MANIFEST PENUMPANG KEBERANGKATAN</h1>
            <p className="text-xs font-mono mt-1">
              OPERATOR: {user?.name || "Petugas"} &bull; TANGGAL: {new Date().toLocaleDateString("id-ID")}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs mb-6 border border-black p-4 rounded-xl">
            <div>
              <p className="font-bold">KENDARAAN / KODE:</p>
              <p className="font-mono text-sm">{manifestSchedule.vehicleName} ({manifestSchedule.vehicleCode})</p>
            </div>
            <div>
              <p className="font-bold">RUTE PERJALANAN:</p>
              <p className="text-sm">{manifestSchedule.route?.origin} &rarr; {manifestSchedule.route?.destination}</p>
            </div>
            <div>
              <p className="font-bold">TOTAL PENUMPANG:</p>
              <p className="text-sm">{manifestPassengers.length} Orang</p>
            </div>
            <div>
              <p className="font-bold">STATUS BOARDING:</p>
              <p className="text-sm">
                {manifestPassengers.filter(p => p.boardingStatus === "Boarded").length} Boarded / {manifestPassengers.filter(p => p.boardingStatus !== "Boarded").length} Booked
              </p>
            </div>
            {manifestSchedule.route?.transportType === "pesawat" && (
              <div className="col-span-2">
                <p className="font-bold">TOTAL BERAT KARGO BAGASI:</p>
                <p className="text-sm font-mono">
                  {manifestPassengers.reduce((sum, p) => sum + (Number(p.baggageWeight) || 0), 0)} Kg
                </p>
              </div>
            )}
          </div>

          <table className="w-full text-left text-xs border-collapse border border-black">
            <thead>
              <tr className="bg-slate-100 border-b border-black text-[10px] font-bold uppercase tracking-wider">
                <th className="p-2 border-r border-black">Kursi</th>
                <th className="p-2 border-r border-black">Nama Penumpang</th>
                <th className="p-2 border-r border-black">NIK</th>
                {manifestSchedule.route?.transportType === "pesawat" && <th className="p-2 border-r border-black">Bagasi</th>}
                <th className="p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {manifestPassengers
                .sort((a, b) => {
                  const parseSeat = (s: string) => {
                    const match = s.match(/^[EXV]?(\d+)([A-F])$/i);
                    return match ? { num: parseInt(match[1]), letter: match[2].toUpperCase() } : { num: 999, letter: s };
                  };
                  const seatA = parseSeat(a.seatNumber || "");
                  const seatB = parseSeat(b.seatNumber || "");
                  if (seatA.num !== seatB.num) return seatA.num - seatB.num;
                  return seatA.letter.localeCompare(seatB.letter);
                })
                .map((p) => (
                  <tr key={p.id} className="border-b border-black">
                    <td className="p-2 border-r border-black font-mono font-bold">{p.seatNumber}</td>
                    <td className="p-2 border-r border-black font-semibold">{p.passengerName}</td>
                    <td className="p-2 border-r border-black font-mono">{p.passengerIdNumber || "-"}</td>
                    {manifestSchedule.route?.transportType === "pesawat" && (
                      <td className="p-2 border-r border-black font-mono">{p.baggageWeight || 0} Kg</td>
                    )}
                    <td className="p-2 capitalize font-semibold">{p.boardingStatus}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}
