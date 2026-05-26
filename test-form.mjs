// End-to-end test for the contact form on index.html.
//
// What it does:
//   1. Launches a visible Chromium window so you can watch the test run.
//   2. Intercepts POST /api/submit BEFORE it leaves the browser and replies
//      with a fake { ok: true } success. This means Supabase + Resend are
//      never touched — the test is fully local and offline-safe.
//   3. Fills the contact form, submits it, and asserts the page redirects
//      to /thankyou.html.
//
// Prerequisite: a local server must be serving index.html and thankyou.html.
//   - Default expects vercel dev at http://localhost:3000  →  run `npm start`
//   - Override with: BASE=http://127.0.0.1:5500 node test-form.mjs
//
// Run:    node test-form.mjs

import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:3000";

const FIXTURE = {
  name: "Ada Lovelace",
  email: "ada@example.test",
  message: "Hello from the Playwright test suite.",
};

let browser;
let exitCode = 0;

try {
  browser = await chromium.launch({ headless: false, slowMo: 250 });
  const context = await browser.newContext();
  const page = await context.newPage();

  // --- Mock the backend: intercept /api/submit and reply with a fake success.
  // page.route runs in the browser network layer, so the real /api/submit
  // (Supabase insert + Resend email) is never reached.
  let interceptedPayload = null;
  await page.route("**/api/submit", async (route) => {
    interceptedPayload = JSON.parse(route.request().postData() || "{}");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, id: "test-mock-id" }),
    });
  });

  console.log(`→ Opening ${BASE}/index.html`);
  await page.goto(`${BASE}/index.html`, { waitUntil: "domcontentloaded" });

  console.log("→ Filling form");
  await page.fill("#cf-name", FIXTURE.name);
  await page.fill("#cf-email", FIXTURE.email);
  await page.fill("#cf-message", FIXTURE.message);

  console.log("→ Submitting");
  await Promise.all([
    page.waitForURL(/\/thankyou\.html(\?|$)/, { timeout: 10_000 }),
    page.click(".contact-submit"),
  ]);

  // --- Assertions
  const finalUrl = page.url();
  if (!/\/thankyou\.html(\?|$)/.test(finalUrl)) {
    throw new Error(`Expected redirect to /thankyou.html, got ${finalUrl}`);
  }
  if (!interceptedPayload) {
    throw new Error("Expected /api/submit to be called, but it wasn't");
  }
  if (interceptedPayload.email !== FIXTURE.email) {
    throw new Error(
      `Intercepted payload email mismatch: got ${interceptedPayload.email}`
    );
  }

  console.log("\n✓ PASS — form submitted, /api/submit intercepted, redirect confirmed");
  console.log("  Intercepted payload:", interceptedPayload);
} catch (err) {
  console.error("\n✗ FAIL —", err.message);
  exitCode = 1;
} finally {
  if (browser) await browser.close();
  process.exit(exitCode);
}
