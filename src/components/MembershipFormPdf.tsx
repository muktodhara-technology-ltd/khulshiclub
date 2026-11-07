import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { type Address, type ApplicantRecord } from '../data/application'
import { usePortalClubSettings } from '../lib/apply'
import { useSiteInfo } from '../lib/siteInfo'
import ClubLogo from './ClubLogo'

// ─── Membership form as a printable A4 document ───────────────────────────────
// Mirrors the club's paper form. Print / Save as PDF uses the browser's print
// dialog; the print stylesheet below hides everything except the pages.

const PAGE_W = 794   // A4 at 96 dpi
const PAGE_H = 1123
const PAD_X = 56
const INK = '#111111'
// Club palette in place of the reference form's navy / sky blue
const BAND = '#1C2330'     // title banner + section bars
const ACCENT = '#E10B17'   // section tabs, banner slash
const FILL = '#EEF1F5'     // answer boxes
const LABEL = '#3A424D'
// ckcl_regular.woff / ckcl_semibold.woff via the CKCL @font-face in index.css (bold → semibold)
const FONT = 'CKCL, sans-serif'

const fmtDate = (iso: string) => {
  if (!iso) return ''
  const d = new Date(iso)
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const joinAddress = (a: Address) => [a.address, a.policeStation, a.postOffice, a.district, a.postalCode, a.country].filter(Boolean).join(', ')

// Label : filled answer box
function Line({ label, value, labelW = 168, grow = 1, children }: { label: string; value?: string; labelW?: number; grow?: number; children?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: `${grow} 1 0` }}>
      <span style={{ width: labelW, flexShrink: 0, color: LABEL, fontSize: 12.5, lineHeight: 1.2 }}>{label}</span>
      <span style={{ flexShrink: 0, color: LABEL }}>:</span>
      <span style={{ flex: 1, minWidth: 0, minHeight: 26, display: 'flex', alignItems: 'center', gap: 14, background: FILL, borderRadius: 2, padding: '3px 9px', fontWeight: 700, fontSize: 13, lineHeight: 1.3, overflowWrap: 'anywhere' }}>
        {children ?? value ?? ''}
      </span>
    </div>
  )
}

function Pair({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', gap: 22 }}>{children}</div>
}

// Dark bar with an accent tab and spaced capitals
function Heading({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'stretch', height: 32, marginTop: 10, background: BAND }}>
      <span style={{ width: 9, background: ACCENT, flexShrink: 0 }}/>
      <span style={{ display: 'flex', alignItems: 'center', padding: '0 14px', color: '#FFFFFF', fontSize: 13, fontWeight: 700, letterSpacing: '0.22em', whiteSpace: 'nowrap' }}>{children}</span>
    </div>
  )
}

// Square tick box on white, sits inside an answer box
function Tick({ on, label }: { on: boolean; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, flex: 1, justifyContent: 'space-between' }}>
      <span style={{ lineHeight: 1.25 }}>{label}</span>
      <span style={{ flexShrink: 0, width: 16, height: 16, background: '#FFFFFF', border: `1px solid ${on ? BAND : '#C9CFD8'}`, borderRadius: 2, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, lineHeight: 1 }}>{on ? '✓' : ''}</span>
    </span>
  )
}

function AddressBlock({ a }: { a: Address }) {
  return (
    <>
      <Line label="Address" value={a.address}/>
      <Pair><Line label="Police Station" value={a.policeStation}/><Line label="Post Office" value={a.postOffice} labelW={92}/></Pair>
      {/* Shares sized so each value gets ~90px after its label */}
      <Pair><Line label="Postal Code" value={a.postalCode} grow={1.6}/><Line label="District" value={a.district} labelW={58}/><Line label="Country" value={a.country} labelW={58} grow={1.25}/></Pair>
    </>
  )
}

function Table({ head, rows, widths }: { head: string[]; rows: string[][]; widths: string }) {
  const cell: React.CSSProperties = { padding: '8px 6px', textAlign: 'center', overflowWrap: 'anywhere', fontSize: 13 }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: widths, gap: 2 }}>
      {head.map((h) => <div key={h} style={{ ...cell, background: BAND, color: '#FFFFFF', fontWeight: 700, fontSize: 11.5, letterSpacing: '0.04em' }}>{h}</div>)}
      {rows.flatMap((r, i) => r.map((c, j) => <div key={`${i}-${j}`} style={{ ...cell, background: FILL, fontWeight: 700, minHeight: 34, color: c ? INK : '#A8B0BB' }}>{c || 'N/A'}</div>))}
    </div>
  )
}

// Full-bleed title banner: dark band, slanted accent block on the right
function Banner({ title }: { title: string }) {
  return (
    <div style={{ position: 'relative', height: 76, background: BAND, overflow: 'hidden', display: 'flex', alignItems: 'center', paddingLeft: PAD_X }}>
      <div style={{ position: 'absolute', top: 0, bottom: 0, right: -40, width: 230, background: ACCENT, transform: 'skewX(-14deg)' }}/>
      <div style={{ position: 'absolute', top: 0, bottom: 0, right: 196, width: 10, background: '#FFFFFF', opacity: 0.9, transform: 'skewX(-14deg)' }}/>
      <div style={{ position: 'relative', color: '#FFFFFF', fontWeight: 700, fontSize: 32, letterSpacing: '0.03em' }}>{title}</div>
    </div>
  )
}

function Page({ n, total, header, children }: { n: number; total: number; header?: React.ReactNode; children: React.ReactNode }) {
  const site = useSiteInfo()
  return (
    <div className="pdf-page" style={{ width: PAGE_W, background: '#FFFFFF', color: INK, fontFamily: FONT, fontSize: 14, lineHeight: 1.45, height: PAGE_H, overflow: 'hidden', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 32px rgba(0,0,0,0.35)' }}>
      {/* Thin accent rule across the top of every page */}
      <div style={{ height: 6, background: `linear-gradient(90deg, ${BAND} 0 70%, ${ACCENT} 70% 100%)`, flexShrink: 0 }}/>
      {header}
      {/* Grid, not flex: the answer boxes must not stretch to fill the page height */}
      <div style={{ flex: 1, display: 'grid', alignContent: 'start', gap: 10, padding: `${header ? 20 : 36}px ${PAD_X}px 0` }}>{children}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10, color: '#777', margin: `20px ${PAD_X}px 0`, padding: '10px 0 22px', borderTop: `1px solid ${FILL}` }}>
        <span>{site.club_name ? `${site.club_name} · ` : ''}Membership Form</span>
        <span>Page {n} of {total}</span>
      </div>
    </div>
  )
}

function FormPages({ record }: { record: ApplicantRecord }) {
  const f = record.form
  const p = f.personal
  const permanent = f.sameAsPresent ? f.present : f.permanent
  const pad = <T,>(list: T[], empty: T) => [...list, ...Array(Math.max(0, 5 - list.length)).fill(empty)].slice(0, 5) as T[]
  const children = pad(f.children, { name: '', sex: '', dob: '', occupation: '' })
  const clubs = pad(f.otherClubs, { name: '', type: '', year: '' })
  const dated = fmtDate(record.submittedAt || new Date().toISOString())
  const total = 4
  // Header contact + address come from Website Maintenance → Site info.
  const site = useSiteInfo()
  const contactLine = [site.contact.phone, site.contact.phone_alt].filter(Boolean).join(', ')
  // Category list = the club's active membership types (club/club-portal/settings).
  const { data: settings } = usePortalClubSettings()
  const categories = (settings?.membership_types || []).map((t) => ({ id: t.id, name: t.name }))
  if (categories.length === 0 && f.category) categories.push({ id: f.membership_type_id, name: f.category })
  const blank = (minWidth: number) => <span style={{ display: 'inline-block', minWidth, height: 22, verticalAlign: 'bottom', background: FILL, borderRadius: 2 }}>&nbsp;</span>
  const sign = (label: string) => (
    <div style={{ flex: 1, paddingTop: 44 }}>
      <div style={{ borderTop: `1.5px solid ${BAND}`, paddingTop: 6, fontWeight: 700, fontSize: 12.5 }}>{label}</div>
    </div>
  )

  return (
    <>
      {/* Page 1 — header + personal + present address */}
      <Page
        n={1} total={total}
        header={<>
          <div style={{ padding: `18px ${PAD_X}px 16px` }}>
            <ClubLogo height={58} />
          </div>
          <Banner title="MEMBERSHIP FORM"/>
        </>}
      >
        <div style={{ display: 'flex', gap: 24, alignItems: 'stretch' }}>
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '92px 1fr', alignContent: 'center', gap: '8px 10px', fontSize: 12.5, lineHeight: 1.45 }}>
            {site.govt_reg_no && <><span style={{ color: LABEL }}>Govt. Reg No</span><span style={{ fontWeight: 700 }}>{site.govt_reg_no}</span></>}
            {site.address.full && <><span style={{ color: LABEL }}>Address</span><span style={{ fontWeight: 700 }}>{site.address.full}</span></>}
            {contactLine && <><span style={{ color: LABEL }}>Contact</span><span style={{ fontWeight: 700 }}>{contactLine}</span></>}
          </div>
          {/* Photo box */}
          <div style={{ width: 112, height: 140, background: FILL, border: `1px dashed #A8B0BB`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: 11, color: '#5C6673', padding: p.photo ? 0 : 8, boxSizing: 'border-box', overflow: 'hidden' }}>
            {p.photo ? <img src={p.photo} alt="Applicant" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/> : '4 Copies of Passport Size Photo'}
          </div>
        </div>

        <Heading>PERSONAL INFORMATION</Heading>
        <Line label="Full Name" value={p.fullName}/>
        <Line label="Father's Name" value={p.fatherName}/>
        <Line label="Mother's Name" value={p.motherName}/>
        <Pair>
          <Line label="Marital Status" grow={1}>
            <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, padding: '2px 0' }}>
              <Tick on={p.maritalStatus === 'Single'} label="Single"/>
              <Tick on={p.maritalStatus === 'Married'} label="Married"/>
            </span>
          </Line>
          <Line label="Anniversary" value={fmtDate(p.anniversary)} labelW={92}/>
        </Pair>
        <Pair><Line label="Spouse Name" value={p.spouseName}/><Line label="Profession" value={f.professional.profession} labelW={92}/></Pair>
        <Pair><Line label="Date of Birth" value={fmtDate(p.dob)}/><Line label="Place" value={p.birthPlace} labelW={92}/></Pair>
        <Pair><Line label="Tel" value={p.tel}/><Line label="Phone" value={p.phone} labelW={92}/></Pair>
        <Line label="Email" value={p.email}/>
        <Pair><Line label="Nationality" value={p.nationality}/><Line label="Blood Group" value={p.bloodGroup} labelW={92}/></Pair>
        <Pair><Line label="NID No" value={p.nidNo}/><Line label="Passport No" value={p.passportNo} labelW={92}/></Pair>
        <Pair><Line label="Educational Qualification" value={p.education}/><Line label="E-TIN No" value={p.etin} labelW={92}/></Pair>
        <Line label="Institution Name" value={p.institution}/>

        <Heading>PRESENT ADDRESS</Heading>
        <AddressBlock a={f.present}/>
      </Page>

      {/* Page 2 — permanent address, children, nominee */}
      <Page n={2} total={total}>
        <Heading>PERMANENT ADDRESS</Heading>
        <AddressBlock a={permanent}/>

        <Heading>DETAILS OF CHILDREN</Heading>
        <Table
          head={['Serial', 'Name', 'Sex', 'Date of Birth', 'Occupation with Address']}
          widths="64px 1.6fr 54px 1fr 2fr"
          rows={children.map((c, i) => [String(i + 1), c.name, c.sex, fmtDate(c.dob), c.occupation])}
        />

        <Heading>NOMINEE INFORMATION</Heading>
        <div style={{ display: 'flex', gap: 22 }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
            <Line label="Name" value={f.nominee.name} labelW={120}/>
            <Line label="Relation" value={f.nominee.relation} labelW={120}/>
            <Line label="Date of Birth" value={fmtDate(f.nominee.dob)} labelW={120}/>
            <Line label="Email" value={f.nominee.email} labelW={120}/>
          </div>
          <div style={{ width: 100, height: 128, background: FILL, border: `1px dashed #A8B0BB`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#5C6673', textAlign: 'center', overflow: 'hidden' }}>
            {f.nominee.photo ? <img src={f.nominee.photo} alt="Nominee" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/> : 'Nominee Photo'}
          </div>
        </div>
        <Pair><Line label="NID No" value={f.nominee.nidNo} labelW={120}/><Line label="Passport No" value={f.nominee.passportNo} labelW={92}/></Pair>
        <Pair><Line label="Occupation" value={f.nominee.occupation} labelW={120}/><Line label="Phone" value={f.nominee.phone} labelW={92}/></Pair>
      </Page>

      {/* Page 3 — profession, category, other clubs, proposer */}
      <Page n={3} total={total}>
        <Heading>PROFESSION INFORMATION</Heading>
        <Pair><Line label="Profession" value={f.professional.profession}/><Line label="Designation" value={f.professional.designation} labelW={92}/></Pair>
        <Line label="Company" value={f.professional.company}/>
        <AddressBlock a={f.professional.address}/>

        <Heading>CATEGORY OF MEMBERSHIP</Heading>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {categories.map((c) => (
            <div key={c.id || c.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, background: FILL, borderRadius: 2, padding: '6px 10px', fontWeight: 700, fontSize: 12.5 }}>
              <Tick on={f.membership_type_id ? f.membership_type_id === c.id : f.category === c.name} label={c.name}/>
            </div>
          ))}
        </div>

        <Heading>OTHER CLUB MEMBERSHIP (IF ANY)</Heading>
        <Table
          head={['Serial', 'Name', 'Membership Type', 'Year']}
          widths="72px 1fr 1.6fr 96px"
          rows={clubs.map((c, i) => [String(i + 1), c.name, c.type, c.year])}
        />

        <Heading>{(site.short_name || site.club_name) ? `PROPOSED BY (ANY MEMBER OF ${(site.short_name || site.club_name).toUpperCase()})` : 'PROPOSED BY (ANY CLUB MEMBER)'}</Heading>
        <Line label="Name" value={f.proposer.name}/>
        <Pair><Line label="Membership ID" value={f.proposer.memberId}/><Line label="Signature" value="" labelW={92}/></Pair>
      </Page>

      {/* Page 4 — declaration, official use */}
      <Page n={4} total={total}>
        <Heading>DECLARATION</Heading>
        <div style={{ textAlign: 'justify', lineHeight: 1.8, fontSize: 13.5, marginTop: 4 }}>
          I, <span style={{ display: 'inline-block', minWidth: 200, background: FILL, borderRadius: 2, padding: '0 8px', fontWeight: 700 }}>{p.fullName || ' '}</span> hereby declare that I Have Neither Committed any illegal / Criminal act Judiciary Law of Bangladesh, nor been awarded any punishment by Bangladesh Court for any Offence. I further declare that the above statement / particulars are correct therefore, request you to become a Donor, Life, Service, Permanent, Temporary, Corporate, Honorary, Diplomat and Foreign National Member as per constitution of the <span style={{ color: ACCENT, fontWeight: 700 }}>CHITTAGONG KHULSHI CLUB LIMITED</span>
        </div>

        <Pair><Line label="Date" value={dated} labelW={40}/><Line label="Applicant Signature" value="" labelW={130}/></Pair>
        <Line label="Identified by President / Vice President" value="" labelW={262}/>
        <Line label="Membership No" value="" labelW={262}/>

        <Heading>FOR OFFICIAL USE ONLY</Heading>
        <Line label="Mr./Mrs." value={p.fullName} labelW={70}/>
        <Line label="Address" value={joinAddress(f.present)} labelW={70}/>
        <div style={{ lineHeight: 2.1, fontSize: 13.5, marginTop: 4 }}>
          The constitution of club does hereby declare you as the {blank(200)} of <span style={{ color: ACCENT, fontWeight: 700 }}>CHITTAGONG KHULSHI CLUB LIMITED</span> and your Membership No. is {blank(200)}
          <div style={{ marginTop: 6 }}>Thank you</div>
        </div>
        <div style={{ display: 'flex', gap: 80 }}>
          {sign(site.club_name ? `President, ${site.club_name}` : 'President')}
          {sign(site.club_name ? `Vice President, ${site.club_name}` : 'Vice President')}
        </div>
        <div style={{ fontWeight: 700, fontSize: 12.5, color: LABEL, marginTop: 16 }}>Remarks</div>
        <div style={{ height: 120, background: FILL, borderRadius: 2 }}/>
      </Page>
    </>
  )
}

export default function MembershipFormPdf({ record, onClose }: { record: ApplicantRecord; onClose: () => void }) {
  // Fit the A4 page to the viewport width on phones; zoom steps on top of that
  const fit = () => Math.min(1, (window.innerWidth - 32) / PAGE_W)
  const [zoom, setZoom] = useState(fit)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [onClose])

  const site = useSiteInfo()
  const filePrefix = (site.short_name || site.club_name || '').trim().replace(/\s+/g, '-')
  const fileName = `${filePrefix ? `${filePrefix}-` : ''}Membership-Form-${record.form.personal.fullName.replace(/\s+/g, '-') || 'Applicant'}.pdf`
  const btn: React.CSSProperties = { height: 34, minWidth: 34, padding: '0 12px', borderRadius: 999, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', color: '#FFFFFF', fontFamily: 'CKCL', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }

  return createPortal(
    <div id="ckcl-form-pdf" role="dialog" aria-modal="true" aria-label="Membership form preview" style={{ position: 'fixed', inset: 0, zIndex: 1000, background: '#1F2228', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          #ckcl-form-pdf, #ckcl-form-pdf * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          html, body { background: #FFFFFF !important; }
          body > *:not(#ckcl-form-pdf) { display: none !important; }
          #ckcl-form-pdf { position: static !important; background: none !important; display: block !important; }
          #ckcl-form-pdf .pdf-toolbar { display: none !important; }
          #ckcl-form-pdf .pdf-scroll { overflow: visible !important; padding: 0 !important; display: block !important; }
          #ckcl-form-pdf .pdf-zoom { zoom: 1 !important; gap: 0 !important; }
          #ckcl-form-pdf .pdf-page { box-shadow: none !important; break-after: page; }
        }
      `}</style>

      {/* Toolbar */}
      <div className="pdf-toolbar" style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '10px clamp(12px,2vw,20px)', background: '#14161A', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F2333D" strokeWidth="1.8" style={{ flexShrink: 0 }}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'CKCL', fontSize: 13.5, fontWeight: 600, color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fileName}</div>
          <div style={{ fontFamily: 'CKCL', fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>4 pages · A4</div>
        </div>
        <div className="hidden sm:flex items-center gap-1.5">
          <button style={btn} aria-label="Zoom out" onClick={() => setZoom((z) => Math.max(0.4, +(z - 0.1).toFixed(2)))}>−</button>
          <span style={{ fontFamily: 'CKCL', fontSize: 12, color: 'rgba(255,255,255,0.7)', width: 44, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
          <button style={btn} aria-label="Zoom in" onClick={() => setZoom((z) => Math.min(2, +(z + 0.1).toFixed(2)))}>+</button>
        </div>
        <button style={{ ...btn, background: '#E10B17', border: 'none' }} onClick={() => window.print()}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
          <span className="hidden sm:inline">Print / Save as PDF</span>
        </button>
        <button style={btn} aria-label="Close preview" onClick={onClose}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      {/* Pages */}
      <div className="pdf-scroll" style={{ flex: 1, overflow: 'auto', padding: '24px 16px 48px', display: 'flex', justifyContent: 'center' }}>
        <div className="pdf-zoom" style={{ zoom, display: 'flex', flexDirection: 'column', gap: 24, height: 'max-content' }}>
          <FormPages record={record}/>
        </div>
      </div>
    </div>,
    document.body,
  )
}
