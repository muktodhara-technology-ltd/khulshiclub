import { useState } from 'react'
import { ApiError } from '../lib/api/client'
import { portalForgotPassword, portalLogin } from '../lib/portal'
import { useSiteInfo } from '../lib/siteInfo'
import ClubLogo from './ClubLogo'

const T = {
  ink900: '#0E1116', ink700: '#1C2330', ink600: '#2A3039', ink400: '#5C6673', ink200: '#A8B0BB', ink100: '#E2E6EC',
  surface0: '#FFFFFF', surface50: '#F7F8FA', surface100: '#EEF1F5',
  brand: '#E10B17', brand700: '#B70813', brandDim: '#FFF1F2', brass: '#B98B43',
}

function EyeIcon({ open }: { open: boolean }) {
  return open
    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
    : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
}

export default function MemberLoginPage({ onLogin, onNavigate }: {
  onLogin: () => void
  onNavigate: (page: string) => void
}) {
  const site = useSiteInfo()
  // Background from Website Maintenance → Site Info → Member login background.
  const photo = site.login_background || null
  const [memberId, setMemberId] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{ memberId?: string; password?: string }>({})
  const [focusedId, setFocusedId] = useState(false)
  const [focusedPw, setFocusedPw] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)
  const [forgotBusy, setForgotBusy] = useState(false)

  const validate = () => {
    const e: typeof fieldErrors = {}
    if (!memberId.trim()) e.memberId = 'Member no, phone or email is required'
    if (!password) e.password = 'Password is required'
    else if (password.length < 6) e.password = 'Minimum 6 characters'
    return e
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setFieldErrors(errs); setAuthError(null); return }
    setFieldErrors({})
    setAuthError(null)
    setLoading(true)
    try {
      await portalLogin(memberId.trim(), password)
      onLogin()
    } catch (err) {
      const msg = err instanceof ApiError
        ? err.message
        : err instanceof Error
          ? err.message
          : 'Could not sign in. Please try again.'
      setAuthError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleForgot = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!memberId.trim()) {
      setFieldErrors({ memberId: 'Enter your member no, phone or email first' })
      return
    }
    setForgotBusy(true)
    try {
      await portalForgotPassword(memberId.trim())
      setForgotSent(true)
      setTimeout(() => setForgotSent(false), 5000)
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Could not send reset code.')
    } finally {
      setForgotBusy(false)
    }
  }

  const fieldBorder = (error: boolean, focused: boolean) =>
    error ? 'rgba(255,90,99,0.85)' : focused ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.18)'

  const fieldStyle = (error: boolean, focused: boolean): React.CSSProperties => ({
    width: '100%', height: 52, padding: '0 16px 0 46px', boxSizing: 'border-box',
    fontFamily: 'CKCL', fontSize: 15, color: '#FFFFFF',
    background: focused ? 'rgba(14,17,22,0.55)' : 'rgba(14,17,22,0.40)',
    backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
    border: `1px solid ${fieldBorder(error, focused)}`, borderRadius: 10, outline: 'none',
    boxShadow: focused && !error ? '0 0 0 3px rgba(255,255,255,0.10)' : 'none',
    transition: 'border-color 160ms, box-shadow 160ms, background 160ms',
  })

  const fieldIcon: React.CSSProperties = {
    position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
    color: 'rgba(255,255,255,0.70)', display: 'flex', pointerEvents: 'none', zIndex: 1,
  }

  const footerLink: React.CSSProperties = {
    fontFamily: 'CKCL', fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.85)',
    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: T.ink900 }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
        .login-field::placeholder { color: rgba(255,255,255,0.65); }
        /* Browser autofill: keep the dark frosted field instead of Chrome's light-blue fill.
           WebKit: delay the autofill background change indefinitely; Firefox: paint over it. */
        .login-field:-webkit-autofill,
        .login-field:-webkit-autofill:hover,
        .login-field:-webkit-autofill:focus {
          -webkit-text-fill-color: #FFFFFF;
          caret-color: #FFFFFF;
          transition: background-color 600000s 0s, color 600000s 0s, border-color 160ms, box-shadow 160ms !important;
        }
        @supports (-moz-appearance: none) {
          .login-field:autofill {
            filter: none;
            box-shadow: inset 0 0 0 100px rgba(24,24,28,0.92) !important;
          }
        }
        .login-link:hover { color: #FFFFFF !important; }
      `}</style>

      {/* Full-bleed photograph + readability scrims */}
      {photo
        ? <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${photo})`, backgroundSize: 'cover', backgroundPosition: 'center' }}/>
        : <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, #2A3039 0%, #0E1116 100%)' }}/>}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(14,17,22,0.55) 0%, rgba(14,17,22,0.25) 35%, rgba(14,17,22,0.35) 65%, rgba(14,17,22,0.85) 100%)' }}/>

      {/* Top bar */}
      <header style={{ position: 'relative', zIndex: 2, padding: '24px clamp(16px,2.5vw,32px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button
          onClick={() => onNavigate('home')}
          className="login-link"
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'CKCL', fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.85)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, transition: 'color 160ms' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="15 18 9 12 15 6"/></svg>
          Back to website
        </button>
        <a
          href={site.contact.phone_href ?? undefined}
          aria-label="Call the club office"
          title="Call the club office"
          style={{ width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', background: 'rgba(14,17,22,0.55)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0122 16.92z"/></svg>
        </a>
      </header>

      {/* Centred form */}
      <main style={{ position: 'relative', zIndex: 2, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px 40px' }}>
        <div style={{ width: '100%', maxWidth: 480 }}>

          {/* Logo */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 36 }}>
            <button
              onClick={() => onNavigate('home')}
              aria-label={`${site.club_name || 'Club'} home`}
              style={{ background: 'none', padding: 0, border: 'none', cursor: 'pointer', display: 'flex' }}
            >
              <ClubLogo height="clamp(30px,5vw,40px)" color="#FFFFFF" />
            </button>
            <div className="eyebrow" style={{ marginTop: 16, fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.90)', letterSpacing: '0.18em', textShadow: '0 1px 8px rgba(0,0,0,0.5)' }}>Member Portal</div>
          </div>

          {/* Auth error banner */}
          {authError && (
            <div role="alert" style={{ animation: 'fadeIn 200ms ease', marginBottom: 14, padding: '12px 16px', borderRadius: 10, background: 'rgba(225,11,23,0.22)', border: '1px solid rgba(255,90,99,0.55)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <svg style={{ flexShrink: 0, marginTop: 2 }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FFB3B8" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <div style={{ fontFamily: 'CKCL', fontSize: 13, color: '#FFFFFF', lineHeight: 1.6 }}>
                {authError}{' '}
                {site.contact.phone ? (
                  <>
                    Call the club office on{' '}
                    <a href={site.contact.phone_href ?? undefined} style={{ fontWeight: 700, color: '#FFFFFF' }}>{site.contact.phone}</a>.
                  </>
                ) : null}
              </div>
            </div>
          )}

          {/* Forgot password success */}
          {forgotSent && (
            <div role="status" style={{ animation: 'fadeIn 200ms ease', marginBottom: 14, padding: '12px 16px', borderRadius: 10, background: 'rgba(22,163,74,0.22)', border: '1px solid rgba(74,222,128,0.50)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#86EFAC" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              <span style={{ fontFamily: 'CKCL', fontSize: 13, color: '#FFFFFF' }}>
                {forgotBusy ? 'Sending…' : 'If an account matches, a reset code has been sent by SMS and email.'}
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Member ID */}
            <div>
              <div style={{ position: 'relative' }}>
                <span style={fieldIcon}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </span>
                <input
                  className="login-field"
                  type="text"
                  value={memberId}
                  placeholder="Member no / phone / email"
                  aria-label="Member ID"
                  aria-invalid={!!fieldErrors.memberId}
                  autoComplete="username"
                  onChange={(e) => { setMemberId(e.target.value); setFieldErrors((p) => ({ ...p, memberId: undefined })); setAuthError(null) }}
                  onFocus={() => setFocusedId(true)}
                  onBlur={() => setFocusedId(false)}
                  style={{ ...fieldStyle(!!fieldErrors.memberId, focusedId), letterSpacing: memberId ? '0.05em' : 0 }}
                />
              </div>
              {fieldErrors.memberId && <div style={{ fontFamily: 'CKCL', fontSize: 12, color: '#FFB3B8', marginTop: 6, paddingLeft: 4, textShadow: '0 1px 6px rgba(0,0,0,0.8)' }}>{fieldErrors.memberId}</div>}
            </div>

            {/* Password */}
            <div>
              <div style={{ position: 'relative' }}>
                <span style={fieldIcon}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>
                </span>
                <input
                  className="login-field"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  placeholder="Password"
                  aria-label="Password"
                  aria-invalid={!!fieldErrors.password || !!authError}
                  autoComplete="current-password"
                  onChange={(e) => { setPassword(e.target.value); setFieldErrors((p) => ({ ...p, password: undefined })); setAuthError(null) }}
                  onFocus={() => setFocusedPw(true)}
                  onBlur={() => setFocusedPw(false)}
                  style={{ ...fieldStyle(!!fieldErrors.password || !!authError, focusedPw), paddingRight: 52 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                  title={showPass ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                    width: 36, height: 36, borderRadius: 8,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: showPass ? '#FFFFFF' : 'rgba(255,255,255,0.65)',
                    transition: 'color 140ms, background 140ms',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.10)' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'none' }}
                >
                  <EyeIcon open={showPass}/>
                </button>
              </div>
              {fieldErrors.password && <div style={{ fontFamily: 'CKCL', fontSize: 12, color: '#FFB3B8', marginTop: 6, paddingLeft: 4, textShadow: '0 1px 6px rgba(0,0,0,0.8)' }}>{fieldErrors.password}</div>}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 6, height: 52, borderRadius: 10, border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'CKCL', fontSize: 16, fontWeight: 700,
                color: '#FFF', background: loading ? 'rgba(225,11,23,0.60)' : T.brand,
                boxShadow: '0 10px 28px rgba(225,11,23,0.35)',
                transition: 'background 160ms',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
              onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLElement).style.background = T.brand700 }}
              onMouseLeave={(e) => { if (!loading) (e.currentTarget as HTMLElement).style.background = T.brand }}
            >
              {loading
                ? <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 0.8s linear infinite' }}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                    Signing in…
                  </>
                : 'Login'
              }
            </button>
          </form>

          {/* Secondary actions */}
          <div className="flex items-center justify-between gap-4" style={{ marginTop: 16 }}>
            <button
              type="button"
              onClick={handleForgot}
              className="login-link"
              style={{ fontFamily: 'CKCL', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.90)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline', textUnderlineOffset: 3 }}
            >
              Forgot Member ID / Password?
            </button>
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="login-link flex items-center gap-1.5"
              style={{ fontFamily: 'CKCL', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.90)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="10" r="3"/><path d="M6.17 18.34a7 7 0 0111.66 0"/></svg>
              Browse as Guest
            </button>
          </div>

          {/* Divider + apply */}
          <div style={{ width: 120, height: 1, background: 'rgba(255,255,255,0.25)', margin: '32px auto 20px' }}/>
          <p style={{ fontFamily: 'CKCL', fontSize: 15, fontWeight: 500, color: '#FFFFFF', margin: 0, textAlign: 'center', textShadow: '0 1px 8px rgba(0,0,0,0.4)' }}>
            Not a member?{' '}
            <button onClick={() => onNavigate('become-member')} style={{ fontFamily: 'CKCL', fontSize: 15, fontWeight: 700, color: '#FF4A54', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              Apply Now
            </button>
          </p>
        </div>
      </main>

      {/* Bottom bar */}
      <footer
        className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3"
        style={{ position: 'relative', zIndex: 2, padding: '20px clamp(16px,2.5vw,32px)' }}
      >
        <div className="flex items-center gap-1.5" style={{ fontFamily: 'CKCL', fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M14.83 9.17a4 4 0 100 5.66"/></svg>
          {/* The © icon is drawn above, so drop a leading © from the Site Info text */}
          {(site.copyright || `${new Date().getFullYear()} ${site.club_name}`).replace(/^\s*©\s*/, '').trim()}
        </div>
        <div className="flex items-center gap-6">
          <button onClick={() => onNavigate('terms')} className="login-link" style={footerLink}>Terms and Conditions</button>
          <button onClick={() => onNavigate('refund-policy')} className="login-link" style={footerLink}>Refund Policy</button>
        </div>
      </footer>
    </div>
  )
}
