import { Navigation, Sidebar } from "@/components/navigation";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[100dvh] bg-background">
      <Sidebar />
      <main className="flex-1 pb-16 md:pb-0 overflow-y-auto w-full overflow-x-hidden">
        <div className="mx-auto max-w-md md:max-w-3xl p-4 md:p-8">
          {children}
        </div>
      </main>
      <Navigation />
    </div>
  );
}
