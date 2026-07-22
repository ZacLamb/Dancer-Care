"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Check, X, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePatients } from "@/contexts/PatientContext";
import {
  PageHeader,
  Spinner,
  EmptyState,
} from "@/components/shared/page-bits";
import { NeedsPatient } from "@/components/features/NeedsPatient";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input, Textarea, Label, Select } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { apiGet, apiSend, formatDate } from "@/lib/client";

interface ShiftTask {
  id: string;
  scheduleId: string;
  title: string;
  status: "PENDING" | "COMPLETED" | "INCOMPLETE";
  completionNote: string | null;
  schedule: { shiftDate: string; startTime: string; endTime: string } | null;
}

interface ScheduleOpt {
  id: string;
  shiftDate: string;
  startTime: string;
  endTime: string;
}

export function TasksView() {
  const { user } = useAuth();
  const { selectedPatientId } = usePatients();
  const { toast } = useToast();
  const canManage = user?.role !== "PROVIDER";

  const [tasks, setTasks] = useState<ShiftTask[]>([]);
  const [schedules, setSchedules] = useState<ScheduleOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [noteFor, setNoteFor] = useState<ShiftTask | null>(null);
  const [note, setNote] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newSchedule, setNewSchedule] = useState("");

  const load = useCallback(async () => {
    if (!selectedPatientId) return;
    setLoading(true);
    try {
      const [t, s] = await Promise.all([
        apiGet<ShiftTask[]>(`/api/tasks/shift-tasks?patientId=${selectedPatientId}`),
        apiGet<ScheduleOpt[]>(`/api/schedules?patientId=${selectedPatientId}`),
      ]);
      setTasks(t);
      setSchedules(s);
    } finally {
      setLoading(false);
    }
  }, [selectedPatientId]);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (
    task: ShiftTask,
    status: ShiftTask["status"],
    completionNote?: string
  ) => {
    try {
      await apiSend(`/api/tasks/shift-tasks?id=${task.id}`, "PATCH", {
        status,
        completionNote,
      });
      toast("Task updated", "success");
      await load();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };

  const submitNote = async () => {
    if (!noteFor) return;
    await setStatus(noteFor, "COMPLETED", note);
    setNoteFor(null);
    setNote("");
  };

  const addTask = async () => {
    if (!newTitle || !newSchedule || !selectedPatientId) return;
    try {
      await apiSend("/api/tasks/shift-tasks", "POST", {
        patientId: selectedPatientId,
        scheduleId: newSchedule,
        title: newTitle,
      });
      toast("Task added", "success");
      setAddOpen(false);
      setNewTitle("");
      setNewSchedule("");
      await load();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };

  const removeTask = async (task: ShiftTask) => {
    try {
      await apiSend(`/api/tasks/shift-tasks?id=${task.id}`, "DELETE");
      await load();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };

  const grouped = tasks.reduce<Record<string, ShiftTask[]>>((acc, t) => {
    const key = t.scheduleId;
    (acc[key] ||= []).push(t);
    return acc;
  }, {});

  return (
    <NeedsPatient>
      <div className="p-4 md:p-8 space-y-6">
        <PageHeader
          title="Tasks"
          subtitle="Per-shift care checklist"
          action={
            canManage ? (
              <Button onClick={() => setAddOpen(true)} size="sm">
                <Plus className="w-4 h-4" /> Add Task
              </Button>
            ) : undefined
          }
        />

        {loading ? (
          <Spinner />
        ) : tasks.length === 0 ? (
          <EmptyState message="No tasks yet." />
        ) : (
          <div className="space-y-5">
            {Object.entries(grouped).map(([sid, group]) => {
              const s = group[0].schedule;
              return (
                <div
                  key={sid}
                  className="bg-white rounded-3xl border border-brand-border overflow-hidden"
                >
                  <div className="px-5 py-3 bg-brand-yellow font-semibold text-brand-dark">
                    {s
                      ? `${formatDate(s.shiftDate)} · ${s.startTime}–${s.endTime}`
                      : "Shift"}
                  </div>
                  <ul className="divide-y divide-brand-border">
                    {group.map((t) => (
                      <li
                        key={t.id}
                        className="flex items-start gap-3 px-5 py-4"
                      >
                        <div className="flex-1">
                          <p
                            className={`font-medium ${
                              t.status === "COMPLETED"
                                ? "line-through text-brand-muted"
                                : "text-brand-dark"
                            }`}
                          >
                            {t.title}
                          </p>
                          {t.completionNote && (
                            <p className="text-sm text-brand-muted mt-1">
                              Note: {t.completionNote}
                            </p>
                          )}
                          <span
                            className={`inline-block mt-2 text-xs font-semibold px-2 py-0.5 rounded-full ${
                              t.status === "COMPLETED"
                                ? "bg-brand-success/15 text-brand-success"
                                : t.status === "INCOMPLETE"
                                ? "bg-brand-error/15 text-brand-error"
                                : "bg-brand-warning/15 text-brand-warning"
                            }`}
                          >
                            {t.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            title="Mark complete"
                            onClick={() => {
                              setNoteFor(t);
                              setNote(t.completionNote ?? "");
                            }}
                            className="p-2 rounded-lg text-brand-success hover:bg-brand-success/10"
                          >
                            <Check className="w-5 h-5" />
                          </button>
                          <button
                            title="Mark incomplete"
                            onClick={() => setStatus(t, "INCOMPLETE")}
                            className="p-2 rounded-lg text-brand-error hover:bg-brand-error/10"
                          >
                            <X className="w-5 h-5" />
                          </button>
                          {canManage && (
                            <button
                              title="Delete"
                              onClick={() => removeTask(t)}
                              className="p-2 rounded-lg text-brand-muted hover:bg-brand-yellow"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        open={noteFor !== null}
        onClose={() => setNoteFor(null)}
        title="Complete task"
      >
        <div className="space-y-4">
          <div>
            <Label>Completion note (optional)</Label>
            <Textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add any notes about this task..."
            />
          </div>
          <Button onClick={submitNote} className="w-full">
            Mark Complete
          </Button>
        </div>
      </Modal>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add task">
        <div className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Administer morning medication"
            />
          </div>
          <div>
            <Label>Attach to shift</Label>
            <Select
              value={newSchedule}
              onChange={(e) => setNewSchedule(e.target.value)}
            >
              <option value="">Select a shift</option>
              {schedules.map((s) => (
                <option key={s.id} value={s.id}>
                  {formatDate(s.shiftDate)} · {s.startTime}–{s.endTime}
                </option>
              ))}
            </Select>
          </div>
          <Button onClick={addTask} className="w-full">
            Add Task
          </Button>
        </div>
      </Modal>
    </NeedsPatient>
  );
}
