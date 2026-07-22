import { PortalShell } from "@/components/shared/PortalShell";

export default function AgencyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PortalShell role="agency" showSelector>
      {children}
    </PortalShell>
  );
}
