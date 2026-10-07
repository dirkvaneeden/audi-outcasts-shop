import { redirect } from 'next/navigation';
import { getCurrentMember } from '@/lib/auth';
import { LoginForm } from '@/components/LoginForm';

export default async function LoginPage() {
  // Already signed in as an active member: go straight in
  if (await getCurrentMember()) redirect('/');

  return (
    <div className="login">
      <section className="login__card panel">
        <h1 className="login__title">Sign in</h1>
        <p className="login__subtitle">Members only. We’ll email you a sign-in code, no password needed.</p>
        <LoginForm />
      </section>
    </div>
  );
}
