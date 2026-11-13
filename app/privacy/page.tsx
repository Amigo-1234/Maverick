import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function Privacy() {
  const L = site.legal;
  return (
    <div className="mx-auto max-w-7xl gutter pb-24 pt-10">
      <PageHeader title="Privacy Policy" intro={`Last updated ${L.updated}. How ${L.businessName} collects and uses your personal data, in line with the Nigeria Data Protection Act 2023.`} />
      <div className="prose-mv">
        <h2 className="!mt-0">Who is responsible</h2>
        <p>{L.businessName}{L.registration ? ` (registration ${L.registration})` : ""}, {L.address}, is the data controller for this website. For any privacy question or request, email {site.email} or WhatsApp {site.socials.whatsapp.display}.</p>

        <h2>What we collect and why</h2>
        <ul className="flex list-disc flex-col gap-2 pl-5">
          <li><strong>Orders:</strong> your name, email, phone number and delivery address, plus what you bought. We use these to process, deliver and support your order. The legal basis is performing our contract with you.</li>
          <li><strong>Payments:</strong> handled by Paystack. We receive confirmation that you paid and the payment method type, never your full card details.</li>
          <li><strong>Messages:</strong> what you send through the contact form, WhatsApp or email, so we can reply.</li>
          <li><strong>Newsletter:</strong> your email, only if you sign up or tick the box at checkout. The legal basis is your consent, and you can unsubscribe at any time.</li>
          <li><strong>Your bag:</strong> stored on your own device (browser storage) so it&apos;s still there when you come back. It isn&apos;t sent to us until you check out.</li>
          <li><strong>Advertising measurement:</strong> if we turn on the TikTok or Meta pixel, those services may set cookies to measure which ads lead to visits and purchases. The legal basis is our legitimate interest in measuring our advertising.</li>
        </ul>

        <h2>Who we share it with</h2>
        <p>We share only what&apos;s needed with: Paystack (payments), our delivery partners (name, phone and address, to deliver your order), our email provider (to send receipts and updates), our website host, and, if switched on, TikTok and Meta (advertising measurement). We never sell your personal data.</p>

        <h2>Transfers outside Nigeria</h2>
        <p>Some of these providers store data outside Nigeria. Where that happens, we rely on the safeguards the Nigeria Data Protection Act allows, such as contracts that protect your data.</p>

        <h2>How long we keep it</h2>
        <p>We keep order records for as long as the law requires for tax and accounting, usually six years, then delete them. We remove newsletter emails as soon as you unsubscribe.</p>

        <h2>Your rights</h2>
        <p>You can ask to see, correct, delete or get a copy of your personal data, object to how we use it, or withdraw consent at any time. Contact us using the details above and we&apos;ll respond within 30 days. If you&apos;re unhappy with how we handle your data, you can complain to the Nigeria Data Protection Commission (NDPC).</p>

        <h2>Security</h2>
        <p>This website uses encrypted connections (HTTPS), and payments go through Paystack&apos;s secure checkout. Only authorised staff can see order details.</p>

        <h2>Changes</h2>
        <p>If we change this policy, we&apos;ll update the date at the top of this page.</p>
      </div>
    </div>
  );
}
