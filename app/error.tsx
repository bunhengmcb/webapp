"use client";
import React from "react";

export default function GlobalError({ error }: { error: Error }) {
  // Minimal friendly error UI to avoid blank white-screen in staging
  return (
    <html>
      <body style={{ fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif", padding: 24 }}>
        <h1 style={{ color: "#b91c1c" }}>Application Error</h1>
        <p>Something went wrong while loading the application. Please refresh or contact support.</p>
        <pre style={{ whiteSpace: "pre-wrap", background: "#111827", color: "#f3f4f6", padding: 12, borderRadius: 6 }}>{error?.message}</pre>
      </body>
    </html>
  );
}
