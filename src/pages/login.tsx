import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

const ALLOWED_DOMAIN = process.env.NEXT_PUBLIC_ALLOWED_DOMAIN ?? 'bluecopa.com';

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [error, setError] = useState('');
  const [signingIn, setSigningIn] = useState(false);

  const returnTo = typeof router.query.from === 'string' ? router.query.from : '/delivery-plan';

  useEffect(() => {
    if (!loading && user) router.replace(returnTo);
  }, [user, loading, router, returnTo]);

  const handleSignIn = async () => {
    setError('');
    setSigningIn(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ hd: ALLOWED_DOMAIN });
      const result = await signInWithPopup(auth, provider);
      const email = result.user.email ?? '';
      if (!email.endsWith(`@${ALLOWED_DOMAIN}`)) {
        await signOut(auth);
        setError(`Access is restricted to @${ALLOWED_DOMAIN} accounts.`);
        return;
      }
      router.replace(returnTo);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
        setError('Sign-in failed. Please try again.');
      }
    } finally {
      setSigningIn(false);
    }
  };

  if (loading) return null;

  return (
    <>
      <Head>
        <title>Sign in · Bluecopa PMO</title>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>
      <div style={{
        minHeight: '100vh',
        background: '#0F172A',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'DM Sans', sans-serif",
        padding: 16,
      }}>
        <div style={{
          width: '100%',
          maxWidth: 400,
          background: '#1E293B',
          border: '1px solid #334155',
          borderRadius: 16,
          padding: '40px 36px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}>
          {/* Logo / wordmark */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{
              width: 48, height: 48,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #8B5CF6, #38BDF8)',
              margin: '0 auto 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ color: '#fff', fontWeight: 800, fontSize: 20 }}>B</span>
            </div>
            <h1 style={{ color: '#F1F5F9', fontWeight: 700, fontSize: 22, margin: 0, letterSpacing: '-0.02em' }}>
              Bluecopa PMO
            </h1>
            <p style={{ color: '#94A3B8', fontSize: 13, marginTop: 6 }}>
              Sign in to access the delivery plan
            </p>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.12)',
              border: '1px solid rgba(239,68,68,0.35)',
              borderRadius: 8,
              padding: '10px 14px',
              color: '#FCA5A5',
              fontSize: 13,
              marginBottom: 20,
              textAlign: 'center',
            }}>
              {error}
            </div>
          )}

          {/* Google Sign-in button */}
          <button
            onClick={handleSignIn}
            disabled={signingIn}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: signingIn ? '#334155' : '#FFFFFF',
              border: 'none',
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              cursor: signingIn ? 'not-allowed' : 'pointer',
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 600,
              fontSize: 14,
              color: signingIn ? '#94A3B8' : '#0F172A',
              transition: 'background 0.2s, opacity 0.2s',
              opacity: signingIn ? 0.7 : 1,
            }}
          >
            {!signingIn && (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.616z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
            )}
            {signingIn ? 'Signing in…' : 'Continue with Google'}
          </button>

          <p style={{ color: '#475569', fontSize: 11, textAlign: 'center', marginTop: 20 }}>
            Only <strong style={{ color: '#64748B' }}>@{ALLOWED_DOMAIN}</strong> accounts are permitted.
          </p>
        </div>
      </div>
    </>
  );
}
