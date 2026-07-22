import { PortalShell } from "@/components/shared/PortalShell";

export default function ProviderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PortalShell role="provider" showSelector>
      {children}
    </PortalShell>
  );
}
