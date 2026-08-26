'use client';

import { IBM_Plex_Mono, IBM_Plex_Sans, Space_Grotesk } from 'next/font/google';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import './landing.css';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-display-src',
});
const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-body-src',
});
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono-src',
});

export default function LandingPage() {
  const { user, loading } = useAuth();
  const authed = !loading && !!user;

  return (
    <div
      className={`${spaceGrotesk.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable} landing`}
    >
      <header className="nav">
        <div className="wrap nav-inner">
          <Link href="/" className="logo">
            <Image src="/logo.png" alt="OOffix" width={176} height={88} priority className="h-10 w-auto" />
          </Link>
          <nav className="nav-links">
            <a href="#how">How it works</a>
            <a href="#ritual">The daily ritual</a>
            <a href="#features">Features</a>
          </nav>
          <div className="nav-actions">
            {authed ? (
              <Link href="/dashboard" className="btn btn-primary btn-sm">
                Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="btn btn-ghost btn-sm">
                  Log in
                </Link>
                <Link href="/register" className="btn btn-primary btn-sm">
                  Try OOffix
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <h1>
              Know exactly where your team stands, <span className="u">every day</span>.
            </h1>
            <p className="hero-sub">
              Organize your team into offices and see, every evening, who actually made progress.
            </p>
            <div className="hero-ctas">
              <Link href={authed ? '/dashboard' : '/register'} className="btn btn-primary">
                {authed ? 'Go to dashboard' : 'Try OOffix'}
              </Link>
              <a href="#how" className="btn btn-ghost">
                See how it works
              </a>
            </div>
            <div className="hero-note">
              <span className="dot"></span> In internal testing (not yet open to other companies)
            </div>
          </div>

          <div className="hero-image">
            <Image
              src="/1.png"
              alt="OOffix office view: desks light up as collaborators declare their progress"
              width={1536}
              height={1024}
              priority
            />
          </div>
        </div>
      </section>

      <section id="scattered" className="band">
        <div className="wrap">
          <div className="section-head">
            <h2>Scattered thoughts become a plan.</h2>
            <p>
              Write down what needs doing, in any order, as it comes to you. It gets broken down
              into tasks, with an owner suggested based on office roles (yours to confirm or
              adjust).
            </p>
          </div>

          <div className="scattered-banner">
            <Image
              src="/3.png"
              alt="Scattered sticky notes turning into organized task cards"
              width={1536}
              height={1024}
            />
          </div>

          <div className="demo-grid">
            <div className="demo-panel">
              <h4>Free-form input</h4>
              <div className="scrawl">
                need to review the site&apos;s contact page, fix the form bug, and check with
                client Assogba about the mockup before friday. also remember to prepare
                september&apos;s invoice
              </div>
            </div>

            <div className="demo-arrow">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 12h14M13 6l6 6-6 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <div className="demo-panel">
              <h4>Suggested tasks</h4>
              <div className="task-card">
                <div className="chk"></div>
                <div className="tc-body">
                  <div className="tc-title">Fix the contact form bug</div>
                  <span className="tc-tag">Developer</span>
                </div>
              </div>
              <div className="task-card">
                <div className="chk"></div>
                <div className="tc-body">
                  <div className="tc-title">Send the mockup to client Assogba</div>
                  <span className="tc-tag">Designer · due fri.</span>
                </div>
              </div>
              <div className="task-card">
                <div className="chk"></div>
                <div className="tc-body">
                  <div className="tc-title">Prepare September&apos;s invoice</div>
                  <span className="tc-tag">Accounting</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how">
        <div className="wrap">
          <div className="section-head">
            <h2>Four steps to move your office forward.</h2>
          </div>
          <div className="steps">
            <div className="step">
              <div className="step-n">01</div>
              <h3>Create an office</h3>
              <p>One team, one space. Marketing, engineering, sales: each gets its own.</p>
            </div>
            <div className="step">
              <div className="step-n">02</div>
              <h3>Add your team</h3>
              <p>The manager invites collaborators and assigns them a role in the office.</p>
            </div>
            <div className="step">
              <div className="step-n">03</div>
              <h3>Describe the work</h3>
              <p>Rough or detailed - OOffix structures and pre-assigns the tasks.</p>
            </div>
            <div className="step">
              <div className="step-n">04</div>
              <h3>Track every evening</h3>
              <p>Declare progress, then validate it the next day. Progress builds itself.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="ritual" className="band">
        <div className="wrap">
          <div className="section-head">
            <h2>Every evening, you know who made progress.</h2>
            <p>
              The declaration time is set by each manager for their office. What&apos;s declared
              isn&apos;t official until it&apos;s verified (the next day, in person).
            </p>
          </div>

          <div className="ritual">
            <div className="ritual-track">
              <div className="ritual-item done">
                <div className="ritual-time">8:00 AM</div>
                <h4>Today&apos;s tasks are visible</h4>
                <p>Each collaborator sees what&apos;s assigned to them for the day.</p>
              </div>
              <div className="ritual-item done">
                <div className="ritual-time">6:30 PM · office time</div>
                <h4>Declaration</h4>
                <p>
                  The collaborator checks off what they actually got done. Their progress for the
                  day shows up.
                </p>
              </div>
              <div className="ritual-item">
                <div className="ritual-time">Next morning</div>
                <h4>Check-in with the manager</h4>
                <p>The manager goes through each declared item, discusses if needed, and validates.</p>
              </div>
              <div className="ritual-item">
                <div className="ritual-time">After validation</div>
                <h4>Progress becomes official</h4>
                <p>Only validated tasks count toward the project&apos;s progress bar.</p>
              </div>
            </div>

            <div className="ritual-visual">
              <div className="ritual-image">
                <Image
                  src="/2.png"
                  alt="Manager and collaborator reviewing a task validation checklist together"
                  width={1536}
                  height={1024}
                />
              </div>
              <div className="config-card">
              <h3 style={{ fontSize: '15px', marginBottom: '4px' }}>Office settings</h3>
              <p style={{ fontSize: '13px', color: 'var(--slate)', marginBottom: '16px' }}>
                Set by the manager, for their team.
              </p>
              <div className="config-row">
                <div>
                  <div className="config-label">Declaration time</div>
                  <div className="config-hint">Can vary by day</div>
                </div>
                <span className="config-value">6:30 PM</span>
              </div>
              <div className="config-row">
                <div>
                  <div className="config-label">Reminder if not declared</div>
                  <div className="config-hint">Notification + alert to manager</div>
                </div>
                <span className="config-value">+1h</span>
              </div>
              <div className="config-row">
                <div>
                  <div className="config-label">Reliability leaderboard</div>
                  <div className="config-hint">Visible to the team, can be hidden</div>
                </div>
                <span className="config-value">Visible</span>
              </div>
              <div className="config-row">
                <div>
                  <div className="config-label">Daily summary</div>
                  <div className="config-hint">Sent to the manager every evening</div>
                </div>
                <span className="config-value">Enabled</span>
              </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features">
        <div className="wrap">
          <div className="section-head">
            <h2>Everything you need to document the work, nothing more.</h2>
          </div>

          <div className="feat-grid">
            <div className="feat">
              <div className="feat-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2" />
                  <rect x="14" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2" />
                  <rect x="3" y="13" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2" />
                  <rect x="14" y="13" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2" />
                </svg>
              </div>
              <h3>Offices</h3>
              <p>One team per office, with its own members, roles, and time settings.</p>
            </div>
            <div className="feat">
              <div className="feat-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M4 6h16M4 12h16M4 18h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <h3>Projects &amp; tasks</h3>
              <p>Goals with deadlines, broken down into assigned tasks and, if needed, subtasks.</p>
            </div>
            <div className="feat">
              <div className="feat-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M17.5 17.5L15 15M6 18l2.5-2.5M17.5 6.5L15 9"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <h3>AI suggestions</h3>
              <p>Rough text becomes structured tasks, pre-assigned based on office roles.</p>
            </div>
            <div className="feat">
              <div className="feat-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M4 19V5M4 19h16M8 15l3-4 3 3 4-6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h3>Progress bars</h3>
              <p>Based only on validated tasks - not on what was simply checked off.</p>
            </div>
            <div className="feat">
              <div className="feat-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M12 8v4l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                </svg>
              </div>
              <h3>Daily summaries</h3>
              <p>A clear rundown every evening: what was declared, validated, or missed in the office.</p>
            </div>
            <div className="feat">
              <div className="feat-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4L12 2z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h3>Reliability score</h3>
              <p>Punctuality and consistency of declarations - not just the volume of tasks checked off.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <div className="section-head">
            <h2>Checked becomes verified.</h2>
            <p>
              Checking a task off doesn&apos;t prove it&apos;s done. That&apos;s why we add one
              step: validation.
            </p>
          </div>

          <div className="ctable">
            <div className="ctable-row ctable-head">
              <div className="ctable-crit"></div>
              <div className="ctable-cell">Without validation</div>
              <div className="ctable-cell win">With validation</div>
            </div>
            <div className="ctable-row">
              <div className="ctable-crit">Declaration time</div>
              <div className="ctable-cell muted">Random, if it happens at all</div>
              <div className="ctable-cell win">Set by the manager</div>
            </div>
            <div className="ctable-row">
              <div className="ctable-crit">Who checks</div>
              <div className="ctable-cell muted">No one</div>
              <div className="ctable-cell win">The manager, the next day</div>
            </div>
            <div className="ctable-row">
              <div className="ctable-crit">What counts toward progress</div>
              <div className="ctable-cell muted">Everything checked off</div>
              <div className="ctable-cell win">Only what&apos;s validated</div>
            </div>
            <div className="ctable-row">
              <div className="ctable-crit">If it&apos;s missed</div>
              <div className="ctable-cell muted">Nothing happens</div>
              <div className="ctable-cell win">Automatic reminder</div>
            </div>
          </div>
        </div>
      </section>

      <section id="cta">
        <div className="wrap">
          <div className="cta-final">
            <h2>Bring your team into the office.</h2>
            <p>
              OOffix is still being tested within our own team. If you&apos;d like to try it with
              yours, let&apos;s talk.
            </p>
            <Link href={authed ? '/dashboard' : '/register'} className="btn btn-primary">
              {authed ? 'Go to dashboard' : 'Try OOffix'}
            </Link>
            <div className="cta-honest">No pricing plan yet: currently in internal testing</div>
          </div>
        </div>
      </section>

      <footer>
        <div className="wrap">
          <div className="footer-inner">
            <Link href="/" className="logo">
              <Image src="/logo.png" alt="OOffix" width={132} height={66} className="h-6 w-auto opacity-80" />
            </Link>
            <div className="footer-links">
              <a href="#how">How it works</a>
              <a href="#ritual">The ritual</a>
              <a href="#features">Features</a>
            </div>
            <div className="footer-copy">© 2026 OOffix - digital office, still in testing</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
