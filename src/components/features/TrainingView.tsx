"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Trash2,
  BookOpen,
  Video,
  FileText,
  ImageIcon,
  Link as LinkIcon,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePatients } from "@/contexts/PatientContext";
import { PageHeader, Spinner, EmptyState } from "@/components/shared/page-bits";
import { NeedsPatient } from "@/components/features/NeedsPatient";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input, Textarea, Label, Select } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { apiGet, apiSend } from "@/lib/client";

interface Media {
  id: string;
  displayName: string;
  mediaType: string;
  url: string;
}
interface ModuleT {
  id: string;
  name: string;
  instructions: string | null;
  media: Media[];
}
interface CategoryT {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  modules: ModuleT[];
}

const mediaIcon: Record<string, React.ReactNode> = {
  VIDEO: <Video className="w-4 h-4" />,
  IMAGE: <ImageIcon className="w-4 h-4" />,
  PDF: <FileText className="w-4 h-4" />,
  DOCUMENT: <FileText className="w-4 h-4" />,
  LINK: <LinkIcon className="w-4 h-4" />,
};

export function TrainingView() {
  const { user } = useAuth();
  const { selectedPatientId } = usePatients();
  const { toast } = useToast();
  const canManage = user?.role !== "PROVIDER";

  const [categories, setCategories] = useState<CategoryT[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const [catModal, setCatModal] = useState(false);
  const [catName, setCatName] = useState("");
  const [modModal, setModModal] = useState<string | null>(null);
  const [modName, setModName] = useState("");
  const [modInstr, setModInstr] = useState("");
  const [mediaModal, setMediaModal] = useState<{ moduleId: string } | null>(null);
  const [mediaForm, setMediaForm] = useState({
    displayName: "",
    url: "",
    mediaType: "VIDEO",
  });

  const load = useCallback(async () => {
    if (!selectedPatientId) return;
    setLoading(true);
    try {
      setCategories(
        await apiGet<CategoryT[]>(
          `/api/training/categories?patientId=${selectedPatientId}`
        )
      );
    } finally {
      setLoading(false);
    }
  }, [selectedPatientId]);

  useEffect(() => {
    load();
  }, [load]);

  const addCategory = async () => {
    if (!catName || !selectedPatientId) return;
    try {
      await apiSend("/api/training/categories", "POST", {
        patientId: selectedPatientId,
        name: catName,
      });
      setCatModal(false);
      setCatName("");
      await load();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };

  const addModule = async () => {
    if (!modName || !modModal || !selectedPatientId) return;
    try {
      await apiSend("/api/training/modules", "POST", {
        patientId: selectedPatientId,
        categoryId: modModal,
        name: modName,
        instructions: modInstr,
      });
      setModModal(null);
      setModName("");
      setModInstr("");
      await load();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };

  const addMedia = async () => {
    if (!mediaForm.displayName || !mediaForm.url || !mediaModal || !selectedPatientId)
      return;
    try {
      await apiSend("/api/training/media", "POST", {
        patientId: selectedPatientId,
        moduleId: mediaModal.moduleId,
        ...mediaForm,
      });
      setMediaModal(null);
      setMediaForm({ displayName: "", url: "", mediaType: "VIDEO" });
      await load();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };

  const del = async (kind: string, id: string) => {
    try {
      await apiSend(`/api/training/${kind}?id=${id}`, "DELETE");
      await load();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };

  return (
    <NeedsPatient>
      <div className="p-4 md:p-8 space-y-6">
        <PageHeader
          title="Training Hub"
          subtitle="Care guides, videos and documents"
          action={
            canManage ? (
              <Button size="sm" onClick={() => setCatModal(true)}>
                <Plus className="w-4 h-4" /> Category
              </Button>
            ) : undefined
          }
        />

        {loading ? (
          <Spinner />
        ) : categories.length === 0 ? (
          <EmptyState message="No training categories yet." />
        ) : (
          <div className="space-y-4">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="bg-white rounded-3xl border border-brand-border overflow-hidden"
              >
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="p-2 rounded-xl"
                      style={{ background: cat.color ?? "#D4E157" }}
                    >
                      <BookOpen className="w-5 h-5 text-brand-dark" />
                    </div>
                    <h3 className="font-bold text-brand-dark">{cat.name}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {canManage && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setModModal(cat.id)}
                        >
                          <Plus className="w-4 h-4" /> Module
                        </Button>
                        <button
                          onClick={() => del("categories", cat.id)}
                          className="p-2 rounded-lg text-brand-muted hover:bg-brand-yellow"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div className="px-5 pb-4 space-y-2">
                  {cat.modules.length === 0 && (
                    <p className="text-sm text-brand-muted">No modules yet.</p>
                  )}
                  {cat.modules.map((m) => (
                    <div
                      key={m.id}
                      className="rounded-2xl border border-brand-border"
                    >
                      <button
                        onClick={() =>
                          setExpanded((e) => ({ ...e, [m.id]: !e[m.id] }))
                        }
                        className="w-full flex items-center justify-between px-4 py-3 text-left"
                      >
                        <span className="font-medium text-brand-dark">
                          {m.name}
                        </span>
                        <ChevronRight
                          className={`w-4 h-4 transition-transform ${
                            expanded[m.id] ? "rotate-90" : ""
                          }`}
                        />
                      </button>
                      {expanded[m.id] && (
                        <div className="px-4 pb-4 space-y-2">
                          {m.instructions && (
                            <p className="text-sm text-brand-muted">
                              {m.instructions}
                            </p>
                          )}
                          {m.media.map((md) => (
                            <a
                              key={md.id}
                              href={md.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-sm text-brand-info hover:underline"
                            >
                              {mediaIcon[md.mediaType] ?? <LinkIcon className="w-4 h-4" />}
                              {md.displayName}
                            </a>
                          ))}
                          <div className="flex items-center gap-2 pt-1">
                            {canManage && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    setMediaModal({ moduleId: m.id })
                                  }
                                >
                                  <Plus className="w-4 h-4" /> Media
                                </Button>
                                <button
                                  onClick={() => del("modules", m.id)}
                                  className="p-1.5 rounded-lg text-brand-muted hover:bg-brand-yellow"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={catModal} onClose={() => setCatModal(false)} title="Add category">
        <div className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input value={catName} onChange={(e) => setCatName(e.target.value)} />
          </div>
          <Button onClick={addCategory} className="w-full">
            Add Category
          </Button>
        </div>
      </Modal>

      <Modal
        open={modModal !== null}
        onClose={() => setModModal(null)}
        title="Add module"
      >
        <div className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input value={modName} onChange={(e) => setModName(e.target.value)} />
          </div>
          <div>
            <Label>Instructions</Label>
            <Textarea
              rows={3}
              value={modInstr}
              onChange={(e) => setModInstr(e.target.value)}
            />
          </div>
          <Button onClick={addModule} className="w-full">
            Add Module
          </Button>
        </div>
      </Modal>

      <Modal
        open={mediaModal !== null}
        onClose={() => setMediaModal(null)}
        title="Add media"
      >
        <div className="space-y-4">
          <div>
            <Label>Display name</Label>
            <Input
              value={mediaForm.displayName}
              onChange={(e) =>
                setMediaForm({ ...mediaForm, displayName: e.target.value })
              }
            />
          </div>
          <div>
            <Label>Type</Label>
            <Select
              value={mediaForm.mediaType}
              onChange={(e) =>
                setMediaForm({ ...mediaForm, mediaType: e.target.value })
              }
            >
              <option value="VIDEO">Video</option>
              <option value="IMAGE">Image</option>
              <option value="PDF">PDF</option>
              <option value="DOCUMENT">Document</option>
              <option value="LINK">Link</option>
            </Select>
          </div>
          <div>
            <Label>URL</Label>
            <Input
              value={mediaForm.url}
              onChange={(e) => setMediaForm({ ...mediaForm, url: e.target.value })}
              placeholder="https://..."
            />
          </div>
          <Button onClick={addMedia} className="w-full">
            Add Media
          </Button>
        </div>
      </Modal>
    </NeedsPatient>
  );
}
