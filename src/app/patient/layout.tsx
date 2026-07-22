import { PortalShell } from "@/components/shared/PortalShell";

export default function PatientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PortalShell role="patient">{children}</PortalShell>;
}
