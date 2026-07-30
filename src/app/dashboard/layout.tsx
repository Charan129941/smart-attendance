'use client';

import { useSession, signOut, SessionProvider } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center"><span className="spinner"></span></div>;
  }

  // We should redirect to login if unauthenticated, but assuming next-auth middleware or this layout handles it.
  if (status === 'unauthenticated') {
    if (typeof window !== 'undefined') window.location.href = '/login';
    return null;
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-primary">
      {/* Sidebar Nav */}
      <nav className="w-full md:w-64 bg-card border-r border-border-color p-4 flex flex-col justify-between">
        <div>
          <div className="mb-8 p-2 text-xl font-bold text-accent">SmartAttend</div>
          
          <div className="space-y-2">
            <Link href="/dashboard" className={`block p-3 rounded-lg transition-colors ${pathname === '/dashboard' || pathname.startsWith('/dashboard/sessions') ? 'bg-secondary text-primary' : 'text-muted hover:bg-card-hover'}`}>
              Sessions
            </Link>
            <Link href="/dashboard/settings" className={`block p-3 rounded-lg transition-colors ${pathname === '/dashboard/settings' ? 'bg-secondary text-primary' : 'text-muted hover:bg-card-hover'}`}>
              Settings
            </Link>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-border-color">
          <div className="mb-4 text-sm px-2">
            <div className="text-muted">Logged in as</div>
            <div className="font-semibold text-primary">{session?.user?.name || session?.user?.email || 'Faculty'}</div>
          </div>
          <button 
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="btn btn-ghost w-full justify-start"
          >
            Sign Out
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </SessionProvider>
  );
}
