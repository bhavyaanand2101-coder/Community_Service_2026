'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import TeacherDashboardView from '@/components/dashboards/TeacherDashboardView';
import { ShieldCheck, Loader2 } from 'lucide-react';

export default function TeacherPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => {
        if (data.authenticated && (data.session?.role === 'TEACHER' || data.session?.role === 'ADMIN')) {
          setAuthorized(true);
        } else {
          const localRole = typeof window !== 'undefined' ? window.localStorage.getItem('prime_learning_user_role') : null;
          if (localRole === 'TEACHER' || localRole === 'ADMIN') {
            setAuthorized(true);
          } else {
            setAuthorized(false);
            router.push('/login?role=TEACHER&redirect=/teacher');
          }
        }
      })
      .catch(() => {
        const localRole = typeof window !== 'undefined' ? window.localStorage.getItem('prime_learning_user_role') : null;
        if (localRole === 'TEACHER' || localRole === 'ADMIN') {
          setAuthorized(true);
        } else {
          setAuthorized(false);
          router.push('/login?role=TEACHER&redirect=/teacher');
        }
      });
  }, [router]);

  if (authorized === null) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white space-y-4">
        <Loader2 className="w-8 h-8 text-prime-orange animate-spin" />
        <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-widest text-slate-400">
          <ShieldCheck className="w-4 h-4 text-prime-orange" />
          <span>Verifying Faculty Credentials...</span>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return null;
  }

  return <TeacherDashboardView />;
}
