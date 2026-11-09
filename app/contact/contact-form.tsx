"use client";

import * as React from "react";

export function ContactForm() {
  const [sent, setSent] = React.useState(false);
  if (sent) return <p role="status" className="font-display text-4xl uppercase">Message received. We&apos;ll be in touch.</p>;
  return (
    <form onSubmit={(e) => { e.preventDefault(); setSent(true); }} className="grid gap-4 sm:grid-cols-2">
      <div className="field"><label htmlFor="c-name">Name</label><input id="c-name" name="name" required autoComplete="name" /></div>
      <div className="field"><label htmlFor="c-email">Email</label><input id="c-email" name="email" type="email" required autoComplete="email" /></div>
      <div className="field sm:col-span-2"><label htmlFor="c-order">Order number (optional)</label><input id="c-order" name="order" /></div>
      <div className="field sm:col-span-2"><label htmlFor="c-msg">Message</label><textarea id="c-msg" name="message" rows={6} required /></div>
      <button type="submit" className="btn sm:col-span-2 sm:justify-self-start">Send message</button>
    </form>
  );
}
