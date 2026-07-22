"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Send, MessageSquare, Megaphone } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePatients } from "@/contexts/PatientContext";
import {
  PageHeader,
  Spinner,
  EmptyState,
  LabelBadge,
} from "@/components/shared/page-bits";
import { NeedsPatient } from "@/components/features/NeedsPatient";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input, Textarea, Label, Select } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { apiGet, apiSend } from "@/lib/client";

interface Comment {
  id: string;
  authorName: string;
  body: string;
}
interface Announcement {
  id: string;
  authorName: string;
  label: string;
  title: string;
  body: string | null;
  createdAt: string;
  comments: Comment[];
}
interface Contact {
  userId: string;
  name: string;
  role: string;
}
interface DM {
  id: string;
  senderId: string;
  receiverId: string;
  body: string;
  createdAt: string;
}

export function MessagesView() {
  const { user } = useAuth();
  const { selectedPatientId } = usePatients();
  const { toast } = useToast();

  const [tab, setTab] = useState<"feed" | "dm">("feed");
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [messages, setMessages] = useState<DM[]>([]);
  const [activeContact, setActiveContact] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [postOpen, setPostOpen] = useState(false);
  const [postForm, setPostForm] = useState({
    title: "",
    body: "",
    label: "ANNOUNCEMENT",
  });
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [dmText, setDmText] = useState("");

  const load = useCallback(async () => {
    if (!selectedPatientId) return;
    setLoading(true);
    try {
      const [a, m] = await Promise.all([
        apiGet<Announcement[]>(
          `/api/announcements?patientId=${selectedPatientId}`
        ),
        apiGet<{ contacts: Contact[]; messages: DM[] }>(
          `/api/messages?patientId=${selectedPatientId}`
        ),
      ]);
      setAnnouncements(a);
      setContacts(m.contacts);
      setMessages(m.messages);
      setActiveContact((c) => c ?? m.contacts[0]?.userId ?? null);
    } finally {
      setLoading(false);
    }
  }, [selectedPatientId]);

  useEffect(() => {
    load();
  }, [load]);

  const post = async () => {
    if (!postForm.title || !selectedPatientId) return;
    try {
      await apiSend("/api/announcements", "POST", {
        patientId: selectedPatientId,
        ...postForm,
      });
      setPostOpen(false);
      setPostForm({ title: "", body: "", label: "ANNOUNCEMENT" });
      await load();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };

  const comment = async (id: string) => {
    const body = commentText[id];
    if (!body) return;
    try {
      await apiSend(`/api/announcements/${id}/comments`, "POST", { body });
      setCommentText((c) => ({ ...c, [id]: "" }));
      await load();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };

  const sendDm = async () => {
    if (!dmText || !activeContact || !selectedPatientId) return;
    try {
      await apiSend("/api/messages", "POST", {
        patientId: selectedPatientId,
        receiverId: activeContact,
        body: dmText,
      });
      setDmText("");
      await load();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };

  const threadMessages = messages.filter(
    (m) => m.senderId === activeContact || m.receiverId === activeContact
  );

  return (
    <NeedsPatient>
      <div className="p-4 md:p-8 space-y-6">
        <PageHeader
          title="Messages"
          subtitle="Announcements and direct messages"
          action={
            tab === "feed" ? (
              <Button size="sm" onClick={() => setPostOpen(true)}>
                <Plus className="w-4 h-4" /> Post
              </Button>
            ) : undefined
          }
        />

        <div className="flex gap-2">
          <button
            onClick={() => setTab("feed")}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
              tab === "feed"
                ? "bg-brand-dark text-white"
                : "bg-white border border-brand-border text-brand-dark"
            }`}
          >
            <Megaphone className="w-4 h-4" /> Feed
          </button>
          <button
            onClick={() => setTab("dm")}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
              tab === "dm"
                ? "bg-brand-dark text-white"
                : "bg-white border border-brand-border text-brand-dark"
            }`}
          >
            <MessageSquare className="w-4 h-4" /> Direct
          </button>
        </div>

        {loading ? (
          <Spinner />
        ) : tab === "feed" ? (
          announcements.length === 0 ? (
            <EmptyState message="No announcements yet." />
          ) : (
            <div className="space-y-4">
              {announcements.map((a) => (
                <div
                  key={a.id}
                  className="bg-white rounded-3xl border border-brand-border p-5 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <LabelBadge label={a.label} />
                    <span className="text-xs text-brand-muted">
                      {a.authorName}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-brand-dark">{a.title}</h3>
                    {a.body && (
                      <p className="text-sm text-brand-muted mt-1">{a.body}</p>
                    )}
                  </div>
                  <div className="space-y-2 border-t border-brand-border pt-3">
                    {a.comments.map((c) => (
                      <div key={c.id} className="text-sm">
                        <span className="font-semibold text-brand-dark">
                          {c.authorName}:
                        </span>{" "}
                        <span className="text-brand-muted">{c.body}</span>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add a comment..."
                        value={commentText[a.id] ?? ""}
                        onChange={(e) =>
                          setCommentText((cc) => ({
                            ...cc,
                            [a.id]: e.target.value,
                          }))
                        }
                        className="h-9"
                      />
                      <Button size="sm" onClick={() => comment(a.id)}>
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : contacts.length === 0 ? (
          <EmptyState message="No one to message in this care circle yet." />
        ) : (
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-1">
              {contacts.map((c) => (
                <button
                  key={c.userId}
                  onClick={() => setActiveContact(c.userId)}
                  className={`w-full text-left px-4 py-3 rounded-2xl transition-colors ${
                    activeContact === c.userId
                      ? "bg-brand-lime text-brand-dark font-medium"
                      : "bg-white border border-brand-border text-brand-dark hover:bg-brand-yellow"
                  }`}
                >
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs opacity-70">{c.role}</p>
                </button>
              ))}
            </div>
            <div className="md:col-span-2 bg-white rounded-3xl border border-brand-border flex flex-col h-[28rem]">
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {threadMessages.length === 0 && (
                  <p className="text-sm text-brand-muted text-center py-8">
                    No messages yet. Say hello!
                  </p>
                )}
                {threadMessages.map((m) => {
                  const mine = m.senderId === user?.id;
                  return (
                    <div
                      key={m.id}
                      className={`flex ${mine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm ${
                          mine
                            ? "bg-brand-dark text-white"
                            : "bg-brand-yellow text-brand-dark"
                        }`}
                      >
                        {m.body}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="p-3 border-t border-brand-border flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={dmText}
                  onChange={(e) => setDmText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendDm()}
                />
                <Button onClick={sendDm}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <Modal
        open={postOpen}
        onClose={() => setPostOpen(false)}
        title="New announcement"
      >
        <div className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input
              value={postForm.title}
              onChange={(e) =>
                setPostForm({ ...postForm, title: e.target.value })
              }
            />
          </div>
          <div>
            <Label>Label</Label>
            <Select
              value={postForm.label}
              onChange={(e) =>
                setPostForm({ ...postForm, label: e.target.value })
              }
            >
              <option value="ANNOUNCEMENT">Announcement</option>
              <option value="COVERAGE">Coverage</option>
              <option value="REMINDER">Reminder</option>
              <option value="UPDATE">Update</option>
              <option value="GENERAL">General</option>
            </Select>
          </div>
          <div>
            <Label>Message</Label>
            <Textarea
              rows={3}
              value={postForm.body}
              onChange={(e) =>
                setPostForm({ ...postForm, body: e.target.value })
              }
            />
          </div>
          <Button onClick={post} className="w-full">
            Post
          </Button>
        </div>
      </Modal>
    </NeedsPatient>
  );
}
