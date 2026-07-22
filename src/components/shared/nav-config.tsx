import {
  LayoutDashboard,
  MessageSquare,
  CheckSquare,
  BookOpen,
  Calendar,
  Users,
  AlertTriangle,
} from "lucide-react";
import type { ReactNode } from "react";

export type PortalRole = "patient" | "provider" | "agency";

export interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
}

const teamLabel: Record<PortalRole, string> = {
  patient: "My Care Team",
  provider: "My Patients",
  agency: "Team",
};

export function navItems(role: PortalRole): NavItem[] {
  const prefix = `/${role}`;
  return [
    {
      label: "Dashboard",
      href: `${prefix}/dashboard`,
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      label: "Messages",
      href: `${prefix}/messages`,
      icon: <MessageSquare className="w-5 h-5" />,
    },
    {
      label: "Tasks",
      href: `${prefix}/tasks`,
      icon: <CheckSquare className="w-5 h-5" />,
    },
    {
      label: "Training Hub",
      href: `${prefix}/training`,
      icon: <BookOpen className="w-5 h-5" />,
    },
    {
      label: "Schedule",
      href: `${prefix}/schedule`,
      icon: <Calendar className="w-5 h-5" />,
    },
    {
      label: teamLabel[role],
      href: `${prefix}/team`,
      icon: <Users className="w-5 h-5" />,
    },
    {
      label: "Emergency",
      href: `${prefix}/emergency`,
      icon: <AlertTriangle className="w-5 h-5" />,
    },
  ];
}

export const roleLabels: Record<string, string> = {
  PATIENT: "Patient",
  PROVIDER: "Provider",
  AGENCY: "Agency",
  ADMIN: "Admin",
};
