"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Trash2,
  Phone,
  ShieldAlert,
  Building2,
  ListChecks,
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

interface Contact {
  id: string;
  name: string;
  phone: string;
  contactType: string;
}
interface Protocol {
  id: string;
  title: string;
  steps: string[];
}
interface Hospital {
  id: string;
  name: string;
  address: string | null;
  distance: string | null;
}

export function EmergencyView() {
  const { user } = useAuth();
  const { selectedPatientId } = usePatients();
  const { toast } = useToast();
  const canManage = user?.role !== "PROVIDER";

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);

  const [contactModal, setContactModal] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: "",
    phone: "",
    contactType: "EMERGENCY",
  });
  const [protocolModal, setProtocolModal] = useState(false);
  const [protocolForm, setProtocolForm] = useState({ title: "", steps: "" });
  const [hospitalModal, setHospitalModal] = useState(false);
  const [hospitalForm, setHospitalForm] = useState({
    name: "",
    address: "",
    distance: "",
  });

  const load = useCallback(async () => {
    if (!selectedPatientId) return;
    setLoading(true);
    try {
      const [c, p, h] = await Promise.all([
        apiGet<Contact[]>(`/api/emergency/contacts?patientId=${selectedPatientId}`),
        apiGet<Protocol[]>(`/api/emergency/protocols?patientId=${selectedPatientId}`),
        apiGet<Hospital[]>(`/api/emergency/hospitals?patientId=${selectedPatientId}`),
      ]);
      setContacts(c);
      setProtocols(p);
      setHospitals(h);
    } finally {
      setLoading(false);
    }
  }, [selectedPatientId]);

  useEffect(() => {
    load();
  }, [load]);

  const addContact = async () => {
    if (!contactForm.name || !contactForm.phone) return;
    try {
      await apiSend("/api/emergency/contacts", "POST", {
        patientId: selectedPatientId,
        ...contactForm,
      });
      setContactModal(false);
      setContactForm({ name: "", phone: "", contactType: "EMERGENCY" });
      await load();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };

  const addProtocol = async () => {
    if (!protocolForm.title) return;
    try {
      await apiSend("/api/emergency/protocols", "POST", {
        patientId: selectedPatientId,
        title: protocolForm.title,
        steps: protocolForm.steps
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
      });
      setProtocolModal(false);
      setProtocolForm({ title: "", steps: "" });
      await load();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };

  const addHospital = async () => {
    if (!hospitalForm.name) return;
    try {
      await apiSend("/api/emergency/hospitals", "POST", {
        patientId: selectedPatientId,
        ...hospitalForm,
      });
      setHospitalModal(false);
      setHospitalForm({ name: "", address: "", distance: "" });
      await load();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };

  const del = async (kind: string, id: string) => {
    try {
      await apiSend(`/api/emergency/${kind}?id=${id}`, "DELETE");
      await load();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };

  return (
    <NeedsPatient>
      <div className="p-4 md:p-8 space-y-6">
        <PageHeader
          title="Emergency"
          subtitle="Contacts, protocols and nearby hospitals"
        />

        {loading ? (
          <Spinner />
        ) : (
          <div className="space-y-8">
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-brand-dark flex items-center gap-2">
                  <Phone className="w-5 h-5 text-brand-error" /> Emergency
                  Contacts
                </h2>
                {canManage && (
                  <Button size="sm" onClick={() => setContactModal(true)}>
                    <Plus className="w-4 h-4" /> Contact
                  </Button>
                )}
              </div>
              {contacts.length === 0 ? (
                <EmptyState message="No contacts yet." />
              ) : (
                <div className="grid md:grid-cols-2 gap-3">
                  {contacts.map((c) => (
                    <div
                      key={c.id}
                      className="bg-white rounded-3xl border border-brand-border p-5 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-semibold text-brand-dark">
                          {c.name}
                        </p>
                        <a
                          href={`tel:${c.phone}`}
                          className="text-brand-info hover:underline"
                        >
                          {c.phone}
                        </a>
                        <p className="text-xs text-brand-muted mt-1">
                          {c.contactType}
                        </p>
                      </div>
                      {canManage && (
                        <button
                          onClick={() => del("contacts", c.id)}
                          className="p-2 rounded-lg text-brand-muted hover:bg-brand-yellow"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-brand-dark flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-brand-warning" />{" "}
                  Protocols
                </h2>
                {canManage && (
                  <Button size="sm" onClick={() => setProtocolModal(true)}>
                    <Plus className="w-4 h-4" /> Protocol
                  </Button>
                )}
              </div>
              {protocols.length === 0 ? (
                <EmptyState message="No protocols yet." />
              ) : (
                <div className="space-y-3">
                  {protocols.map((p) => (
                    <div
                      key={p.id}
                      className="bg-white rounded-3xl border border-brand-border p-5"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-brand-dark flex items-center gap-2">
                          <ListChecks className="w-4 h-4" /> {p.title}
                        </h3>
                        {canManage && (
                          <button
                            onClick={() => del("protocols", p.id)}
                            className="p-2 rounded-lg text-brand-muted hover:bg-brand-yellow"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                      <ol className="list-decimal list-inside space-y-1 mt-3 text-sm text-brand-muted">
                        {p.steps.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ol>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-brand-dark flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-brand-info" /> Nearby
                  Hospitals
                </h2>
                {canManage && (
                  <Button size="sm" onClick={() => setHospitalModal(true)}>
                    <Plus className="w-4 h-4" /> Hospital
                  </Button>
                )}
              </div>
              {hospitals.length === 0 ? (
                <EmptyState message="No hospitals listed yet." />
              ) : (
                <div className="grid md:grid-cols-2 gap-3">
                  {hospitals.map((h) => (
                    <div
                      key={h.id}
                      className="bg-white rounded-3xl border border-brand-border p-5 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-semibold text-brand-dark">
                          {h.name}
                        </p>
                        {h.address && (
                          <p className="text-sm text-brand-muted">
                            {h.address}
                          </p>
                        )}
                        {h.distance && (
                          <p className="text-xs text-brand-muted mt-1">
                            {h.distance}
                          </p>
                        )}
                      </div>
                      {canManage && (
                        <button
                          onClick={() => del("hospitals", h.id)}
                          className="p-2 rounded-lg text-brand-muted hover:bg-brand-yellow"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      <Modal
        open={contactModal}
        onClose={() => setContactModal(false)}
        title="Add emergency contact"
      >
        <div className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input
              value={contactForm.name}
              onChange={(e) =>
                setContactForm({ ...contactForm, name: e.target.value })
              }
            />
          </div>
          <div>
            <Label>Phone</Label>
            <Input
              value={contactForm.phone}
              onChange={(e) =>
                setContactForm({ ...contactForm, phone: e.target.value })
              }
            />
          </div>
          <div>
            <Label>Type</Label>
            <Select
              value={contactForm.contactType}
              onChange={(e) =>
                setContactForm({ ...contactForm, contactType: e.target.value })
              }
            >
              <option value="EMERGENCY">Emergency</option>
              <option value="MEDICAL">Medical</option>
              <option value="FAMILY">Family</option>
            </Select>
          </div>
          <Button onClick={addContact} className="w-full">
            Add Contact
          </Button>
        </div>
      </Modal>

      <Modal
        open={protocolModal}
        onClose={() => setProtocolModal(false)}
        title="Add protocol"
      >
        <div className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input
              value={protocolForm.title}
              onChange={(e) =>
                setProtocolForm({ ...protocolForm, title: e.target.value })
              }
            />
          </div>
          <div>
            <Label>Steps (one per line)</Label>
            <Textarea
              rows={5}
              value={protocolForm.steps}
              onChange={(e) =>
                setProtocolForm({ ...protocolForm, steps: e.target.value })
              }
              placeholder={"Call 911\nStay with the patient\n..."}
            />
          </div>
          <Button onClick={addProtocol} className="w-full">
            Add Protocol
          </Button>
        </div>
      </Modal>

      <Modal
        open={hospitalModal}
        onClose={() => setHospitalModal(false)}
        title="Add hospital"
      >
        <div className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input
              value={hospitalForm.name}
              onChange={(e) =>
                setHospitalForm({ ...hospitalForm, name: e.target.value })
              }
            />
          </div>
          <div>
            <Label>Address</Label>
            <Input
              value={hospitalForm.address}
              onChange={(e) =>
                setHospitalForm({ ...hospitalForm, address: e.target.value })
              }
            />
          </div>
          <div>
            <Label>Distance</Label>
            <Input
              value={hospitalForm.distance}
              onChange={(e) =>
                setHospitalForm({ ...hospitalForm, distance: e.target.value })
              }
              placeholder="e.g. 2.3 miles"
            />
          </div>
          <Button onClick={addHospital} className="w-full">
            Add Hospital
          </Button>
        </div>
      </Modal>
    </NeedsPatient>
  );
}
