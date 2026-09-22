import Sidebar from '@/components/Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="app-shell">
      <Sidebar />
      <section className="content-area">{children}</section>
    </main>
  );
}
