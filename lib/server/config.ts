/**
 * Server-only settings, read from environment variables (see .env.example).
 * Never import this file from a client component: it holds secret keys.
 */
const env = (name: string) => process.env[name]?.trim() || undefined;

export const config = {
  siteUrl: (env("NEXT_PUBLIC_SITE_URL") ?? "http://localhost:3000").replace(/\/$/, ""),
  paystack: {
    secretKey: env("PAYSTACK_SECRET_KEY"),
    apiBase: (env("PAYSTACK_API_BASE") ?? "https://api.paystack.co").replace(/\/$/, ""),
  },
  email: {
    resendKey: env("RESEND_API_KEY"),
    apiBase: (env("RESEND_API_BASE") ?? "https://api.resend.com").replace(/\/$/, ""),
    from: env("EMAIL_FROM"),
    ordersTo: env("ORDER_NOTIFY_EMAIL"),
    audienceId: env("RESEND_AUDIENCE_ID"),
  },
  adminPassword: env("ADMIN_PASSWORD"),
};

export const paymentsReady = () => Boolean(config.paystack.secretKey);
export const emailReady = () => Boolean(config.email.resendKey && config.email.from && config.email.ordersTo);
