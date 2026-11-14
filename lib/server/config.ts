/**
 * Server-only settings, read from environment variables (see .env.example).
 * Never import this file from a client component: it holds secret keys.
 */
const env = (name: string) => process.env[name]?.trim() || undefined;

export const config = {
  siteUrl: (env("NEXT_PUBLIC_SITE_URL") ?? "http://localhost:3000").replace(/\/$/, ""),
  databaseUrl: env("DATABASE_URL"),
  /** Signs order-tracking links and hashes IPs. Must be set (long and random) in production. */
  appSecret: env("APP_SECRET") ?? "dev-only-insecure-secret-change-me",
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
  /** First owner account, created on the first sign-in when no admin exists yet. */
  bootstrapAdmin: { email: env("ADMIN_EMAIL")?.toLowerCase(), password: env("ADMIN_PASSWORD") },
  /** Minutes a checkout holds stock while the customer pays. */
  reservationMinutes: Number(env("STOCK_RESERVATION_MINUTES") ?? 30),
};

export const paymentsReady = () => Boolean(config.paystack.secretKey);
export const emailReady = () => Boolean(config.email.resendKey && config.email.from);
export const isProduction = () => process.env.NODE_ENV === "production" && !config.siteUrl.includes("localhost");
