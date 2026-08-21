import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
await page.screenshot({ path: '/tmp/home.png', fullPage: true });
await page.goto('http://localhost:4173/login', { waitUntil: 'networkidle' });
await page.screenshot({ path: '/tmp/login.png', fullPage: true });
await browser.close();
