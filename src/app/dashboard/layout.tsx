import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import DashboardHeader from '@/components/DashboardHeader';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const auth = cookieStore.get('auth_token');
  
  if (!auth || auth.value !== 'authenticated') {
    redirect('/');
  }

  return (
    <div className="container dashboard-container">
      <DashboardHeader />
      {children}
    </div>
  );
}
