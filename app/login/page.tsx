"use client";

import { FormEvent, useState } from "react";
import styles from "./login.module.css";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [remember, setRemember] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!username.trim() || !password) {
      setMessage("Enter your username and password to continue.");
      return;
    }
    setSubmitting(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password, remember }),
      });
      const raw = await response.text();
      let data: { error?: string } = {};
      if (raw) {
        try {
          data = JSON.parse(raw) as { error?: string };
        } catch {
          if (!response.ok) throw new Error("Login service unavailable. Please try again.");
        }
      }
      if (!response.ok) throw new Error(data.error || "Unable to sign in");
      window.location.href = "/";
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to sign in");
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.constructionBackdrop} aria-hidden="true">
        <span className={styles.craneLeft} />
        <span className={styles.craneRight} />
        <span className={styles.siteLeft} />
        <span className={styles.siteRight} />
      </div>

      <header className={styles.header}>
        <div className={styles.brandHero}>
          <div className={styles.logoBlock} aria-label="Mean Chey Builder">
            <span className={styles.roof} />
            <strong>MCB</strong>
            <small>MEAN CHEY BUILDER</small>
          </div>
          <span className={styles.brandDivider} />
          <div className={styles.systemBrand}>
            <strong>MCB INVENTORY</strong>
            <span>MANAGEMENT SYSTEM</span>
            <small>Secure &nbsp;•&nbsp; Reliable &nbsp;•&nbsp; Professional</small>
          </div>
        </div>

        <div className={styles.environmentBadge}>
          <span className={styles.shield} aria-hidden="true">◆</span>
          <span>
            <strong>STAGING</strong>
            <small>Development Environment</small>
          </span>
        </div>
      </header>

      <section className={styles.card} aria-label="MCB inventory login">
        <div className={styles.lockBadge} aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M17 9h-1V7a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v8h14v-8a2 2 0 0 0-2-2Zm-7-2a2 2 0 1 1 4 0v2h-4V7Zm7 10H7v-6h10v6Z" /></svg>
        </div>

        <div className={styles.cardHeader}>
          <h1>Sign in to your account</h1>
          <p>Enter your approved MCB username and password to continue</p>
          <span className={styles.accentLine} />
        </div>

        <form className={styles.form} onSubmit={submit}>
          <label>
            <span>Username</span>
            <div className={styles.inputWrap}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-4 0-7 2-7 4.5V20h14v-1.5C19 16 16 14 12 14Z" /></svg>
              <input type="text" autoComplete="username" placeholder="Enter your username" value={username} onChange={(event) => { setUsername(event.target.value); setMessage(""); }} />
            </div>
          </label>

          <label>
            <span>Password</span>
            <div className={styles.inputWrap}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 9h-1V7a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v8h14v-8a2 2 0 0 0-2-2Zm-7-2a2 2 0 1 1 4 0v2h-4V7Zm7 10H7v-6h10v6Z" /></svg>
              <input type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(event) => { setPassword(event.target.value); setMessage(""); }} />
              <button className={styles.eyeButton} type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((value) => !value)}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5c5.5 0 9.5 5.2 9.5 7s-4 7-9.5 7S2.5 13.8 2.5 12 6.5 5 12 5Zm0 2c-3.8 0-6.8 3.3-7.5 5 .7 1.7 3.7 5 7.5 5s6.8-3.3 7.5-5c-.7-1.7-3.7-5-7.5-5Zm0 2.2A2.8 2.8 0 1 1 12 15a2.8 2.8 0 0 1 0-5.6Z" /></svg>
              </button>
            </div>
          </label>

          <div className={styles.options}>
            <label className={styles.remember}><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} /><span>Remember me</span></label>
            <button type="button" className={styles.linkButton}>Forgot password?</button>
          </div>

          {message && <div className={styles.message}>{message}</div>}

          <button className={styles.submit} type="submit" disabled={submitting}><span>{submitting ? "Signing in…" : "Sign in"}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m13 5 7 7-7 7-1.4-1.4 4.6-4.6H4v-2h12.2l-4.6-4.6L13 5Z" /></svg></button>
        </form>

        <div className={styles.divider}><span>or</span></div>
        <a className={styles.secondary} href="/register">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4 0-7 2-7 4.5V20h8v-2h2v-2h2.4c-1.3-1.2-3.2-2-5.4-2Zm-9-3V8H4v3H1v2h3v3h2v-3h3v-2H6Z" /></svg>
          Request System Access
        </a>
        <span className={styles.newUserText}>New user? Request access to the system</span>

        <div className={styles.helpPanel}>
          <div className={styles.helpIcon} aria-hidden="true">?</div>
          <div><strong>Need help?</strong><small>Contact System Administrator for assistance</small></div>
          <button type="button">Contact Admin</button>
        </div>
      </section>

      <footer className={styles.footerBand}>
        <div className={styles.footerInner}>
          <div><strong>Secure Connection</strong><span>Your data is protected and encrypted</span></div>
          <div className={styles.status}><strong>System Status</strong><span><i /> All Systems Operational</span></div>
          <div><strong>Version</strong><span>V43.6-STAGING</span></div>
        </div>
        <p>© 2026 Mean Chey Builder. All rights reserved.</p>
      </footer>
    </main>
  );
}
