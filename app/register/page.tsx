"use client";

import { FormEvent, useEffect, useState } from "react";
import styles from "./register.module.css";

type RequestedRole = "Stock Controller" | "Stockkeeper" | "Site Engineer" | "QS";

const roleDescriptions: Record<RequestedRole, string> = {
  "Stock Controller": "Verify and post controlled inventory movements across assigned sites.",
  Stockkeeper: "Receive, issue, transfer and count physical inventory for assigned sites.",
  "Site Engineer": "Request materials and view assigned-site operational inventory.",
  QS: "Prepare BOM, manage cost codes and resolve cost allocation for assigned projects.",
};

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [phone, setPhone] = useState("");
  const [site, setSite] = useState("VLS");
  const [role, setRole] = useState<RequestedRole>("Stockkeeper");
  const [confirmed, setConfirmed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [message, setMessage] = useState("");
  const [firstAccount, setFirstAccount] = useState(false);
  const [bootstrapCode, setBootstrapCode] = useState("");

  useEffect(() => {
    fetch("/api/register", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json() as { firstAccount?: boolean; error?: string };
        if (!response.ok) throw new Error(data.error || "Registration service unavailable");
        setFirstAccount(Boolean(data.firstAccount));
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "Registration service unavailable"));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!fullName.trim() || !email.trim() || !username.trim() || !password || !confirmPassword || !site || !role) {
      setMessage("Complete all required fields before submitting your request.");
      return;
    }
    if (password !== confirmPassword) {
      setMessage("Password and confirm password do not match.");
      return;
    }
    if (!confirmed) {
      setMessage("Please confirm the information before submitting.");
      return;
    }
    setMessage("Submitting request…");
    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: fullName, email, username, password, employeeId, phone, site, requestedRole: firstAccount ? "Developer" : role, bootstrapCode }),
      });
      const text = await response.text();
      const data = text ? JSON.parse(text) : {};
      if (!response.ok) throw new Error(data.error || "Registration failed");
      setMessage(data.message || "Registration submitted.");
      setPassword("");
      setConfirmPassword("");
      setConfirmed(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Registration failed");
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
        <div className={styles.brand}>
          <div className={styles.logo}>MCB</div>
          <span className={styles.brandDivider} />
          <div><strong>MEAN CHEY BUILDER</strong><span>INVENTORY MANAGEMENT SYSTEM</span></div>
        </div>
        <a className={styles.backLink} href="/login">← Back to Login</a>
      </header>

      <section className={styles.intro}>
        <div className={styles.requestIcon}>+</div>
        <h1>Request System Access</h1>
        <p>Create your account request. An administrator will review and approve your access.</p>
      </section>

      <form className={styles.card} onSubmit={submit}>
        <section className={styles.column}>
          <div className={styles.sectionTitle}><span>1</span><strong>Account Information</strong></div>

          <label>Full Name <b>*</b>
            <div className={styles.inputWrap}><span>●</span><input value={fullName} onChange={e=>{setFullName(e.target.value);setMessage("");}} placeholder="Enter your full name" /></div>
          </label>

          <label>Email <b>*</b>
            <div className={styles.inputWrap}><span>@</span><input type="email" autoComplete="email" value={email} onChange={e=>{setEmail(e.target.value);setMessage("");}} placeholder="Enter your work email" /></div>
          </label>

          <label>Username <b>*</b>
            <div className={styles.inputWrap}><span>●</span><input autoComplete="username" value={username} onChange={e=>{setUsername(e.target.value);setMessage("");}} placeholder="Enter your username" /></div>
          </label>

          <label>Password <b>*</b>
            <div className={styles.inputWrap}><span>▣</span><input type={showPassword?"text":"password"} autoComplete="new-password" value={password} onChange={e=>{setPassword(e.target.value);setMessage("");}} placeholder="Enter your password" /><button type="button" onClick={()=>setShowPassword(v=>!v)}>{showPassword?"Hide":"Show"}</button></div>
            <small>Use a password you can remember. Minimum 8 characters. Your password is stored securely as a one-way verifier.</small>
          </label>

          <label>Confirm Password <b>*</b>
            <div className={styles.inputWrap}><span>▣</span><input type={showConfirm?"text":"password"} autoComplete="new-password" value={confirmPassword} onChange={e=>{setConfirmPassword(e.target.value);setMessage("");}} placeholder="Confirm your password" /><button type="button" onClick={()=>setShowConfirm(v=>!v)}>{showConfirm?"Hide":"Show"}</button></div>
          </label>

          {firstAccount && <label>Developer Setup Code <b>*</b>
            <div className={styles.inputWrap}><span>◆</span><input type="password" autoComplete="off" value={bootstrapCode} onChange={e=>{setBootstrapCode(e.target.value);setMessage("");}} placeholder="Enter the one-time setup code" /></div>
            <small>This code securely controls the first Developer registration.</small>
          </label>}
        </section>

        <section className={styles.column}>
          <div className={styles.sectionTitle}><span>2</span><strong>Staff Information</strong><em>Optional fields marked</em></div>

          <label>Employee ID <i>Optional</i>
            <div className={styles.inputWrap}><span>▤</span><input value={employeeId} onChange={e=>setEmployeeId(e.target.value)} placeholder="Enter employee ID" /></div>
          </label>

          <label>Phone Number <i>Optional</i>
            <div className={styles.inputWrap}><span>☎</span><input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Enter phone number" /></div>
          </label>

          <label>Primary Site <b>*</b>
            <div className={styles.inputWrap}><span>▥</span><select value={site} onChange={e=>setSite(e.target.value)}><option>VLS</option><option>SSP</option><option>FPF</option><option>WH</option><option>ALL SITES</option></select></div>
          </label>

          <div className={styles.infoBox}><strong>Site assignment</strong><span>You can be assigned access to multiple sites after your request is approved.</span></div>
        </section>

        <section className={styles.column}>
          <div className={styles.sectionTitle}><span>3</span><strong>Access Request</strong></div>

          <label>Requested Role <b>*</b>
            <div className={styles.inputWrap}><span>◆</span>{firstAccount ? <input value="Developer" readOnly /> : <select value={role} onChange={e=>setRole(e.target.value as RequestedRole)}><option>Stock Controller</option><option>Stockkeeper</option><option>Site Engineer</option><option>QS</option></select>}</div>
          </label>

          <div className={styles.roleBox}>
            <strong>Role Description</strong>
            {(Object.keys(roleDescriptions) as RequestedRole[]).map((name)=><button type="button" key={name} className={role===name?styles.roleActive:""} onClick={()=>setRole(name)}><span>{name.slice(0,1)}</span><div><b>{name}</b><small>{roleDescriptions[name]}</small></div></button>)}
            <p><b>Developer</b> is a protected system role and cannot be requested from registration.</p>
          </div>
        </section>

        <div className={styles.bottomArea}>
          <label className={styles.confirm}><input type="checkbox" checked={confirmed} onChange={e=>{setConfirmed(e.target.checked);setMessage("");}} /><span>I confirm the information provided is accurate and I will use this system responsibly. I understand my access is subject to approval by the system administrator.</span></label>
          {message && <div className={styles.message}>{message}</div>}
          <button className={styles.submit} type="submit">➤ &nbsp; SUBMIT REQUEST</button>
          <p className={styles.reviewNote}>▣ &nbsp; Your request will be reviewed and you will be notified once approved.</p>
        </div>
      </form>

      <footer className={styles.footer}>
        <div><strong>Secure Connection</strong><span>Your data is protected and encrypted</span></div>
        <div><strong>System Status</strong><span className={styles.operational}>● All systems operational</span></div>
        <div><strong>Version</strong><span>V43.10-STAGING</span></div>
        <div className={styles.footerBrand}><b>MCB</b><span>BUILDING THE FUTURE</span></div>
      </footer>
    </main>
  );
}
