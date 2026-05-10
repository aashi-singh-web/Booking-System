import React, { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { format, parseISO } from "date-fns";
import { AlertCircle, Calendar, ChevronLeft, Loader2, Mail, Star } from "lucide-react";
import { Booking, Expert, Slot } from "./types";

type View = "list" | "detail" | "bookings";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function App() {
  const [view, setView] = useState<View>("list");
  const [selectedExpertId, setSelectedExpertId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <h1 className="font-bold text-slate-900">ExpertConnect</h1>
          <div className="space-x-2">
            <button className="rounded bg-slate-100 px-3 py-1 text-sm" onClick={() => setView("list")}>Experts</button>
            <button className="rounded bg-slate-100 px-3 py-1 text-sm" onClick={() => setView("bookings")}>My Bookings</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl p-4">
        {view === "list" && (
          <ExpertList
            onSelect={(id) => {
              setSelectedExpertId(id);
              setView("detail");
            }}
          />
        )}
        {view === "detail" && selectedExpertId && (
          <ExpertDetail
            id={selectedExpertId}
            onBack={() => setView("list")}
            onBooked={() => setView("bookings")}
            setUserEmail={setUserEmail}
          />
        )}
        {view === "bookings" && <MyBookings initialEmail={userEmail} />}
      </main>
    </div>
  );
}

function ExpertList({ onSelect }: { onSelect: (id: string) => void }) {
  const [experts, setExperts] = useState<Expert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const categories = ["All", "Technology", "Finance", "Design", "Health"];

  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: "8",
          search,
          category: category === "All" ? "" : category,
        });
        const res = await fetch(`/api/experts?${params}`);
        if (!res.ok) throw new Error("Failed to load experts");
        const data = await res.json();
        setExperts(data.experts || []);
        setTotalPages(data.totalPages || 1);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load experts");
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [page, search, category]);

  return (
    <div className="space-y-4">
      <div className="rounded border border-slate-200 bg-white p-4">
        <div className="grid gap-2 sm:grid-cols-3">
          <input
            className="rounded border border-slate-300 p-2 text-sm"
            placeholder="Search by name"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
          />
          <select
            className="rounded border border-slate-300 p-2 text-sm"
            value={category}
            onChange={(e) => {
              setPage(1);
              setCategory(e.target.value);
            }}
          >
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading experts...
        </div>
      )}
      {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>}

      {!loading && !error && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {experts.map((expert) => (
              <button
                type="button"
                key={expert.id}
                onClick={() => onSelect(expert.id)}
                className="rounded border border-slate-200 bg-white p-4 text-left transition hover:border-blue-300"
              >
                <div className="flex items-center gap-3">
                  <img src={expert.avatar} alt={expert.name} className="h-12 w-12 rounded-full object-cover" />
                  <div>
                    <div className="font-semibold">{expert.name}</div>
                    <div className="text-sm text-slate-600">{expert.category}</div>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span>{expert.experience} years</span>
                  <span className="inline-flex items-center gap-1"><Star className="h-3 w-3" />{expert.rating.toFixed(1)}</span>
                </div>
              </button>
            ))}
          </div>
          <div className="flex items-center justify-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage((v) => v - 1)} className="rounded border px-3 py-1 text-sm disabled:opacity-50">Prev</button>
            <span className="text-sm">Page {page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage((v) => v + 1)} className="rounded border px-3 py-1 text-sm disabled:opacity-50">Next</button>
          </div>
        </>
      )}
    </div>
  );
}

function ExpertDetail({
  id,
  onBack,
  onBooked,
  setUserEmail,
}: {
  id: string;
  onBack: () => void;
  onBooked: () => void;
  setUserEmail: (email: string) => void;
}) {
  const [expert, setExpert] = useState<Expert | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", notes: "" });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/experts/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load expert");
        setExpert(data);
        setSlots((data.slots || []).sort((a: Slot, b: Slot) => a.startTime.localeCompare(b.startTime)));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load expert");
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    const socket = io();
    socket.emit("join-expert-room", id);
    socket.on("slot:update", (updatedSlot: Slot) => {
      setSlots((prev) =>
        prev.map((slot) => (slot.id === updatedSlot.id ? { ...slot, ...updatedSlot } : slot)),
      );
      setSelectedSlot((prev) => (prev?.id === updatedSlot.id ? { ...prev, ...updatedSlot } : prev));
    });
    return () => socket.disconnect();
  }, [id]);

  const groupedSlotsByDate = useMemo(() => {
    return slots.reduce<Record<string, Slot[]>>((acc, slot) => {
      if (!acc[slot.date]) acc[slot.date] = [];
      acc[slot.date].push(slot);
      return acc;
    }, {});
  }, [slots]);

  const submitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!selectedSlot || selectedSlot.status === "booked") {
      setError("Please select an available slot");
      return;
    }
    if (!formData.name.trim()) return setError("Name is required");
    if (!EMAIL_REGEX.test(formData.email)) return setError("Valid email is required");
    if (!formData.phone.trim()) return setError("Phone is required");

    setSubmitting(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expertId: id,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          date: selectedSlot.date,
          time: selectedSlot.time,
          notes: formData.notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Booking failed");
      setSuccess("Booking confirmed successfully");
      setUserEmail(formData.email);
      setTimeout(onBooked, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Loading...</div>;
  if (error && !expert) return <div className="rounded border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>;
  if (!expert) return null;

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="inline-flex items-center gap-1 text-sm text-slate-600"><ChevronLeft className="h-4 w-4" />Back</button>
      <div className="rounded border border-slate-200 bg-white p-4">
        <div className="mb-4 flex items-center gap-3">
          <img src={expert.avatar} alt={expert.name} className="h-14 w-14 rounded-full object-cover" />
          <div>
            <h2 className="text-lg font-semibold">{expert.name}</h2>
            <p className="text-sm text-slate-600">{expert.category} • {expert.experience} years • {expert.rating}</p>
          </div>
        </div>
        <p className="text-sm text-slate-700">{expert.bio}</p>
      </div>

      <div className="rounded border border-slate-200 bg-white p-4">
        <h3 className="mb-3 font-semibold">Available Slots (Real-time)</h3>
        <div className="space-y-3">
          {(Object.entries(groupedSlotsByDate) as Array<[string, Slot[]]>).map(([date, daySlots]) => (
            <div key={date}>
              <div className="mb-2 text-sm font-medium">{format(parseISO(date), "MMM dd, yyyy")}</div>
              <div className="flex flex-wrap gap-2">
                {daySlots.map((slot) => (
                  <button
                    key={slot.id}
                    type="button"
                    disabled={slot.status === "booked"}
                    onClick={() => setSelectedSlot(slot)}
                    className={`rounded border px-3 py-1 text-sm ${
                      slot.status === "booked"
                        ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                        : selectedSlot?.id === slot.id
                          ? "border-blue-600 bg-blue-600 text-white"
                          : "border-slate-300"
                    }`}
                  >
                    {slot.time}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={submitBooking} className="space-y-3 rounded border border-slate-200 bg-white p-4">
        <h3 className="font-semibold">Booking Form</h3>
        {selectedSlot && (
          <div className="rounded bg-slate-100 p-2 text-sm">
            Selected: {selectedSlot.date} at {selectedSlot.time}
          </div>
        )}
        <input className="w-full rounded border p-2 text-sm" placeholder="Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
        <input className="w-full rounded border p-2 text-sm" placeholder="Email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
        <input className="w-full rounded border p-2 text-sm" placeholder="Phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
        <textarea className="w-full rounded border p-2 text-sm" placeholder="Notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-green-600">{success}</p>}
        <button type="submit" disabled={submitting} className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
          {submitting ? "Booking..." : "Book Session"}
        </button>
      </form>
    </div>
  );
}

function MyBookings({ initialEmail }: { initialEmail?: string }) {
  const [email, setEmail] = useState(initialEmail || "");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(Boolean(initialEmail));

  const fetchBookings = async () => {
    setError("");
    setSearched(true);
    if (!EMAIL_REGEX.test(email)) {
      setError("Enter a valid email");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load bookings");
      setBookings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded border border-slate-200 bg-white p-4">
        <h2 className="mb-3 font-semibold">My Bookings</h2>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Mail className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
            <input className="w-full rounded border p-2 pl-8 text-sm" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <button onClick={fetchBookings} className="rounded bg-blue-600 px-4 text-sm text-white">Search</button>
        </div>
      </div>
      {loading && <div className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" />Loading bookings...</div>}
      {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {searched && !loading && !error && (
        bookings.length === 0 ? (
          <div className="flex items-center gap-2 rounded border border-slate-200 bg-white p-4 text-sm text-slate-600"><AlertCircle className="h-4 w-4" />No bookings found</div>
        ) : (
          <div className="space-y-2">
            {bookings.map((booking) => (
              <div key={booking.id} className="rounded border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{booking.expertName}</p>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs uppercase">{booking.status}</span>
                </div>
                <div className="mt-2 text-sm text-slate-600">
                  <div className="inline-flex items-center gap-1"><Calendar className="h-4 w-4" />{format(parseISO(booking.startTime), "MMM dd, yyyy HH:mm")}</div>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
