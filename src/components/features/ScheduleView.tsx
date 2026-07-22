"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePatients } from "@/contexts/PatientContext";
import { PageHeader, Spinner, EmptyState } from "@/components/shared/page-bits";
import { NeedsPatient } from "@/components/features/NeedsPatient";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input, Textarea, Label, Select } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { apiGet, apiSend, formatDate, isToday } from "@/lib/client";

interface Shift {
  id: string;
  providerId: string | null;
  providerName: string | null;
  shiftDate: string;
  startTime: string;
  endTime: string;
  isOpen: boolean;
  claimed: boolean;
  notes: string | null;
}

interface ProviderOpt {
  id: string;
  name: string;
}

const empty = {
  shiftDate: "",
  startTime: "09:00",
  endTime: "17:00",
  providerId: "",
  isOpen: false,
  notes: "",
};

export function ScheduleView() {
  const { user } = useAuth();
  const { selectedPatientId } = usePatients();
  const { toast } = useToast();
  const canManage = user?.role !== "PROVIDER";
  const isProvider = user?.role === "PROVIDER";

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [providers, setProviders] = useState<ProviderOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);

  const load = useCallback(async () => {
    if (!selectedPatientId) return;
    setLoading(true);
    try {
      const [s, p] = await Promise.all([
        apiGet<Shift[]>(`/api/schedules?patientId=${selectedPatientId}`),
        apiGet<ProviderOpt[]>(`/api/providers?patientId=${selectedPatientId}`),
      ]);
      setShifts(s);
      setProviders(p);
    } finally {
      setLoading(false);
    }
  }, [selectedPatientId]);

  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    if (!form.shiftDate || !selectedPatientId) {
      toast("Please choose a date", "error");
      return;
    }
    try {
      await apiSend("/api/schedules", "POST", {
        patientId: selectedPatientId,
        shiftDate: form.shiftDate,
        startTime: form.startTime,
        endTime: form.endTime,
        providerId: form.providerId || null,
        isOpen: form.isOpen,
        notes: form.notes,
      });
      toast("Shift added", "success");
      setOpen(false);
      setForm(empty);
      await load();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };

  const claim = async (shift: Shift) => {
    try {
      await apiSend(`/api/schedules/${shift.id}`, "PATCH", { claim: true });
      toast("Shift claimed", "success");
      await load();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };

  const toggleOpen = async (shift: Shift) => {
    try {
      await apiSend(`/api/schedules/${shift.id}`, "PATCH", {
        isOpen: !shift.isOpen,
        claimed: shift.isOpen ? shift.claimed : false,
      });
      await load();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };

  const remove = async (shift: Shift) => {
    try {
      await apiSend(`/api/schedules/${shift.id}`, "DELETE");
      await load();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };

  return (
    <NeedsPatient>
      <div className="p-4 md:p-8 space-y-6">
        <PageHeader
          title="Schedule"
          subtitle="Upcoming and past shifts"
          action={
            canManage ? (
              <Button size="sm" onClick={() => setOpen(true)}>
                <Plus className="w-4 h-4" /> Add Shift
              </Button>
            ) : undefined
          }
        />

        {loading ? (
          <Spinner />
        ) : shifts.length === 0 ? (
          <EmptyState message="No shifts scheduled." />
        ) : (
          <div className="space-y-3">
            {shifts.map((s) => (
              <div
                key={s.id}
                className={`bg-white rounded-3xl border p-5 flex items-center justify-between gap-4 flex-wrap ${
                  isToday(s.shiftDate)
                    ? "border-brand-lime ring-1 ring-brand-lime"
                    : "border-brand-border"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-center justify-center bg-brand-yellow rounded-2xl w-16 h-16 text-brand-dark">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-brand-dark">
                      {formatDate(s.shiftDate)}
                      {isToday(s.shiftDate) && (
                        <span className="ml-2 text-xs bg-brand-lime text-brand-dark px-2 py-0.5 rounded-full">
                          Today
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-brand-muted">
                      {s.startTime}–{s.endTime}
                    </p>
                    <p className="text-sm text-brand-muted">
                      {s.providerName
                        ? `Provider: ${s.providerName}`
                        : s.isOpen
                        ? "Open shift"
                        : "Unassigned"}
                    </p>
                    {s.notes && (
                      <p className="text-sm text-brand-muted mt-1">{s.notes}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {s.isOpen && !s.claimed && (
                    <span className="text-xs font-semibold bg-brand-warning/15 text-brand-warning px-3 py-1 rounded-full">
                      OPEN
                    </span>
                  )}
                  {isProvider && s.isOpen && !s.claimed && (
                    <Button size="sm" variant="secondary" onClick={() => claim(s)}>
                      Claim
                    </Button>
                  )}
                  {canManage && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleOpen(s)}
                      >
                        {s.isOpen ? "Close" : "Mark Open"}
                      </Button>
                      <button
                        onClick={() => remove(s)}
                        className="p-2 rounded-lg text-brand-muted hover:bg-brand-yellow"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Add shift">
        <div className="space-y-4">
          <div>
            <Label>Date</Label>
            <Input
              type="date"
              value={form.shiftDate}
              onChange={(e) => setForm({ ...form, shiftDate: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Start</Label>
              <Input
                type="time"
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
              />
            </div>
            <div>
              <Label>End</Label>
              <Input
                type="time"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>Assign provider</Label>
            <Select
              value={form.providerId}
              onChange={(e) => setForm({ ...form, providerId: e.target.value })}
            >
              <option value="">Unassigned</option>
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm text-brand-dark">
            <input
              type="checkbox"
              checked={form.isOpen}
              onChange={(e) => setForm({ ...form, isOpen: e.target.checked })}
            />
            Mark as open shift (needs coverage)
          </label>
          <div>
            <Label>Notes</Label>
            <Textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <Button onClick={create} className="w-full">
            Add Shift
          </Button>
        </div>
      </Modal>
    </NeedsPatient>
  );
}
