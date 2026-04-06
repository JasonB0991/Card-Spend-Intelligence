import AppSidebar from "@/components/AppSidebar";

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f3f6f2]">
      <AppSidebar />
      <main className="min-w-0 flex-1 overflow-hidden bg-[#f8faf7]">
        {children}
      </main>
    </div>
  );
}