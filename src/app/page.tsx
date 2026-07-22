import Link from "next/link";
import {
  HeartHandshake,
  Calendar,
  MessageSquare,
  BookOpen,
  ShieldCheck,
  Users,
} from "lucide-react";

const features = [
  {
    icon: <Calendar className="w-6 h-6" />,
    title: "Scheduling",
    body: "Coordinate shifts, cover open slots and keep everyone on the same page.",
  },
  {
    icon: <MessageSquare className="w-6 h-6" />,
    title: "Messaging",
    body: "Announcements and direct messages across the whole care circle.",
  },
  {
    icon: <BookOpen className="w-6 h-6" />,
    title: "Training Hub",
    body: "Care guides, videos and documents organized by category.",
  },
  {
    icon: <ShieldCheck className="w-6 h-6" />,
    title: "Emergency Info",
    body: "Contacts, protocols and nearby hospitals always at hand.",
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: "Care Teams",
    body: "Bring patients, families, providers and agencies together.",
  },
  {
    icon: <HeartHandshake className="w-6 h-6" />,
    title: "Task Tracking",
    body: "Per-shift checklists so nothing falls through the cracks.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-brand-cream">
      <header className="flex items-center justify-between px-6 md:px-12 py-6">
        <span className="text-2xl font-bold text-brand-dark">CareConnect</span>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="px-4 py-2 rounded-full text-sm font-medium text-brand-dark hover:bg-white"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="px-4 py-2 rounded-full text-sm font-semibold bg-brand-dark text-white hover:opacity-90"
          >
            Get Started
          </Link>
        </div>
      </header>

      <section className="px-6 md:px-12 py-16 md:py-24 max-w-4xl mx-auto text-center">
        <span className="inline-block bg-brand-lime text-brand-dark text-sm font-semibold px-4 py-1.5 rounded-full">
          Care coordination, simplified
        </span>
        <h1 className="text-4xl md:text-6xl font-bold text-brand-dark mt-6 leading-tight">
          Everyone in the care circle, connected.
        </h1>
        <p className="text-lg text-brand-muted mt-6 max-w-2xl mx-auto">
          CareConnect brings patients, families, providers and agencies into one
          place — scheduling, messaging, training and emergency information,
          all in a single calm workspace.
        </p>
        <div className="flex items-center justify-center gap-4 mt-10">
          <Link
            href="/register"
            className="px-6 py-3 rounded-full font-semibold bg-brand-dark text-white hover:opacity-90"
          >
            Create your account
          </Link>
          <Link
            href="/login"
            className="px-6 py-3 rounded-full font-semibold bg-white border border-brand-border text-brand-dark hover:bg-brand-yellow"
          >
            Sign in
          </Link>
        </div>
      </section>

      <section className="px-6 md:px-12 pb-24 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-3 gap-5">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-white rounded-3xl border border-brand-border p-6 space-y-3"
            >
              <div className="inline-flex p-2.5 rounded-xl bg-brand-lime text-brand-dark">
                {f.icon}
              </div>
              <h3 className="font-bold text-brand-dark">{f.title}</h3>
              <p className="text-sm text-brand-muted">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="px-6 md:px-12 py-8 text-center text-sm text-brand-muted border-t border-brand-border">
        CareConnect — a care management demo.
      </footer>
    </div>
  );
}
