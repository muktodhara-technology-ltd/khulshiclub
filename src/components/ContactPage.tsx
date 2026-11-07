import { useState } from 'react'
import Footer from './Footer'
import { ApiError, postWebsiteContact } from '../lib/api'
import { useContactFaqs } from '../lib/contactFaqs'
import { useSiteInfo } from '../lib/siteInfo'

const T = {
  ink900: '#0E1116', ink600: '#2A3039', ink400: '#5C6673', ink200: '#A8B0BB', ink100: '#E2E6EC',
  surface50: '#F7F8FA', surface100: '#EEF1F5',
  brand: '#E10B17', brandDim: '#FFF1F2', brass: '#B98B43',
  green: '#16A34A',
}

// ─── Input primitive (floating label) ─────────────────────────────────────────
function Field({ label, value, onChange, type = 'text', required }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean
}) {
  const [focused, setFocused] = useState(false)
  const up = focused || !!value
  const border = focused ? T.brand : T.ink100
  const ring = focused ? 'rgba(225,11,23,0.14)' : 'transparent'
  return (
    <div style={{ position: 'relative', border: `1px solid ${border}`, borderRadius: 10, background: '#FFFFFF', boxShadow: `0 0 0 3px ${ring}`, transition: 'all 160ms' }}>
      <label style={{ position: 'absolute', left: 14, top: up ? 8 : '50%', transform: up ? 'none' : 'translateY(-50%)', fontFamily: 'CKCL', fontSize: up ? 10 : 14, fontWeight: up ? 600 : 400, color: focused ? T.brand : T.ink200, letterSpacing: up ? '0.04em' : 0, pointerEvents: 'none', transition: 'all 160ms', zIndex: 1 }}>
        {label}{required && ' *'}
      </label>
      <input
        type={type} value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{ width: '100%', height: 52, paddingTop: 22, paddingBottom: 0, paddingLeft: 14, paddingRight: 14, fontFamily: 'CKCL', fontSize: 14, color: T.ink900, background: 'transparent', border: 'none', outline: 'none', boxSizing: 'border-box' }}
      />
    </div>
  )
}

function SelectField({ label, value, onChange, options, required }: {
  label: string; value: string; onChange: (v: string) => void; options: string[]; required?: boolean
}) {
  const [focused, setFocused] = useState(false)
  const up = focused || !!value
  const border = focused ? T.brand : T.ink100
  const ring = focused ? 'rgba(225,11,23,0.14)' : 'transparent'
  return (
    <div style={{ position: 'relative', border: `1px solid ${border}`, borderRadius: 10, background: '#FFFFFF', boxShadow: `0 0 0 3px ${ring}`, transition: 'all 160ms' }}>
      <label style={{ position: 'absolute', left: 14, top: up ? 8 : '50%', transform: up ? 'none' : 'translateY(-50%)', fontFamily: 'CKCL', fontSize: up ? 10 : 14, fontWeight: up ? 600 : 400, color: focused ? T.brand : T.ink200, letterSpacing: up ? '0.04em' : 0, pointerEvents: 'none', transition: 'all 160ms', zIndex: 1 }}>
        {label}{required && ' *'}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{ width: '100%', height: 52, paddingTop: 22, paddingBottom: 0, paddingLeft: 14, paddingRight: 36, fontFamily: 'CKCL', fontSize: 14, color: T.ink900, background: 'transparent', border: 'none', outline: 'none', appearance: 'none', WebkitAppearance: 'none', cursor: 'pointer', boxSizing: 'border-box' }}
      >
        <option value="" />
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={T.ink200} strokeWidth="2.5" style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}><polyline points="6 9 12 15 18 9"/></svg>
    </div>
  )
}

function TextareaField({ label, value, onChange, required }: {
  label: string; value: string; onChange: (v: string) => void; required?: boolean
}) {
  const [focused, setFocused] = useState(false)
  const up = focused || !!value
  const border = focused ? T.brand : T.ink100
  const ring = focused ? 'rgba(225,11,23,0.14)' : 'transparent'
  return (
    <div style={{ position: 'relative', border: `1px solid ${border}`, borderRadius: 10, background: '#FFFFFF', boxShadow: `0 0 0 3px ${ring}`, transition: 'all 160ms' }}>
      <label style={{ position: 'absolute', left: 14, top: up ? 10 : 18, fontFamily: 'CKCL', fontSize: up ? 10 : 14, fontWeight: up ? 600 : 400, color: focused ? T.brand : T.ink200, letterSpacing: up ? '0.04em' : 0, pointerEvents: 'none', transition: 'all 160ms', zIndex: 1 }}>
        {label}{required && ' *'}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        rows={5}
        style={{ width: '100%', paddingTop: 28, paddingBottom: 12, paddingLeft: 14, paddingRight: 14, fontFamily: 'CKCL', fontSize: 14, color: T.ink900, background: 'transparent', border: 'none', outline: 'none', resize: 'vertical', minHeight: 120, boxSizing: 'border-box' }}
      />
    </div>
  )
}

// ─── Icon in brand circle ─────────────────────────────────────────────────────
function ContactIcon({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ width: 40, height: 40, borderRadius: '50%', background: T.brandDim, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {children}
    </div>
  )
}

// ─── Contact card ─────────────────────────────────────────────────────────────
function ContactCard() {
  const site = useSiteInfo()
  const email = site.contact.email
  const facebook = site.social.facebook
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.80)',
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        border: '1px solid rgba(255,255,255,0.70)',
        borderRadius: 24,
        padding: 'clamp(24px,3.5vw,40px)',
        boxShadow: '0 8px 32px rgba(14,17,22,0.08)',
        display: 'flex',
        flexDirection: 'column',
        gap: 28,
      }}
    >
      <div>
        <div className="eyebrow mb-1" style={{ fontSize: 10, color: T.brass }}>{(site.club_name || 'CLUB').toUpperCase()}</div>
        <h2 style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 22, color: T.ink900, margin: 0, letterSpacing: '-0.01em' }}>Get in touch</h2>
      </div>

      {/* Address */}
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <ContactIcon>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.brand} strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
        </ContactIcon>
        <div>
          <div style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 13, color: T.ink900, marginBottom: 3 }}>Address</div>
          <div style={{ fontFamily: 'CKCL', fontSize: 13, color: T.ink400, lineHeight: 1.6 }}>
            {site.address.full}
          </div>
        </div>
      </div>

      {/* Phones */}
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <ContactIcon>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.brand} strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.77 19.79 19.79 0 01.02 1.18 2 2 0 012 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>
        </ContactIcon>
        <div>
          <div style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 13, color: T.ink900, marginBottom: 3 }}>Telephone</div>
          {site.contact.phones.map(({ label: ph, href }) => (
            <a key={ph} href={href} style={{ display: 'block', fontFamily: 'CKCL', fontWeight: 500, fontSize: 14, color: T.brand, textDecoration: 'none', lineHeight: 1.7, transition: 'opacity 140ms' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.75' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
            >{ph}</a>
          ))}
        </div>
      </div>

      {/* Email */}
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <ContactIcon>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.brand} strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
        </ContactIcon>
        <div>
          <div style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 13, color: T.ink900, marginBottom: 3 }}>Email</div>
          <a href={email ? `mailto:${email}` : undefined} style={{ fontFamily: 'CKCL', fontSize: 14, color: T.brand, textDecoration: 'none', transition: 'opacity 140ms' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.75' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
          >{email}</a>
        </div>
      </div>

      {/* Hours */}
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <ContactIcon>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.brand} strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </ContactIcon>
        <div>
          <div style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 13, color: T.ink900, marginBottom: 3 }}>Office hours</div>
          <div style={{ fontFamily: 'CKCL', fontSize: 13, color: T.ink400 }}>{site.office.days}</div>
          <div style={{ fontFamily: 'CKCL', fontWeight: 500, fontSize: 13, color: T.ink600, marginTop: 1, letterSpacing: '0.04em' }}>{site.office.hours}</div>
          {site.office.note && <div style={{ fontFamily: 'CKCL', fontSize: 11, color: T.ink200, marginTop: 2 }}>{site.office.note}</div>}
        </div>
      </div>

      {/* Facebook */}
      {facebook && (
      <a
        href={facebook}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px',
          background: '#F0F2FF',
          border: '1px solid rgba(59,89,152,0.18)',
          borderRadius: 12,
          textDecoration: 'none',
          transition: 'background 160ms',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#E4E7F8' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#F0F2FF' }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="#3B5998"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/></svg>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'CKCL', fontSize: 13, fontWeight: 600, color: '#3B5998' }}>{site.short_name || 'Club'} on Facebook</div>
          <div style={{ fontFamily: 'CKCL', fontSize: 11, color: T.ink200, marginTop: 1 }}>{facebook.replace(/^https?:\/\/(www\.)?/, '')}</div>
        </div>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#3B5998" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
      </a>
      )}

      {/* CTA buttons */}
      <div style={{ display: 'flex', gap: 10 }}>
        <a
          href={site.contact.phone_href ?? undefined}
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '12px', fontFamily: 'CKCL', fontSize: 14, fontWeight: 700, color: '#FFFFFF', background: T.brand, borderRadius: 999, textDecoration: 'none', transition: 'background 160ms' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#B70813' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = T.brand }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.77 19.79 19.79 0 01.02 1.18 2 2 0 012 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>
          Call
        </a>
        <a
          href={email ? `mailto:${email}` : undefined}
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '12px', fontFamily: 'CKCL', fontSize: 14, fontWeight: 700, color: T.brand, background: T.brandDim, border: `1px solid rgba(225,11,23,0.20)`, borderRadius: 999, textDecoration: 'none', transition: 'all 160ms' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = T.brand; (e.currentTarget as HTMLElement).style.color = '#FFFFFF' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = T.brandDim; (e.currentTarget as HTMLElement).style.color = T.brand }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          Email
        </a>
      </div>
    </div>
  )
}

// ─── Enquiry form ─────────────────────────────────────────────────────────────
type FormState = 'idle' | 'sending' | 'sent'

function EnquiryForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [state, setState] = useState<FormState>('idle')
  const [error, setError] = useState('')

  // Sends to the club's admin panel (Contact Messages)
  const send = async () => {
    const missing = [
      !name.trim() && 'your name',
      !email.trim() && 'your email address',
      !subject && 'a subject',
      !message.trim() && 'a message',
    ].filter(Boolean)
    if (missing.length) { setError('Please add ' + missing.join(', ') + '.'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Please check your email address.'); return }

    setError('')
    setState('sending')
    try {
      await postWebsiteContact({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        subject,
        message: message.trim(),
      })
      setState('sent')
    } catch (e) {
      const first = e instanceof ApiError ? Object.values(e.errors)[0]?.[0] : undefined
      setError(first || (e instanceof Error ? e.message : 'Something went wrong. Please try again.'))
      setState('idle')
    }
  }

  if (state === 'sent') {
    return (
      <div style={{ background: 'rgba(255,255,255,0.80)', backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)', border: '1px solid rgba(255,255,255,0.70)', borderRadius: 24, padding: 'clamp(24px,3.5vw,40px)', boxShadow: '0 8px 32px rgba(14,17,22,0.08)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 360, textAlign: 'center', gap: 16 }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 46, height: 46, borderRadius: '50%', background: T.green, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
        </div>
        <div style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 22, color: T.ink900 }}>Message sent.</div>
        <div style={{ fontFamily: 'CKCL', fontSize: 14, color: T.ink400, lineHeight: 1.65, maxWidth: 320 }}>
          Thank you for reaching out. We will get back to you within 1–2 working days at <strong style={{ color: T.ink600 }}>{email}</strong>.
        </div>
        <button
          onClick={() => { setState('idle'); setError(''); setName(''); setEmail(''); setPhone(''); setSubject(''); setMessage('') }}
          style={{ marginTop: 8, padding: '11px 24px', fontFamily: 'CKCL', fontSize: 13, fontWeight: 600, color: T.brand, background: T.brandDim, border: `1px solid rgba(225,11,23,0.20)`, borderRadius: 999, cursor: 'pointer' }}
        >
          Send another message
        </button>
      </div>
    )
  }

  return (
    <div style={{ background: 'rgba(255,255,255,0.80)', backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)', border: '1px solid rgba(255,255,255,0.70)', borderRadius: 24, padding: 'clamp(24px,3.5vw,40px)', boxShadow: '0 8px 32px rgba(14,17,22,0.08)' }}>
      <div className="eyebrow mb-1" style={{ fontSize: 10, color: T.brass }}>ENQUIRY FORM</div>
      <h2 style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 22, color: T.ink900, margin: '0 0 24px', letterSpacing: '-0.01em' }}>Send us a message</h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Your name" value={name} onChange={setName} required />
          <Field label="Email address" value={email} onChange={setEmail} type="email" required />
        </div>
        <Field label="Phone number" value={phone} onChange={setPhone} type="tel" />
        <SelectField
          label="Subject"
          value={subject}
          onChange={setSubject}
          options={['Membership enquiry', 'Facility booking', 'Billing', 'Other']}
          required
        />
        <TextareaField label="Message" value={message} onChange={setMessage} required />

        {error && (
          <div role="alert" style={{ fontFamily: 'CKCL', fontSize: 13, color: '#B91C1C', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: '10px 14px' }}>
            {error}
          </div>
        )}

        <button
          onClick={send}
          disabled={state === 'sending'}
          style={{
            padding: '14px',
            fontFamily: 'CKCL',
            fontSize: 15, fontWeight: 700,
            color: '#FFFFFF',
            background: state === 'sending' ? '#B70813' : T.brand,
            border: 'none', borderRadius: 999,
            cursor: state === 'sending' ? 'default' : 'pointer',
            transition: 'background 160ms',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
          onMouseEnter={(e) => { if (state !== 'sending') (e.currentTarget as HTMLElement).style.background = '#B70813' }}
          onMouseLeave={(e) => { if (state !== 'sending') (e.currentTarget as HTMLElement).style.background = T.brand }}
        >
          {state === 'sending' ? (
            <>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" style={{ animation: 'spin 0.8s linear infinite' }}><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
              Sending…
            </>
          ) : (
            <>
              Send message
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </>
          )}
        </button>
        <div style={{ fontFamily: 'CKCL', fontSize: 11, color: T.ink200, textAlign: 'center' }}>
          We typically respond within 1–2 working days.
        </div>
      </div>
    </div>
  )
}

// ─── Map band ─────────────────────────────────────────────────────────────────
function MapBand() {
  const site = useSiteInfo()
  const { lat, lng } = site.address
  return (
    <div style={{ position: 'relative', height: 420, borderRadius: 20, overflow: 'hidden', background: T.surface100 }}>
      {site.address.embed_url && <iframe
        title={`${site.short_name || site.club_name} location`}
        width="100%"
        height="100%"
        style={{ border: 'none', display: 'block', filter: 'saturate(0.85)' }}
        src={site.address.embed_url}
        loading="lazy"
      />}
      {/* Glass address card */}
      <div
        style={{
          position: 'absolute',
          bottom: 24,
          left: 24,
          background: 'rgba(255,255,255,0.88)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.70)',
          borderRadius: 16,
          padding: '18px 20px',
          maxWidth: 280,
          boxShadow: '0 8px 28px rgba(14,17,22,0.14)',
        }}
      >
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: T.brandDim, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.brand} strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
          <div>
            <div style={{ fontFamily: 'CKCL', fontWeight: 700, fontSize: 13, color: T.ink900, lineHeight: 1.3 }}>{site.club_name}</div>
            <div style={{ fontFamily: 'CKCL', fontSize: 11, color: T.ink400, marginTop: 3, lineHeight: 1.5 }}>{site.address.short}</div>
          </div>
        </div>
        <a
          href={site.address.map_url || (lat != null && lng != null ? `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}` : undefined)}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            width: '100%', padding: '9px',
            fontFamily: 'CKCL', fontSize: 12, fontWeight: 700,
            color: '#FFFFFF', background: T.brand,
            border: 'none', borderRadius: 999,
            textDecoration: 'none', transition: 'background 160ms',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#B70813' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = T.brand }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
          Get directions
        </a>
      </div>
    </div>
  )
}

// ─── FAQ (API: GET /club/club-portal/website/contact-faqs) ─────────────────────────
function ContactFAQ() {
  const [open, setOpen] = useState<number | null>(null)
  const { faqs, loading } = useContactFaqs()

  if (!loading && faqs.length === 0) return null

  return (
    <div>
      <div className="eyebrow mb-4" style={{ fontSize: 10, color: T.brass }}>FREQUENTLY ASKED</div>
      {loading && faqs.length === 0 ? (
        <div style={{ fontFamily: 'CKCL', fontSize: 14, color: T.ink400 }}>Loading FAQs…</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {faqs.map((faq, i) => {
            const isOpen = open === i
            return (
              <div key={`${faq.q}-${i}`} style={{ background: isOpen ? '#FFFFFF' : 'rgba(255,255,255,0.65)', border: `1px solid ${isOpen ? T.ink100 : 'rgba(226,230,236,0.50)'}`, borderRadius: 14, overflow: 'hidden', transition: 'all 180ms' }}>
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                >
                  <span style={{ fontFamily: 'CKCL', fontWeight: 500, fontSize: 9, color: T.brand, flexShrink: 0, letterSpacing: '0.06em' }}>{String(i + 1).padStart(2, '0')}</span>
                  <span style={{ flex: 1, fontFamily: 'CKCL', fontWeight: 600, fontSize: 14, color: T.ink900, lineHeight: 1.4 }}>{faq.q}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={isOpen ? T.brand : T.ink200} strokeWidth="2.5" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 220ms ease-out', flexShrink: 0 }}><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                {isOpen && (
                  <div style={{ padding: '0 20px 18px 20px', paddingLeft: 44 }}>
                    <p style={{ fontFamily: 'CKCL', fontSize: 14, lineHeight: 1.70, color: T.ink400, margin: 0 }}>{faq.a}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Page header ──────────────────────────────────────────────────────────────
function PageHeader() {
  return (
    <div style={{ minHeight: 'clamp(200px, 28vw, 320px)', background: T.surface100, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingBlock: 'clamp(24px,5vw,80px)', paddingTop: 108, paddingInline: 'max(clamp(24px,5vw,80px), calc((100% - 1280px) / 2 + clamp(24px,5vw,80px)))', paddingBottom: 40 }}>
      <div style={{ position: 'absolute', top: '-10%', right: '5%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle,rgba(225,11,23,0.09) 0%,transparent 65%)', filter: 'blur(40px)', pointerEvents: 'none' }} />
      <div className="flex items-center gap-1.5 mb-3" style={{ position: 'relative', zIndex: 1 }}>
        {['Home', 'Contact Us'].map((c, i, arr) => (
          <span key={i} className="flex items-center gap-1.5">
            <span className="eyebrow" style={{ fontSize: 11, color: i < arr.length - 1 ? T.ink400 : T.ink900 }}>{c}</span>
            {i < arr.length - 1 && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={T.ink200} strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>}
          </span>
        ))}
      </div>
      <div className="eyebrow mb-2" style={{ fontSize: 11, color: T.brass, position: 'relative', zIndex: 1 }}>CONTACT</div>
      <h1 style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 'clamp(30px,4vw,50px)', lineHeight: 1.05, letterSpacing: '-0.02em', color: T.ink900, margin: 0, position: 'relative', zIndex: 1 }}>Contact us.</h1>
    </div>
  )
}

export default function ContactPage() {
  return (
    <div style={{ background: T.surface50, minHeight: '100vh' }}>
      <PageHeader />
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: 'clamp(40px,5vw,64px) clamp(24px,5vw,80px)' }}>
        {/* Two columns */}
        <div className="grid lg:grid-cols-[420px_1fr] gap-8 mb-12">
          <ContactCard />
          <EnquiryForm />
        </div>
        {/* Map */}
        <div style={{ marginBottom: 48 }}>
          <MapBand />
        </div>
        {/* FAQ */}
        <ContactFAQ />
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <Footer />
    </div>
  )
}
