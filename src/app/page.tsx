import { redirect } from 'next/navigation';

export default function HomePage() {
  // We can add logic to redirect based on auth status.
  // For now, defaulting to login page.
  redirect('/login');
}
