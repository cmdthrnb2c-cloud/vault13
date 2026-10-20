This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Commerce configuration

Before deploying the updated checkout, apply `supabase/migrations/20261019000000_preorder_checkout.sql` to the existing Supabase project. It adds payment and fulfillment fields to the current `orders` table and installs the server-only stock/payment confirmation function; it does not replace product, order, or image storage.

Configure these server environment variables:

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for the existing storefront and product image upload.
- `SUPABASE_SERVICE_ROLE_KEY` for protected server-side product, order, stock, and payment operations. Keep this value private and do not prefix it with `NEXT_PUBLIC_`.
- `ADMIN_PASSWORD` and a long random `ADMIN_SESSION_SECRET` for the admin login and signed, HTTP-only session.
- `QPAY_CLIENT_ID`, `QPAY_CLIENT_SECRET`, and `QPAY_INVOICE_CODE` for QPay invoices and server-side payment verification.

Existing orders receive the migration's conservative `PENDING` payment status. The previous schema did not save QPay invoice IDs, so verify historical payments in QPay and reconcile those records manually before treating them as confirmed. Preorder arrivals past the nine-day estimate are highlighted in admin. This project currently has no customer notification mechanism, so overdue alerts are admin-only.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
