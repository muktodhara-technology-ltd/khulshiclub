import { useState, useRef, useCallback, useId, useEffect } from 'react'
import { createPortal } from 'react-dom'
import ApplicantDashboard, { type ApplicantSection } from './ApplicantDashboard'
import MembershipFormPdf from './MembershipFormPdf'
import {
  emptyForm, findRecord, getSession, saveRecord, setSession,
  type Address, type ApplicantAccount, type ApplicantRecord, type ApplicationForm, type Child, type OtherClub,
} from '../data/application'
import { ApiError } from '../lib/api/client'
import { pathForPage } from '../lib/routing'
import { useSiteInfo } from '../lib/siteInfo'
import {
  applicationFeeRows,
  checkApplicantAvailability,
  fetchApplicationStatus,
  fetchPortalClubSettings,
  searchProposers,
  submitPortalApplication,
  type PortalBankAccount,
  type PortalMembershipType,
  type PortalProposer,
} from '../lib/apply'
import { SITE_W, SITE_HEADER_PAD_INLINE } from '../lib/layout'

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  ink900:    '#0E1116',
  ink600:    '#2A3039',
  ink400:    '#5C6673',
  ink200:    '#A8B0BB',
  ink100:    '#E2E6EC',
  surface50:  '#F7F8FA',
  surface100: '#EEF1F5',
  brand:     '#E10B17',
  brandDim:  'rgba(225,11,23,0.15)',
  brandRing: 'rgba(225,11,23,0.15)',
  green:     '#16A34A',
  greenDim:  '#DCFCE7',
  red:       '#E10B17',
  redDim:    '#FFF1F2',
  brass:     '#B98B43',
}

// ─── Form primitive types ─────────────────────────────────────────────────────
type FieldState = 'idle' | 'focused' | 'filled' | 'error' | 'success' | 'disabled'

type FieldWrapProps = {
  label: string
  state?: FieldState
  error?: string
  success?: string
  required?: boolean
  children: (id: string) => React.ReactNode
}

function FieldWrap({ label, state = 'idle', error, success, required, children }: FieldWrapProps) {
  const id = useId()
  const isUp = state === 'focused' || state === 'filled' || state === 'error' || state === 'success'

  const borderColor = state === 'error' ? T.red
    : state === 'success' ? T.green
    : state === 'focused' ? T.brand
    : T.ink100

  const ringColor = state === 'error' ? 'rgba(225,11,23,0.15)'
    : state === 'success' ? 'rgba(22,163,74,0.12)'
    : state === 'focused' ? T.brandRing
    : 'transparent'

  return (
    <div style={{ position: 'relative', marginBottom: 4 }}>
      <div
        style={{
          position: 'relative',
          border: `1px solid ${borderColor}`,
          borderRadius: 10,
          background: state === 'disabled' ? T.surface100 : '#FFFFFF',
          boxShadow: `0 0 0 3px ${ringColor}`,
          transition: 'border-color 160ms, box-shadow 160ms',
        }}
      >
        {/* Floating label */}
        <label
          htmlFor={id}
          style={{
            position: 'absolute',
            left: 14,
            top: isUp ? 8 : '50%',
            transform: isUp ? 'none' : 'translateY(-50%)',
            fontFamily: 'CKCL',
            fontSize: isUp ? 10 : 14,
            fontWeight: isUp ? 600 : 400,
            color: state === 'error' ? T.red : state === 'success' ? T.green : state === 'focused' ? T.brand : T.ink200,
            letterSpacing: isUp ? '0.04em' : 0,
            pointerEvents: 'none',
            transition: 'all 160ms ease-out',
            zIndex: 1,
            whiteSpace: 'nowrap',
          }}
        >
          {label}{required && ' *'}
        </label>
        {children(id)}
      </div>

      {/* Helper line */}
      {(error || success) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            marginTop: 5,
            fontSize: 12,
            fontFamily: 'CKCL',
            color: error ? T.red : T.green,
            paddingLeft: 2,
          }}
        >
          {error ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.red} strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.green} strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          )}
          {error || success}
        </div>
      )}
    </div>
  )
}

// Shared input styles
const inputStyle = (pt = 26): React.CSSProperties => ({
  width: '100%',
  height: 52,
  paddingTop: pt,
  paddingBottom: 0,
  paddingLeft: 14,
  paddingRight: 14,
  fontFamily: 'CKCL',
  fontSize: 14,
  color: T.ink900,
  background: 'transparent',
  border: 'none',
  outline: 'none',
  boxSizing: 'border-box',
})

// ─── Text Input ───────────────────────────────────────────────────────────────
type TextInputProps = {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  required?: boolean
  disabled?: boolean
  error?: string
  success?: string
  placeholder?: string
  autoComplete?: string
}

function TextInput({ label, value, onChange, type = 'text', required, disabled, error, success, placeholder, autoComplete }: TextInputProps) {
  const [focused, setFocused] = useState(false)
  const state: FieldState = disabled ? 'disabled'
    : error ? 'error'
    : success ? 'success'
    : focused ? 'focused'
    : value ? 'filled'
    : 'idle'

  return (
    <FieldWrap label={label} state={state} error={error} success={success} required={required}>
      {(id) => (
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          disabled={disabled}
          placeholder={focused ? placeholder : undefined}
          autoComplete={autoComplete}
          style={{ ...inputStyle(), cursor: disabled ? 'not-allowed' : 'text', opacity: disabled ? 0.55 : 1 }}
        />
      )}
    </FieldWrap>
  )
}

// ─── Textarea ─────────────────────────────────────────────────────────────────
function TextareaField({ label, value, onChange, required, error }: {
  label: string; value: string; onChange: (v: string) => void; required?: boolean; error?: string
}) {
  const [focused, setFocused] = useState(false)
  const state: FieldState = error ? 'error' : focused ? 'focused' : value ? 'filled' : 'idle'
  const isUp = state !== 'idle'

  const borderColor = state === 'error' ? T.red : state === 'focused' ? T.brand : T.ink100
  const ringColor = state === 'error' ? 'rgba(225,11,23,0.15)' : state === 'focused' ? T.brandRing : 'transparent'

  const id = useId()
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ position: 'relative', border: `1px solid ${borderColor}`, borderRadius: 10, background: '#FFFFFF', boxShadow: `0 0 0 3px ${ringColor}`, transition: 'border-color 160ms, box-shadow 160ms' }}>
        <label htmlFor={id} style={{ position: 'absolute', left: 14, top: isUp ? 10 : 18, fontFamily: 'CKCL', fontSize: isUp ? 10 : 14, fontWeight: isUp ? 600 : 400, color: state === 'error' ? T.red : state === 'focused' ? T.brand : T.ink200, letterSpacing: isUp ? '0.04em' : 0, pointerEvents: 'none', transition: 'all 160ms', zIndex: 1 }}>{label}{required && ' *'}</label>
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          rows={3}
          style={{ width: '100%', paddingTop: 28, paddingBottom: 10, paddingLeft: 14, paddingRight: 14, fontFamily: 'CKCL', fontSize: 14, color: T.ink900, background: 'transparent', border: 'none', outline: 'none', resize: 'vertical', boxSizing: 'border-box', minHeight: 80 }}
        />
      </div>
      {error && <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5, fontSize: 12, fontFamily: 'CKCL', color: T.red, paddingLeft: 2 }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.red} strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>{error}</div>}
    </div>
  )
}

// ─── Select field ─────────────────────────────────────────────────────────────
function SelectField({ label, value, onChange, options, required, error }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; required?: boolean; error?: string
}) {
  const [focused, setFocused] = useState(false)
  const state: FieldState = error ? 'error' : focused ? 'focused' : value ? 'filled' : 'idle'
  const isUp = state !== 'idle'
  const borderColor = state === 'error' ? T.red : state === 'focused' ? T.brand : T.ink100
  const ringColor = state === 'error' ? 'rgba(225,11,23,0.15)' : state === 'focused' ? T.brandRing : 'transparent'
  const id = useId()

  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ position: 'relative', border: `1px solid ${borderColor}`, borderRadius: 10, background: '#FFFFFF', boxShadow: `0 0 0 3px ${ringColor}`, transition: 'border-color 160ms, box-shadow 160ms' }}>
        <label htmlFor={id} style={{ position: 'absolute', left: 14, top: isUp ? 8 : '50%', transform: isUp ? 'none' : 'translateY(-50%)', fontFamily: 'CKCL', fontSize: isUp ? 10 : 14, fontWeight: isUp ? 600 : 400, color: state === 'error' ? T.red : state === 'focused' ? T.brand : T.ink200, letterSpacing: isUp ? '0.04em' : 0, pointerEvents: 'none', transition: 'all 160ms', zIndex: 1 }}>{label}{required && ' *'}</label>
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{ ...inputStyle(), appearance: 'none', WebkitAppearance: 'none', cursor: 'pointer', paddingRight: 36 }}
        >
          <option value="" />
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.ink200} strokeWidth="2.5" style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>
      {error && <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5, fontSize: 12, fontFamily: 'CKCL', color: T.red, paddingLeft: 2 }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.red} strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>{error}</div>}
    </div>
  )
}

// ─── Radio group ──────────────────────────────────────────────────────────────
function RadioGroup({ label, value, onChange, options, required }: {
  label: string; value: string; onChange: (v: string) => void; options: string[]; required?: boolean
}) {
  return (
    <div>
      <div style={{ fontFamily: 'CKCL', fontSize: 12, fontWeight: 600, color: T.ink400, letterSpacing: '0.04em', marginBottom: 10 }}>{label}{required && ' *'}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {options.map((opt) => {
          const checked = value === opt
          return (
            <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
              <div
                style={{
                  width: 18, height: 18, borderRadius: '50%',
                  border: `2px solid ${checked ? T.brand : T.ink100}`,
                  background: checked ? T.brand : '#FFFFFF',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 160ms', flexShrink: 0,
                }}
                onClick={() => onChange(opt)}
              >
                {checked && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#FFFFFF' }} />}
              </div>
              <input type="radio" checked={checked} onChange={() => onChange(opt)} style={{ display: 'none' }} />
              <span style={{ fontFamily: 'CKCL', fontSize: 13, color: T.ink600 }}>{opt}</span>
            </label>
          )
        })}
      </div>
    </div>
  )
}

// ─── Checkbox ─────────────────────────────────────────────────────────────────
function Checkbox({ checked, onChange, children, error }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode; error?: string }) {
  return (
    <div>
      {/* The whole row toggles, not just the box; links inside keep working */}
      <label
        role="checkbox" aria-checked={checked} tabIndex={0}
        onClick={(e) => { if (!(e.target as HTMLElement).closest('a')) onChange(!checked) }}
        onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onChange(!checked) } }}
        style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', userSelect: 'none', outlineOffset: 4 }}
      >
        <div
          style={{
            width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 1,
            border: `2px solid ${error ? T.red : checked ? T.brand : T.ink100}`,
            background: checked ? T.brand : '#FFFFFF',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 160ms', boxShadow: checked ? `0 0 0 3px ${T.brandRing}` : 'none',
          }}
        >
          {checked && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
        </div>
        <span style={{ fontFamily: 'CKCL', fontSize: 14, lineHeight: 1.6, color: T.ink600 }}>{children}</span>
      </label>
      {error && <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6, fontSize: 12, fontFamily: 'CKCL', color: T.red, paddingLeft: 32 }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.red} strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>{error}</div>}
    </div>
  )
}

// ─── Photo upload zone ────────────────────────────────────────────────────────
function PhotoUpload({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const [drag, setDrag] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (e) => onChange(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDrag(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [])

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        style={{
          flex: 1,
          height: 120,
          border: `2px dashed ${drag ? T.brand : T.ink100}`,
          borderRadius: 12,
          background: drag ? T.redDim : T.surface50,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          cursor: 'pointer',
          transition: 'all 200ms',
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={drag ? T.brand : T.ink200} strokeWidth="1.5">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        <span style={{ fontFamily: 'CKCL', fontSize: 12, color: T.ink400, textAlign: 'center', lineHeight: 1.4 }}>
          Drop photo here or{' '}
          <span style={{ color: T.brand, fontWeight: 600 }}>browse</span>
        </span>
        <span style={{ fontFamily: 'CKCL', fontSize: 10, color: T.ink200 }}>JPG or PNG, max 2 MB</span>
        <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
      </div>

      {/* Preview */}
      {value ? (
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{ width: 88, height: 110, borderRadius: 10, overflow: 'hidden', border: `1px solid ${T.ink100}` }}>
            <img src={value} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </div>
          <button
            onClick={() => onChange(null)}
            style={{ position: 'absolute', top: -8, right: -8, width: 22, height: 22, borderRadius: '50%', background: T.red, border: '2px solid #FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      ) : (
        <div style={{ width: 88, height: 110, borderRadius: 10, background: T.surface100, border: `1px dashed ${T.ink100}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={T.ink200} strokeWidth="1.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </div>
      )}
    </div>
  )
}

// ─── Doc upload row ───────────────────────────────────────────────────────────
/** Stores a data-URL so apply.ts can rebuild a real File for multipart submit. */
function DocUpload({ label, value, onChange }: { label: string; value: string | null; onChange: (v: string | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const hasFile = Boolean(value && value.startsWith('data:'))

  const handleFile = (file: File) => {
    const okType =
      file.type.startsWith('image/') ||
      file.type === 'application/pdf' ||
      /\.(jpe?g|png|webp|pdf)$/i.test(file.name)
    if (!okType) return
    if (file.size > 5 * 1024 * 1024) return
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      if (!dataUrl) return
      setFileName(file.name)
      onChange(dataUrl)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 16px',
        border: `1px solid ${hasFile ? T.green : T.ink100}`,
        borderRadius: 10,
        background: hasFile ? T.greenDim : '#FFFFFF',
        transition: 'all 200ms',
      }}
    >
      <div style={{ width: 36, height: 36, borderRadius: 8, background: hasFile ? T.green : T.surface100, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 200ms' }}>
        {hasFile
          ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.ink200} strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        }
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'CKCL', fontSize: 13, fontWeight: 600, color: hasFile ? T.green : T.ink600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
        <div style={{ fontFamily: 'CKCL', fontSize: 11, color: hasFile ? T.green : T.ink200, marginTop: 1 }}>
          {hasFile ? (fileName || 'File ready to submit') : 'PDF, JPG or PNG · max 5 MB'}
        </div>
      </div>
      <button
        type="button"
        onClick={() => {
          if (hasFile) {
            setFileName(null)
            onChange(null)
          } else {
            inputRef.current?.click()
          }
        }}
        style={{ fontFamily: 'CKCL', fontSize: 12, fontWeight: 600, color: hasFile ? T.red : T.brand, background: 'none', border: 'none', cursor: 'pointer', padding: '6px 12px', borderRadius: 8, flexShrink: 0 }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = hasFile ? T.redDim : T.redDim }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'none' }}
      >
        {hasFile ? 'Remove' : 'Upload'}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (f) handleFile(f)
        }}
      />
    </div>
  )
}

// ─── Member autocomplete (API: GET /club/club-portal/proposers) ─────────────────────
/** Club names from Website Maintenance → Site Info (short for inline copy, full for legal text). */
function useClubNames() {
  const site = useSiteInfo()
  return {
    short: site.short_name || site.club_name || '',
    full: site.club_name || site.short_name || '',
  }
}

function MemberSearch({ label, value, memberId, onSelect }: {
  label: string
  value: string
  memberId: string
  onSelect: (name: string, memberNo: string) => void
}) {
  const club = useClubNames()
  const [focused, setFocused] = useState(false)
  const [query, setQuery] = useState(value)
  const [suggestions, setSuggestions] = useState<PortalProposer[]>([])
  const [loading, setLoading] = useState(false)
  const state: FieldState = value ? 'success' : focused ? 'focused' : 'idle'

  const borderColor = state === 'success' ? T.green : state === 'focused' ? T.brand : T.ink100
  const ringColor = state === 'success' ? 'rgba(22,163,74,0.12)' : state === 'focused' ? T.brandRing : 'transparent'
  const id = useId()
  const isUp = state !== 'idle' || query !== ''

  useEffect(() => {
    if (value) setQuery(value)
  }, [value])

  useEffect(() => {
    if (value || query.trim().length < 2) {
      setSuggestions([])
      return
    }
    let alive = true
    const t = window.setTimeout(() => {
      setLoading(true)
      searchProposers(query)
        .then((rows) => { if (alive) setSuggestions(Array.isArray(rows) ? rows : []) })
        .catch(() => { if (alive) setSuggestions([]) })
        .finally(() => { if (alive) setLoading(false) })
    }, 280)
    return () => { alive = false; window.clearTimeout(t) }
  }, [query, value])

  return (
    <div style={{ position: 'relative', marginBottom: 4 }}>
      <div style={{ position: 'relative', border: `1px solid ${borderColor}`, borderRadius: 10, background: '#FFFFFF', boxShadow: `0 0 0 3px ${ringColor}`, transition: 'all 160ms' }}>
        <label htmlFor={id} style={{ position: 'absolute', left: 14, top: isUp ? 8 : '50%', transform: isUp ? 'none' : 'translateY(-50%)', fontFamily: 'CKCL', fontSize: isUp ? 10 : 14, fontWeight: isUp ? 600 : 400, color: state === 'success' ? T.green : state === 'focused' ? T.brand : T.ink200, letterSpacing: isUp ? '0.04em' : 0, pointerEvents: 'none', transition: 'all 160ms', zIndex: 1 }}>{label} *</label>
        <input
          id={id}
          value={value || query}
          onChange={(e) => { setQuery(e.target.value); onSelect('', '') }}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 160)}
          style={{ ...inputStyle(), paddingRight: value ? 44 : 14 }}
          placeholder={focused && !value ? 'Type member name or ID…' : undefined}
          autoComplete="off"
        />
        {value && (
          <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.green} strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            <button type="button" onClick={() => { onSelect('', ''); setQuery('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.ink200, display: 'flex', padding: 2 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        )}
      </div>

      {focused && !value && (loading || suggestions.length > 0) && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: '#FFFFFF', border: `1px solid ${T.ink100}`, borderRadius: 12, boxShadow: '0 8px 24px rgba(14,17,22,0.12)', zIndex: 50, overflow: 'hidden' }}>
          {loading && suggestions.length === 0 && (
            <div style={{ padding: '12px 16px', fontFamily: 'CKCL', fontSize: 13, color: T.ink400 }}>Searching members…</div>
          )}
          {suggestions.slice(0, 8).map((s) => (
            <div
              key={s.id}
              onMouseDown={() => { onSelect(s.name, s.member_no || ''); setQuery(s.name); setFocused(false) }}
              style={{ padding: '12px 16px', fontFamily: 'CKCL', fontSize: 14, color: T.ink600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = T.redDim }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '' }}
            >
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: T.surface100, border: `1.5px solid ${T.brass}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontFamily: 'CKCL', fontSize: 10, fontWeight: 600, color: T.brass }}>{(s.name || '?')[0]}</span>
              </div>
              <div>
                <div style={{ fontWeight: 600, color: T.ink900 }}>{s.name}</div>
                <div style={{ fontSize: 11, color: T.ink200, marginTop: 1 }}>{s.member_no || 'Member'}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      {value && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5, fontSize: 12, fontFamily: 'CKCL', color: T.green, paddingLeft: 2 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.green} strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          {memberId ? `Verified · ${memberId}` : `Selected ${club.short ? `${club.short} ` : ''}member`}
        </div>
      )}
    </div>
  )
}

// ─── Password input (with show / hide) ────────────────────────────────────────
function PasswordInput({ label, value, onChange, required, error, autoComplete }: {
  label: string; value: string; onChange: (v: string) => void; required?: boolean; error?: string; autoComplete?: string
}) {
  const [focused, setFocused] = useState(false)
  const [show, setShow] = useState(false)
  const state: FieldState = error ? 'error' : focused ? 'focused' : value ? 'filled' : 'idle'

  return (
    <FieldWrap label={label} state={state} error={error} required={required}>
      {(id) => (
        <>
          <input
            id={id}
            type={show ? 'text' : 'password'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            autoComplete={autoComplete}
            style={{ ...inputStyle(), paddingRight: 46 }}
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? 'Hide password' : 'Show password'}
            style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', width: 34, height: 34, borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer', color: T.ink200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {show
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M1 1l22 22"/></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
          </button>
        </>
      )}
    </FieldWrap>
  )
}

// ─── Progress indicator ────────────────────────────────────────────────────────
const STEP_LABELS = ['Personal Details', 'Contact & Address', 'Family & Nominee', 'Professional', 'Category & Declaration']
const LAST_STEP = STEP_LABELS.length - 1

function StepProgress({ step, onStep }: { step: number; onStep: (s: number) => void }) {
  return (
    <div className="py-4 sm:py-6 px-4 sm:px-6" style={{ background: '#FFFFFF', border: `1px solid ${T.ink100}`, borderRadius: 14, position: 'sticky', top: 76, zIndex: 30 }}>
      {/* Mobile: compact step header + segmented bar (labels would overflow the screen edges) */}
      <div className="sm:hidden">
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
          <div style={{ minWidth: 0 }}>
            <div className="eyebrow" style={{ fontSize: 10, color: T.brand, marginBottom: 3 }}>Step {step + 1} of {STEP_LABELS.length}</div>
            <div style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 16, color: T.ink900, lineHeight: 1.25 }}>{STEP_LABELS[step]}</div>
          </div>
          {step < LAST_STEP && (
            <div style={{ fontFamily: 'CKCL', fontSize: 12, color: T.ink400, textAlign: 'right', flexShrink: 0 }}>
              Next: <span style={{ color: T.ink600, fontWeight: 600 }}>{STEP_LABELS[step + 1]}</span>
            </div>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${STEP_LABELS.length}, 1fr)`, gap: 6 }}>
          {STEP_LABELS.map((label, i) => (
            <button key={label} onClick={() => onStep(i)} aria-label={`Go to ${label}`} style={{ height: 4, padding: 0, border: 'none', borderRadius: 999, background: T.ink100, overflow: 'hidden', cursor: 'pointer' }}>
              <div style={{ height: '100%', width: i <= step ? '100%' : '0%', background: T.brand, borderRadius: 999, transition: 'width 360ms ease-out' }} />
            </button>
          ))}
        </div>
      </div>

      {/* Tablet / desktop: numbered stepper — any step can be revisited */}
      <div className="hidden sm:block" style={{ paddingBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {STEP_LABELS.map((label, i) => {
            const done = i < step
            const current = i === step
            return (
              <div key={i} style={{ flex: i < LAST_STEP ? 1 : 'none', display: 'flex', alignItems: 'center' }}>
                <button onClick={() => onStep(i)} aria-label={`Go to ${label}`} aria-current={current ? 'step' : undefined} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                  <div
                    style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: done ? T.brand : current ? '#FFFFFF' : T.surface100,
                      border: `2px solid ${done || current ? T.brand : T.ink100}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: current ? `0 0 0 4px ${T.brandRing}` : 'none',
                      transition: 'all 240ms', flexShrink: 0,
                    }}
                  >
                    {done
                      ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                      : <span style={{ fontFamily: 'CKCL', fontWeight: 500, fontSize: 11, color: current ? T.brand : T.ink200 }}>{i + 1}</span>}
                  </div>
                  {/* First and last labels align to the bar's ends so they don't overflow the card */}
                  <span className="hidden md:block" style={{ fontFamily: 'CKCL', fontSize: 10, fontWeight: current ? 700 : 500, color: current ? T.ink900 : done ? T.brand : T.ink200, whiteSpace: 'nowrap', position: 'absolute', top: 38, ...(i === 0 ? { left: 0 } : i === LAST_STEP ? { right: 0 } : { left: '50%', transform: 'translateX(-50%)' }) }}>
                    {label}
                  </span>
                </button>
                {i < LAST_STEP && (
                  <div style={{ flex: 1, height: 2, background: T.ink100, margin: '0 6px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, background: T.brand, transition: 'width 360ms ease-out', width: done ? '100%' : '0%' }} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <div className="md:hidden" style={{ fontFamily: 'CKCL', fontSize: 13, fontWeight: 600, color: T.ink900, marginTop: 12 }}>{STEP_LABELS[step]}</div>
      </div>
    </div>
  )
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHead({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <h2 style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 26, color: T.ink900, margin: 0, letterSpacing: '-0.01em', lineHeight: 1.2 }}>{title}</h2>
      {subtitle && <p style={{ fontFamily: 'CKCL', fontSize: 14, color: T.ink400, marginTop: 6, lineHeight: 1.6 }}>{subtitle}</p>}
    </div>
  )
}

function SubHead({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div style={{ marginTop: 14, paddingTop: 18, borderTop: `1px solid ${T.ink100}` }}>
      <div style={{ fontFamily: 'CKCL', fontSize: 12, fontWeight: 600, color: T.ink400, letterSpacing: '0.06em' }}>{children}</div>
      {hint && <div style={{ fontFamily: 'CKCL', fontSize: 12.5, color: T.ink200, marginTop: 4 }}>{hint}</div>}
    </div>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>{children}</div>
}

const Stack = ({ children, gap = 16 }: { children: React.ReactNode; gap?: number }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap }}>{children}</div>
)

function AddressFields({ value, onChange }: { value: Address; onChange: (a: Address) => void }) {
  const set = (patch: Partial<Address>) => onChange({ ...value, ...patch })
  return (
    <Stack>
      <TextInput label="Address" value={value.address} onChange={(v) => set({ address: v })} required autoComplete="street-address"/>
      <Row>
        <TextInput label="Police Station" value={value.policeStation} onChange={(v) => set({ policeStation: v })}/>
        <TextInput label="Post Office" value={value.postOffice} onChange={(v) => set({ postOffice: v })}/>
      </Row>
      <Row>
        <TextInput label="Postal Code" value={value.postalCode} onChange={(v) => set({ postalCode: v })} autoComplete="postal-code"/>
        <TextInput label="District" value={value.district} onChange={(v) => set({ district: v })} required/>
        <TextInput label="Country" value={value.country} onChange={(v) => set({ country: v })} autoComplete="country-name"/>
      </Row>
    </Stack>
  )
}

// Repeatable rows (children, other clubs) — up to five, like the paper form
function RepeatList<Item>({ items, onChange, empty, noun, render }: {
  items: Item[]; onChange: (items: Item[]) => void; empty: Item; noun: string
  render: (item: Item, set: (patch: Partial<Item>) => void) => React.ReactNode
}) {
  return (
    <Stack gap={12}>
      {items.map((item, i) => (
        <div key={i} style={{ border: `1px solid ${T.ink100}`, borderRadius: 12, padding: 14, background: T.surface50 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontFamily: 'CKCL', fontSize: 13, fontWeight: 600, color: T.ink600 }}>{noun} {i + 1}</span>
            <button onClick={() => onChange(items.filter((_, j) => j !== i))} style={{ fontFamily: 'CKCL', fontSize: 12, fontWeight: 600, color: T.red, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}>Remove</button>
          </div>
          {render(item, (patch) => onChange(items.map((it, j) => (j === i ? { ...it, ...patch } : it))))}
        </div>
      ))}
      {items.length < 5 && (
        <button
          onClick={() => onChange([...items, empty])}
          style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'CKCL', fontSize: 13, fontWeight: 600, color: T.brand, background: '#FFFFFF', border: `1.5px dashed ${T.ink100}`, borderRadius: 999, padding: '9px 16px', cursor: 'pointer' }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add {noun.toLowerCase()}
        </button>
      )}
    </Stack>
  )
}

type StepProps = { form: ApplicationForm; update: (patch: Partial<ApplicationForm>) => void }

// ─── Step 1: Personal details ─────────────────────────────────────────────────
function Step1({ form, update }: StepProps) {
  const p = form.personal
  const set = (patch: Partial<ApplicationForm['personal']>) => update({ personal: { ...p, ...patch } })
  return (
    <Stack>
      <SectionHead title="Personal Details" subtitle="Enter your personal information as it appears on your official identification document." />

      <div>
        <div style={{ fontFamily: 'CKCL', fontSize: 12, fontWeight: 600, color: T.ink400, letterSpacing: '0.04em', marginBottom: 10 }}>PASSPORT-SIZED PHOTO *</div>
        <PhotoUpload value={p.photo} onChange={(v) => set({ photo: v })} />
      </div>

      <TextInput label="Full Name" value={p.fullName} onChange={(v) => set({ fullName: v })} required autoComplete="name"/>
      <Row>
        <TextInput label="Father's Name" value={p.fatherName} onChange={(v) => set({ fatherName: v })} required />
        <TextInput label="Mother's Name" value={p.motherName} onChange={(v) => set({ motherName: v })} required />
      </Row>
      <Row>
        <TextInput label="Date of Birth" value={p.dob} onChange={(v) => set({ dob: v })} type="date" required />
        <TextInput label="Place of Birth" value={p.birthPlace} onChange={(v) => set({ birthPlace: v })} />
      </Row>

      <RadioGroup label="MARITAL STATUS" value={p.maritalStatus} onChange={(v) => set({ maritalStatus: v })} options={['Single', 'Married']} required />
      {p.maritalStatus === 'Married' && (
        <Row>
          <TextInput label="Spouse Name" value={p.spouseName} onChange={(v) => set({ spouseName: v })} />
          <TextInput label="Anniversary" value={p.anniversary} onChange={(v) => set({ anniversary: v })} type="date" />
        </Row>
      )}

      <Row>
        <SelectField label="Nationality" value={p.nationality} onChange={(v) => set({ nationality: v })} required
          options={[{ value: 'Bangladeshi', label: 'Bangladeshi' }, { value: 'Other', label: 'Other' }]} />
        <SelectField label="Blood Group" value={p.bloodGroup} onChange={(v) => set({ bloodGroup: v })} required
          options={['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => ({ value: bg, label: bg }))} />
      </Row>
      <Row>
        <TextInput label="NID Number" value={p.nidNo} onChange={(v) => set({ nidNo: v })} required />
        <TextInput label="Passport Number" value={p.passportNo} onChange={(v) => set({ passportNo: v })} />
      </Row>
      <Row>
        <TextInput label="Educational Qualification" value={p.education} onChange={(v) => set({ education: v })} />
        <TextInput label="Institution Name" value={p.institution} onChange={(v) => set({ institution: v })} />
      </Row>
      <TextInput label="E-TIN Number" value={p.etin} onChange={(v) => set({ etin: v })} />
    </Stack>
  )
}

// ─── Step 2: Contact & address ────────────────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function Step2({ form, update }: StepProps) {
  const p = form.personal
  const set = (patch: Partial<ApplicationForm['personal']>) => update({ personal: { ...p, ...patch } })
  return (
    <Stack>
      <SectionHead title="Contact & Address" subtitle="All correspondence about your application will be sent to the email address below." />

      <Row>
        <TextInput label="Mobile Number" value={p.phone} onChange={(v) => set({ phone: v })} type="tel" required autoComplete="tel"
          error={p.phone && !/^\+?\d{10,15}$/.test(p.phone.replace(/[\s-]/g, '')) ? 'Enter a valid phone number' : undefined} />
        <TextInput label="Telephone (optional)" value={p.tel} onChange={(v) => set({ tel: v })} type="tel" />
      </Row>
      <TextInput label="Email Address" value={p.email} onChange={(v) => set({ email: v })} type="email" required autoComplete="email"
        error={p.email && !EMAIL_RE.test(p.email) ? 'Enter a valid email address' : undefined} />

      <SubHead>PRESENT ADDRESS</SubHead>
      <AddressFields value={form.present} onChange={(a) => update({ present: a, ...(form.sameAsPresent ? { permanent: a } : {}) })}/>

      <SubHead>PERMANENT ADDRESS</SubHead>
      <Checkbox checked={form.sameAsPresent} onChange={(v) => update({ sameAsPresent: v, ...(v ? { permanent: form.present } : {}) })}>
        Permanent address is the same as present address
      </Checkbox>
      {!form.sameAsPresent && <AddressFields value={form.permanent} onChange={(a) => update({ permanent: a })}/>}
    </Stack>
  )
}

// ─── Step 3: Family & nominee ─────────────────────────────────────────────────
function Step3({ form, update }: StepProps) {
  const n = form.nominee
  const set = (patch: Partial<ApplicationForm['nominee']>) => update({ nominee: { ...n, ...patch } })
  return (
    <Stack>
      <SectionHead title="Family & Nominee" subtitle="List your children, if any, and the person you nominate for your membership." />

      <SubHead hint="Up to five. Leave empty if not applicable.">DETAILS OF CHILDREN</SubHead>
      <RepeatList<Child>
        items={form.children} onChange={(children) => update({ children })} noun="Child"
        empty={{ name: '', sex: '', dob: '', occupation: '' }}
        render={(c, setC) => (
          <Stack gap={12}>
            <TextInput label="Name" value={c.name} onChange={(v) => setC({ name: v })} />
            <Row>
              <SelectField label="Sex" value={c.sex} onChange={(v) => setC({ sex: v })} options={[{ value: 'M', label: 'Male' }, { value: 'F', label: 'Female' }]} />
              <TextInput label="Date of Birth" value={c.dob} onChange={(v) => setC({ dob: v })} type="date" />
            </Row>
            <TextInput label="Occupation with Address" value={c.occupation} onChange={(v) => setC({ occupation: v })} />
          </Stack>
        )}
      />

      <SubHead>NOMINEE INFORMATION</SubHead>
      <Row>
        <TextInput label="Nominee Name" value={n.name} onChange={(v) => set({ name: v })} required />
        <TextInput label="Relation" value={n.relation} onChange={(v) => set({ relation: v })} required />
      </Row>
      <Row>
        <TextInput label="Date of Birth" value={n.dob} onChange={(v) => set({ dob: v })} type="date" />
        <TextInput label="Phone" value={n.phone} onChange={(v) => set({ phone: v })} type="tel" />
      </Row>
      <TextInput label="Email" value={n.email} onChange={(v) => set({ email: v })} type="email"
        error={n.email && !EMAIL_RE.test(n.email) ? 'Enter a valid email address' : undefined} />
      <Row>
        <TextInput label="NID Number" value={n.nidNo} onChange={(v) => set({ nidNo: v })} />
        <TextInput label="Passport Number" value={n.passportNo} onChange={(v) => set({ passportNo: v })} />
      </Row>
      <TextInput label="Occupation" value={n.occupation} onChange={(v) => set({ occupation: v })} />
      <div>
        <div style={{ fontFamily: 'CKCL', fontSize: 12, fontWeight: 600, color: T.ink400, letterSpacing: '0.04em', marginBottom: 10 }}>NOMINEE PHOTO</div>
        <PhotoUpload value={n.photo} onChange={(v) => set({ photo: v })} />
      </div>
    </Stack>
  )
}

// ─── Step 4: Professional details ─────────────────────────────────────────────
function Step4({ form, update }: StepProps) {
  const pr = form.professional
  const set = (patch: Partial<ApplicationForm['professional']>) => update({ professional: { ...pr, ...patch } })
  return (
    <Stack>
      <SectionHead title="Professional Details" subtitle="Your current employer or business. This is verified during the application review." />

      <Row>
        <TextInput label="Profession" value={pr.profession} onChange={(v) => set({ profession: v })} required />
        <TextInput label="Designation / Title" value={pr.designation} onChange={(v) => set({ designation: v })} required />
      </Row>
      <TextInput label="Company / Organisation" value={pr.company} onChange={(v) => set({ company: v })} required />

      <SubHead>OFFICE ADDRESS</SubHead>
      <AddressFields value={pr.address} onChange={(a) => set({ address: a })}/>

      <SubHead hint="Up to five. Leave empty if not applicable.">OTHER CLUB MEMBERSHIP</SubHead>
      <RepeatList<OtherClub>
        items={form.otherClubs} onChange={(otherClubs) => update({ otherClubs })} noun="Club"
        empty={{ name: '', type: '', year: '' }}
        render={(c, setC) => (
          <Stack gap={12}>
            <TextInput label="Club Name" value={c.name} onChange={(v) => setC({ name: v })} />
            <Row>
              <TextInput label="Membership Type" value={c.type} onChange={(v) => setC({ type: v })} />
              <TextInput label="Year" value={c.year} onChange={(v) => setC({ year: v.replace(/\D/g, '').slice(0, 4) })} />
            </Row>
          </Stack>
        )}
      />
    </Stack>
  )
}

/**
 * Opens the club's Terms & Conditions page (Website Maintenance → About → Terms) in a new
 * tab, so the half-filled form stays put. stopPropagation keeps the click from also
 * toggling the surrounding checkbox label.
 */
function TermsLink() {
  return (
    <a
      href={pathForPage('terms')}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      style={{ color: T.brand, textDecoration: 'none', fontWeight: 600 }}
    >
      Terms & Conditions
    </a>
  )
}

// ─── Step 5: Category, proposer & declaration ─────────────────────────────────
function formatBdt(n: number) {
  return `৳ ${n.toLocaleString('en-BD', { maximumFractionDigits: 0 })}`
}

function FeePanel({ category, fees, banks, registrationFee }: {
  category: string
  fees?: PortalMembershipType['fees']
  banks?: PortalBankAccount[]
  registrationFee?: number
}) {
  const { rows, total } = applicationFeeRows(registrationFee, fees)
  const hasCategoryFees = rows.some((r) => r.when === 'approval')

  return (
    <div style={{ background: '#FFFFFF', border: `1px solid rgba(185,139,67,0.28)`, borderRadius: 16, overflow: 'hidden' }}>
      <div style={{ background: T.surface50, padding: '14px 20px', borderBottom: `1px solid ${T.ink100}` }}>
        <div style={{ fontFamily: 'CKCL', fontWeight: 500, fontSize: 10, letterSpacing: '0.08em', color: T.brass }}>FEE SUMMARY</div>
        <div style={{ fontFamily: 'CKCL', fontSize: 11, color: T.ink200, marginTop: 3 }}>{category || 'Membership'} · due on approval</div>
      </div>
      {!hasCategoryFees && (
        <div style={{ padding: '14px 20px', fontFamily: 'CKCL', fontSize: 13, color: T.ink400, borderBottom: rows.length ? `1px solid ${T.surface50}` : 'none' }}>
          {category ? 'No fee schedule published for this category yet.' : 'Select a membership category to see fees.'}
        </div>
      )}
      {rows.length > 0 && (
        <>
          {rows.map((r, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '12px 20px', borderBottom: `1px solid ${T.surface50}` }}>
              <span style={{ fontFamily: 'CKCL', fontSize: 13, color: T.ink400 }}>
                {r.label}
                {r.when === 'application' && <span style={{ color: T.ink200 }}> · with application</span>}
              </span>
              <span style={{ fontFamily: 'CKCL', fontWeight: 500, fontSize: 13, color: T.ink600, whiteSpace: 'nowrap' }}>{formatBdt(r.amount)}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 20px', background: T.redDim }}>
            <span style={{ fontFamily: 'CKCL', fontSize: 14, fontWeight: 700, color: T.ink900 }}>Total Due</span>
            <span style={{ fontFamily: 'CKCL', fontWeight: 500, fontSize: 15, color: T.brand }}>{formatBdt(total)}</span>
          </div>
        </>
      )}
      {(banks || []).length > 0 && (
        <div style={{ padding: '12px 20px', borderTop: `1px solid ${T.ink100}` }}>
          <div style={{ fontFamily: 'CKCL', fontSize: 11, fontWeight: 600, color: T.ink400, letterSpacing: '0.04em', marginBottom: 8 }}>CLUB BANK ACCOUNTS</div>
          {(banks || []).map((b) => (
            <div key={b.id} style={{ marginBottom: 8, fontFamily: 'CKCL', fontSize: 12.5, color: T.ink600, lineHeight: 1.45 }}>
              <div style={{ fontWeight: 600, color: T.ink900 }}>{b.bank_name}{b.branch_name ? ` · ${b.branch_name}` : ''}</div>
              <div>{b.account_name}</div>
              <div>A/C {b.account_no}{b.routing_no ? ` · Routing ${b.routing_no}` : ''}</div>
              {b.notes && <div style={{ color: T.ink200 }}>{b.notes}</div>}
            </div>
          ))}
        </div>
      )}
      <div style={{ padding: '12px 20px', background: T.surface50 }}>
        <div style={{ fontFamily: 'CKCL', fontSize: 11, color: T.ink200, lineHeight: 1.5 }}>
          Payable by bank transfer after approval. Put your application number in the transfer narration. Admission Fee is refunded if declined.
        </div>
      </div>
    </div>
  )
}

function Step5({ form, update, errors }: StepProps & { errors: Partial<Record<'category' | 'agreed' | 'submit', string>> }) {
  const club = useClubNames()
  const [types, setTypes] = useState<PortalMembershipType[]>([])
  const [banks, setBanks] = useState<PortalBankAccount[]>([])
  const [registrationFee, setRegistrationFee] = useState(0)
  const [typesLoading, setTypesLoading] = useState(true)
  const [typesError, setTypesError] = useState<string | null>(null)
  const [closed, setClosed] = useState(false)

  useEffect(() => {
    let alive = true
    setTypesLoading(true)
    fetchPortalClubSettings()
      .then((s) => {
        if (!alive) return
        setClosed(s.allow_online_application === false)
        setTypes(Array.isArray(s.membership_types) ? s.membership_types : [])
        setBanks(Array.isArray(s.bank_accounts) ? s.bank_accounts : [])
        setRegistrationFee(Number(s.registration_fee) || 0)
        setTypesError(null)
      })
      .catch((e: Error) => {
        if (!alive) return
        setTypesError(e.message || 'Could not load membership categories.')
      })
      .finally(() => { if (alive) setTypesLoading(false) })
    return () => { alive = false }
  }, [])

  return (
    <Stack gap={20}>
      <SectionHead title="Category & Declaration" subtitle={`Choose your membership category and name the ${club.short ? `${club.short} ` : ''}member proposing you.`} />

      {closed && (
        <div style={{ padding: '12px 14px', borderRadius: 10, background: T.brandDim, border: `1px solid rgba(225,11,23,0.25)`, fontFamily: 'CKCL', fontSize: 13, color: T.red }}>
          Online applications are currently closed. Please contact the club office.
        </div>
      )}

      <div>
        <div style={{ fontFamily: 'CKCL', fontSize: 12, fontWeight: 600, color: errors.category ? T.red : T.ink400, letterSpacing: '0.04em', marginBottom: 12 }}>CATEGORY OF MEMBERSHIP *</div>
        {typesLoading && <div style={{ fontFamily: 'CKCL', fontSize: 13, color: T.ink400 }}>Loading categories…</div>}
        {typesError && <div style={{ fontFamily: 'CKCL', fontSize: 13, color: T.red }}>{typesError}</div>}
        {!typesLoading && !typesError && types.length === 0 && (
          <div style={{ fontFamily: 'CKCL', fontSize: 13, color: T.ink400 }}>No membership types are open for application yet.</div>
        )}
        <div role="radiogroup" aria-label="Category of membership" className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {types.map((t) => {
            const on = form.membership_type_id === t.id
            return (
              <button
                key={t.id} type="button" role="radio" aria-checked={on}
                onClick={() => update({ membership_type_id: t.id, category: t.name })}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', textAlign: 'left', borderRadius: 12, cursor: 'pointer', background: on ? T.redDim : '#FFFFFF', border: `1.5px solid ${on ? T.brand : errors.category ? 'rgba(225,11,23,0.4)' : T.ink100}`, boxShadow: on ? `0 0 0 3px ${T.brandRing}` : 'none', transition: 'all 160ms' }}
              >
                <span style={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0, border: `2px solid ${on ? T.brand : T.ink100}`, background: on ? T.brand : '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {on && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#FFFFFF' }}/>}
                </span>
                <span style={{ fontFamily: 'CKCL', fontSize: 13.5, fontWeight: on ? 600 : 500, color: T.ink900 }}>{t.name}</span>
              </button>
            )
          })}
        </div>
        {errors.category && <div style={{ fontFamily: 'CKCL', fontSize: 12, color: T.red, marginTop: 8 }}>{errors.category}</div>}
      </div>

      <div>
        <SubHead>{club.short ? `PROPOSED BY (ANY MEMBER OF ${club.short.toUpperCase()})` : 'PROPOSED BY (ANY CLUB MEMBER)'}</SubHead>
        <div style={{ height: 14 }}/>
        <Stack>
          <MemberSearch
            label="Proposing Member"
            value={form.proposer.name}
            memberId={form.proposer.memberId}
            onSelect={(name, memberNo) => update({ proposer: { name, memberId: memberNo } })}
          />
          <TextInput label="Proposer's Membership ID" value={form.proposer.memberId} onChange={(v) => update({ proposer: { ...form.proposer, memberId: v } })} placeholder="Proposer's membership ID" />
        </Stack>
      </div>

      <div>
        <div style={{ fontFamily: 'CKCL', fontSize: 12, fontWeight: 600, color: T.ink400, letterSpacing: '0.04em', marginBottom: 12 }}>SUPPORTING DOCUMENTS</div>
        <Stack gap={8}>
          <DocUpload label="NID / Passport Copy" value={form.documents.nidCopy} onChange={(v) => update({ documents: { ...form.documents, nidCopy: v } })} />
          <DocUpload label="Four Passport-Sized Photographs" value={form.documents.photos} onChange={(v) => update({ documents: { ...form.documents, photos: v } })} />
          <DocUpload label="Trade Licence / Business Registration" value={form.documents.tradeLicence} onChange={(v) => update({ documents: { ...form.documents, tradeLicence: v } })} />
        </Stack>
      </div>

      <FeePanel
        category={form.category}
        fees={types.find((t) => t.id === form.membership_type_id)?.fees}
        banks={banks}
        registrationFee={registrationFee}
      />

      <Checkbox checked={form.agreed} onChange={(v) => update({ agreed: v })} error={errors.agreed}>
        I, <strong>{form.personal.fullName || 'the applicant'}</strong>, declare that I have neither committed any illegal or criminal act under the laws of Bangladesh, nor been punished by a Bangladesh court for any offence, and that the particulars above are correct. I agree to the{' '}
        <TermsLink /> and the constitution of {club.full || 'the club'}.
      </Checkbox>
    </Stack>
  )
}

// ─── Sticky footer bar ────────────────────────────────────────────────────────
function FooterBar({ step, onBack, onNext, onPreview, submitting }: { step: number; onBack: () => void; onNext: () => void; onPreview: () => void; submitting?: boolean }) {
  const isFirst = step === 0
  const isLast = step === LAST_STEP
  const ghost: React.CSSProperties = { fontFamily: 'CKCL', fontSize: 14, fontWeight: 600, color: T.ink600, background: '#FFFFFF', border: `1px solid ${T.ink100}`, borderRadius: 999, padding: '11px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'background 160ms' }

  return (
    <div id="form-footer-bar" style={{ position: 'sticky', bottom: 0, zIndex: 30, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderTop: `1px solid ${T.ink100}`, padding: '12px 4px', marginTop: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <button onClick={onBack} disabled={isFirst} style={{ ...ghost, opacity: isFirst ? 0.45 : 1, cursor: isFirst ? 'default' : 'pointer' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          <span className="hidden sm:inline">Back</span>
        </button>

        <div className="hidden lg:flex" style={{ fontFamily: 'CKCL', fontSize: 12, color: T.ink200, alignItems: 'center', gap: 6 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.ink200} strokeWidth="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          Saved automatically
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onPreview} style={ghost}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            <span className="hidden sm:inline">Preview</span>
          </button>
          <button
            onClick={onNext}
            disabled={submitting}
            style={{ fontFamily: 'CKCL', fontSize: 14, fontWeight: 700, color: '#FFFFFF', background: submitting ? '#B70813' : T.brand, border: 'none', borderRadius: 999, padding: '11px 22px', cursor: 'pointer', transition: 'background 160ms', display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#B70813' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = T.brand }}
          >
            {submitting ? 'Submitting…' : isLast ? 'Submit application' : 'Save & continue'}
            {!submitting && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5">{isLast ? <polyline points="20 6 9 17 4 12"/> : <polyline points="9 18 15 12 9 6"/>}</svg>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Membership form section (inside the applicant dashboard) ─────────────────
function MembershipFormSection({ record, onChange, onPreview, onSubmitted }: {
  record: ApplicantRecord
  onChange: (r: ApplicantRecord) => void
  onPreview: () => void
  onSubmitted: () => void
}) {
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<'category' | 'agreed' | 'submit', string>>>({})
  const topRef = useRef<HTMLDivElement>(null)
  const { form, step } = record

  const update = (patch: Partial<ApplicationForm>) => onChange({ ...record, form: { ...form, ...patch } })
  const goTo = (s: number) => {
    onChange({ ...record, step: s })
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (record.status === 'submitted') {
    return (
      <SubmittedApplication
        record={record}
        onPreview={onPreview}
        onRecordChange={onChange}
      />
    )
  }

  const next = async () => {
    if (step < LAST_STEP) { goTo(step + 1); return }
    const errs: typeof errors = {}
    if (!form.membership_type_id) errs.category = 'Choose a membership category'
    if (!form.agreed) errs.agreed = 'You must accept the declaration to submit'
    if (!record.account.password || record.account.password.length < 8) {
      errs.submit = 'Your applicant password is missing. Log out and register/sign in again, then submit.'
    }
    setErrors(errs)
    if (Object.keys(errs).length) {
      topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }
    setSubmitting(true)
    setErrors({})
    try {
      const result = await submitPortalApplication(record.account, form)
      onChange({
        ...record,
        status: 'submitted',
        submittedAt: new Date().toISOString(),
        reference: result.application_no,
      })
      onSubmitted()
    } catch (e) {
      const msg = e instanceof ApiError
        ? (Object.values(e.errors || {}).flat()[0] || e.message)
        : (e instanceof Error ? e.message : 'Could not submit application.')
      setErrors({ submit: msg })
      topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } finally {
      setSubmitting(false)
    }
  }

  const stepProps = { form, update }
  return (
    <div ref={topRef} style={{ scrollMarginTop: 96 }}>
      <StepProgress step={step} onStep={goTo}/>
      <div style={{ maxWidth: 760, paddingTop: 'clamp(24px,3vw,36px)' }}>
        {errors.submit && (
          <div style={{ marginBottom: 16, padding: '12px 14px', borderRadius: 10, background: T.brandDim, border: `1px solid rgba(225,11,23,0.25)`, fontFamily: 'CKCL', fontSize: 13, color: T.red }}>
            {errors.submit}
          </div>
        )}
        {step === 0 && <Step1 {...stepProps}/>}
        {step === 1 && <Step2 {...stepProps}/>}
        {step === 2 && <Step3 {...stepProps}/>}
        {step === 3 && <Step4 {...stepProps}/>}
        {step === 4 && <Step5 {...stepProps} errors={errors}/>}
      </div>
      <FooterBar step={step} onBack={() => goTo(Math.max(0, step - 1))} onNext={() => { void next() }} onPreview={onPreview} submitting={submitting}/>
    </div>
  )
}

function humanizeAppStatus(status: string | null | undefined) {
  const s = String(status || 'pending').toLowerCase()
  if (s === 'under_review') return 'Under review'
  if (s === 'approved') return 'Approved'
  if (s === 'rejected') return 'Rejected'
  if (s === 'pending') return 'Pending review'
  return s.replace(/_/g, ' ')
}

function SubmittedApplication({
  record,
  onPreview,
  onRecordChange,
}: {
  record: ApplicantRecord
  onPreview: () => void
  onRecordChange?: (r: ApplicantRecord) => void
}) {
  const [liveStatus, setLiveStatus] = useState<string | null>(record.serverStatus || null)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)

  const refresh = async () => {
    if (!record.reference) return
    setChecking(true)
    setStatusError(null)
    try {
      const phone = record.form.personal.phone || record.account.mobile
      const res = await fetchApplicationStatus(record.reference, phone)
      setLiveStatus(res.status)
      onRecordChange?.({
        ...record,
        serverStatus: res.status,
        memberNo: res.member_no ?? null,
        rejectedReason: res.rejected_reason ?? null,
        canSignIn: Boolean(res.can_sign_in),
      })
    } catch (e) {
      setStatusError(e instanceof Error ? e.message : 'Could not refresh status.')
    } finally {
      setChecking(false)
    }
  }

  useEffect(() => { void refresh() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const status = (liveStatus || record.serverStatus || 'pending').toLowerCase()
  const approved = status === 'approved'
  const rejected = status === 'rejected'

  return (
    <div style={{ background: '#FFFFFF', border: `1px solid ${T.ink100}`, borderRadius: 20, padding: 'clamp(28px,4vw,48px)', textAlign: 'center', maxWidth: 560, margin: '0 auto 48px' }}>
      <div style={{ width: 64, height: 64, borderRadius: '50%', background: rejected ? T.brandDim : T.greenDim, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
        {rejected
          ? <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={T.red} strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          : <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={T.green} strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>}
      </div>
      <div style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 24, color: T.ink900, marginBottom: 6 }}>
        {approved ? 'Membership approved.' : rejected ? 'Application not approved.' : 'Application submitted.'}
      </div>
      <p style={{ fontFamily: 'CKCL', fontSize: 14.5, color: T.ink400, lineHeight: 1.65, margin: '0 0 20px' }}>
        {approved
          ? (record.canSignIn || record.memberNo
            ? `You can sign in to the member portal${record.memberNo ? ` as ${record.memberNo}` : ''}.`
            : 'The club office will help you access the member portal.')
          : rejected
            ? (record.rejectedReason || 'Please contact the club office for details.')
            : 'Your membership form is with the Executive Committee and can no longer be edited. Print the preview, sign it, and bring it to the club office with four passport-sized photos.'}
      </p>
      <div style={{ background: T.surface50, border: `1px solid ${T.ink100}`, borderRadius: 12, padding: '14px 18px', marginBottom: 12 }}>
        <div style={{ fontFamily: 'CKCL', fontSize: 11, color: T.ink200, letterSpacing: '0.04em', marginBottom: 4 }}>APPLICATION REFERENCE</div>
        <div style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 20, color: T.brand, letterSpacing: '0.1em' }}>{record.reference}</div>
        <div style={{ fontFamily: 'CKCL', fontSize: 13, color: T.ink400, marginTop: 10 }}>
          Status: <strong style={{ color: T.ink900 }}>{humanizeAppStatus(liveStatus || record.serverStatus)}</strong>
        </div>
        {statusError && <div style={{ fontFamily: 'CKCL', fontSize: 12, color: T.red, marginTop: 6 }}>{statusError}</div>}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
        <button type="button" onClick={() => { void refresh() }} disabled={checking} style={{ height: 46, padding: '0 22px', borderRadius: 999, border: `1px solid ${T.ink100}`, background: '#FFFFFF', fontFamily: 'CKCL', fontSize: 14, fontWeight: 600, color: T.ink600, cursor: 'pointer' }}>
          {checking ? 'Checking…' : 'Refresh status'}
        </button>
        {approved ? (
          <a href={pathForPage('member-login')} style={{ height: 46, padding: '0 26px', borderRadius: 999, border: 'none', background: T.brand, fontFamily: 'CKCL', fontSize: 14, fontWeight: 700, color: '#FFFFFF', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
            Open member portal
          </a>
        ) : (
          <button type="button" onClick={onPreview} style={{ height: 46, padding: '0 26px', borderRadius: 999, border: 'none', background: T.brand, fontFamily: 'CKCL', fontSize: 14, fontWeight: 700, color: '#FFFFFF', cursor: 'pointer' }}>
            Preview membership form
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Registration (logged out) ────────────────────────────────────────────────
const MOBILE_RE = /^(\+?880)?01[3-9]\d{8}$/

function RegisterCard({ onRegistered, onLogin }: { onRegistered: (r: ApplicantRecord) => void; onLogin: () => void }) {
  const [acc, setAcc] = useState<ApplicantAccount>({ givenName: '', surname: '', email: '', mobile: '', password: '' })
  const [confirm, setConfirm] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [apiError, setApiError] = useState('')
  const set = (patch: Partial<ApplicantAccount>) => setAcc((a) => ({ ...a, ...patch }))

  const taken = EMAIL_RE.test(acc.email) && !!findRecord(acc.email)
  const errs = {
    givenName: !acc.givenName.trim() ? 'Enter your given name' : '',
    surname: !acc.surname.trim() ? 'Enter your surname' : '',
    email: !EMAIL_RE.test(acc.email) ? 'Enter a valid email address' : taken ? 'This email is already registered — log in instead' : '',
    mobile: !MOBILE_RE.test(acc.mobile.replace(/[\s-]/g, '')) ? 'Enter a mobile number like 01XXXXXXXXX' : '',
    password: acc.password.length < 8 ? 'Use at least 8 characters' : '',
    confirm: confirm !== acc.password || !confirm ? 'Passwords do not match' : '',
    agreed: !agreed ? 'You must agree to the Terms & Conditions' : '',
  }
  const show = (k: keyof typeof errs) => (tried || (k === 'email' && taken) ? errs[k] || undefined : undefined)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTried(true)
    setApiError('')
    if (Object.values(errs).some(Boolean)) return
    setBusy(true)
    try {
      const mobile = acc.mobile.replace(/[\s-]/g, '')
      const email = acc.email.trim().toLowerCase()
      const avail = await checkApplicantAvailability({ email, phone: mobile })
      if (!avail.available) {
        setApiError(`An application is already under review${avail.application_no ? ` (${avail.application_no})` : ''}. Contact the club office.`)
        return
      }
      const account = { ...acc, email, mobile }
      onRegistered({ account, form: emptyForm(account), step: 0, status: 'draft' })
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Could not verify availability. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate style={{ background: '#FFFFFF', border: `1px solid rgba(185,139,67,0.28)`, borderRadius: 24, padding: 'clamp(22px,3.5vw,40px)', boxShadow: '0 16px 48px -16px rgba(14,17,22,0.14)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -120, right: -120, width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(225,11,23,0.08) 0%, transparent 70%)', pointerEvents: 'none' }}/>
      <div style={{ position: 'relative' }}>
        <div className="eyebrow" style={{ fontSize: 11, color: T.brass, marginBottom: 8 }}>MEMBER REGISTRATION</div>
        <h2 style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 'clamp(22px,2.4vw,28px)', color: T.ink900, margin: '0 0 6px', letterSpacing: '-0.01em' }}>Want to be a member of the club?</h2>
        <p style={{ fontFamily: 'CKCL', fontSize: 14, color: T.ink400, margin: '0 0 24px', lineHeight: 1.6 }}>Create an account to fill in, preview and submit your membership form.</p>

        <Stack gap={14}>
          <Row>
            <TextInput label="Given Name" value={acc.givenName} onChange={(v) => set({ givenName: v })} required autoComplete="given-name" error={show('givenName')}/>
            <TextInput label="Surname" value={acc.surname} onChange={(v) => set({ surname: v })} required autoComplete="family-name" error={show('surname')}/>
          </Row>
          <Row>
            <TextInput label="Email Address" value={acc.email} onChange={(v) => set({ email: v })} type="email" required autoComplete="email" error={show('email')}/>
            <TextInput label="Mobile Number" value={acc.mobile} onChange={(v) => set({ mobile: v })} type="tel" required autoComplete="tel" placeholder="01XXXXXXXXX" error={show('mobile')}/>
          </Row>
          <Row>
            <PasswordInput label="Password" value={acc.password} onChange={(v) => set({ password: v })} required autoComplete="new-password" error={show('password')}/>
            <PasswordInput label="Confirm Password" value={confirm} onChange={setConfirm} required autoComplete="new-password" error={show('confirm')}/>
          </Row>
          <div style={{ marginTop: 4 }}>
            <Checkbox checked={agreed} onChange={setAgreed} error={show('agreed')}>
              I agree to the <TermsLink />
            </Checkbox>
          </div>
        </Stack>

        {apiError && (
          <div role="alert" style={{ marginTop: 16, padding: '12px 14px', borderRadius: 10, background: T.brandDim, border: `1px solid rgba(225,11,23,0.25)`, fontFamily: 'CKCL', fontSize: 13, color: T.red }}>
            {apiError}
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-4" style={{ marginTop: 26 }}>
          <div style={{ fontFamily: 'CKCL', fontSize: 14, color: T.ink400 }}>
            Already registered?{' '}
            <button type="button" onClick={onLogin} style={{ fontFamily: 'CKCL', fontSize: 14, fontWeight: 700, color: T.brand, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>Log in</button>
          </div>
          <button type="submit" disabled={busy} style={{ height: 48, padding: '0 30px', borderRadius: 999, border: 'none', background: busy ? '#B70813' : T.brand, fontFamily: 'CKCL', fontSize: 15, fontWeight: 700, color: '#FFFFFF', cursor: busy ? 'default' : 'pointer' }}>
            {busy ? 'Checking…' : 'Submit'}
          </button>
        </div>
      </div>
    </form>
  )
}

function LoginModal({ onClose, onLoggedIn }: { onClose: () => void; onLoggedIn: (r: ApplicantRecord) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) { setError('Enter your email and password.'); return }
    setBusy(true)
    window.setTimeout(() => {
      setBusy(false)
      const record = findRecord(email)
      if (!record || record.account.password !== password) { setError('Incorrect email or password.'); return }
      onLoggedIn(record)
    }, 800)
  }

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(14,17,22,0.55)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <form
        onSubmit={submit} noValidate role="dialog" aria-modal="true" aria-labelledby="applicant-login-title"
        onClick={(e) => e.stopPropagation()}
        style={{ position: 'relative', width: '100%', maxWidth: 420, background: '#FFFFFF', borderRadius: 22, padding: 'clamp(24px,4vw,34px)', boxShadow: '0 24px 64px rgba(14,17,22,0.22)' }}
      >
        <button type="button" onClick={onClose} aria-label="Close" style={{ position: 'absolute', top: 14, right: 14, width: 34, height: 34, borderRadius: '50%', border: `1px solid ${T.ink100}`, background: '#FFFFFF', color: T.ink400, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <div className="eyebrow" style={{ fontSize: 11, color: T.brass, marginBottom: 8 }}>APPLICANT LOGIN</div>
        <h2 id="applicant-login-title" style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 24, color: T.ink900, margin: '0 0 6px' }}>Welcome back.</h2>
        <p style={{ fontFamily: 'CKCL', fontSize: 14, color: T.ink400, margin: '0 0 22px', lineHeight: 1.55 }}>Log in to continue your membership application.</p>

        <Stack gap={14}>
          <TextInput label="Email Address" value={email} onChange={(v) => { setEmail(v); setError('') }} type="email" required autoComplete="email"/>
          <PasswordInput label="Password" value={password} onChange={(v) => { setPassword(v); setError('') }} required autoComplete="current-password"/>
        </Stack>
        {error && <div role="alert" style={{ fontFamily: 'CKCL', fontSize: 13, color: T.red, marginTop: 12 }}>{error}</div>}

        <button type="submit" disabled={busy} style={{ width: '100%', height: 48, marginTop: 20, borderRadius: 999, border: 'none', background: busy ? '#B70813' : T.brand, fontFamily: 'CKCL', fontSize: 15, fontWeight: 700, color: '#FFFFFF', cursor: busy ? 'default' : 'pointer' }}>
          {busy ? 'Logging in…' : 'Log in'}
        </button>
      </form>
    </div>,
    document.body,
  )
}

const HOW_IT_WORKS = [
  { title: 'Register', body: 'Create an account with your email and mobile number.' },
  { title: 'Fill in the membership form', body: 'Five short steps. Your answers save as you go.' },
  { title: 'Preview & submit', body: 'Check the printable form, then submit it for review.' },
  { title: 'Committee review', body: 'The Executive Committee reviews applications at its monthly sitting.' },
]

function RegisterSection({ onAuthed }: { onAuthed: (r: ApplicantRecord) => void }) {
  const club = useClubNames()
  const [loginOpen, setLoginOpen] = useState(false)
  return (
    <div style={{ maxWidth: SITE_W, margin: '0 auto', padding: 'clamp(32px,5vw,64px) clamp(24px,5vw,80px)' }}>
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] gap-10 lg:gap-14 items-start">
        <div>
          <div className="eyebrow" style={{ fontSize: 11, color: T.brass, marginBottom: 10 }}>HOW IT WORKS</div>
          <h2 style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 'clamp(22px,2.4vw,30px)', color: T.ink900, margin: '0 0 24px', letterSpacing: '-0.01em', lineHeight: 1.2 }}>Four steps to joining {club.short || 'the club'}.</h2>
          <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 18 }}>
            {HOW_IT_WORKS.map((s, i) => (
              <li key={s.title} style={{ display: 'flex', gap: 14 }}>
                <span style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: i === 0 ? T.brand : '#FFFFFF', border: `1.5px solid ${i === 0 ? T.brand : T.ink100}`, color: i === 0 ? '#FFFFFF' : T.ink400, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'CKCL', fontSize: 13, fontWeight: 700 }}>{i + 1}</span>
                <div>
                  <div style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: 15, color: T.ink900 }}>{s.title}</div>
                  <div style={{ fontFamily: 'CKCL', fontSize: 13.5, color: T.ink400, marginTop: 2, lineHeight: 1.55 }}>{s.body}</div>
                </div>
              </li>
            ))}
          </ol>
        </div>
        {/* Phones: the form comes first; the steps follow below it */}
        <div className="order-first lg:order-none">
          <RegisterCard onRegistered={onAuthed} onLogin={() => setLoginOpen(true)}/>
        </div>
      </div>
      {loginOpen && <LoginModal onClose={() => setLoginOpen(false)} onLoggedIn={(r) => { setLoginOpen(false); onAuthed(r) }}/>}
    </div>
  )
}

// ─── Page header ──────────────────────────────────────────────────────────────
function PageHeader({ compact }: { compact?: boolean }) {
  return (
    <div
      style={{
        minHeight: compact ? 'clamp(170px, 18vw, 220px)' : 'clamp(200px, 28vw, 320px)',
        paddingTop: 108, // clears the floating navbar (20px offset + 72px bar) on phones
        background: '#EEF1F5',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        // Align with the site content column, like the Media & Resources headers
        paddingInline: SITE_HEADER_PAD_INLINE,
        paddingBottom: compact ? 28 : 40,
      }}
    >
      <div style={{ position: 'absolute', top: '-15%', right: '5%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle,rgba(225,11,23,0.10) 0%,transparent 65%)', filter: 'blur(40px)', pointerEvents: 'none' }} />
      <div className="flex items-center gap-1.5 mb-3" style={{ position: 'relative', zIndex: 1 }}>
        {['Home', 'Membership', 'Become a Member'].map((c, i, arr) => (
          <span key={i} className="flex items-center gap-1.5">
            <span className="eyebrow" style={{ fontSize: 11, color: i < arr.length - 1 ? '#5C6673' : '#0E1116' }}>{c}</span>
            {i < arr.length - 1 && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#A8B0BB" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>}
          </span>
        ))}
      </div>
      {!compact && <div className="eyebrow" style={{ fontSize: 11, color: T.brass, position: 'relative', zIndex: 1, marginBottom: 8 }}>MEMBERSHIP APPLICATION</div>}
      <h1 style={{ fontFamily: 'CKCL', fontWeight: 600, fontSize: compact ? 'clamp(24px,3vw,36px)' : 'clamp(28px,4vw,46px)', lineHeight: 1.05, letterSpacing: '-0.02em', color: '#0E1116', margin: 0, position: 'relative', zIndex: 1 }}>
        Apply for membership.
      </h1>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function BecomeaMemberPage(_props: { onHome: () => void }) {
  const [record, setRecord] = useState<ApplicantRecord | null>(() => {
    const email = getSession()
    return email ? findRecord(email) ?? null : null
  })
  const [section, setSection] = useState<ApplicantSection>('dashboard')
  const [previewing, setPreviewing] = useState(false)

  // Every change is persisted, so the form survives reloads and logouts
  const change = (r: ApplicantRecord) => { setRecord(r); saveRecord(r) }

  const authed = (r: ApplicantRecord) => {
    saveRecord(r)
    setSession(r.account.email)
    setRecord(r)
    setSection('dashboard')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const goSection = (s: ApplicantSection) => { setSection(s); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  if (!record) {
    return (
      <div style={{ background: '#F7F8FA', minHeight: '100vh' }}>
        <PageHeader />
        <RegisterSection onAuthed={authed}/>
      </div>
    )
  }

  return (
    <div style={{ background: '#F7F8FA', minHeight: '100vh', paddingBottom: section === 'form' ? 0 : 64 }}>
      <PageHeader compact />
      <ApplicantDashboard
        record={record}
        section={section}
        onSection={goSection}
        onPreview={() => setPreviewing(true)}
        onLogout={() => { setSession(null); setRecord(null); setSection('dashboard'); window.scrollTo({ top: 0 }) }}
        onChangePassword={(password) => change({ ...record, account: { ...record.account, password } })}
        onRecordChange={change}
        formSlot={<MembershipFormSection record={record} onChange={change} onPreview={() => setPreviewing(true)} onSubmitted={() => window.scrollTo({ top: 0, behavior: 'smooth' })}/>}
      />
      {previewing && <MembershipFormPdf record={record} onClose={() => setPreviewing(false)}/>}
    </div>
  )
}
