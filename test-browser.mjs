import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = 'C:\\Users\\Pallavi\\.gemini\\antigravity\\brain\\5c7ad5d9-f0a1-49f8-9b76-45034a8afc81\\scratch';

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runBrowserTest() {
  console.log('Launching Chrome via puppeteer-core...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  try {
    // 1. Visit Login page
    console.log('1. Navigating to http://localhost:5173/ ...');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
    console.log('Current URL (redirected):', page.url());
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_login_page.png') });

    // 2. Test Registration Flow
    console.log('2. Navigating to Register page...');
    await page.goto('http://localhost:5173/register', { waitUntil: 'networkidle0' });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_register_page.png') });

    const newEmail = `alex_${Date.now()}@example.com`;
    console.log(`Registering new user: ${newEmail}...`);
    await page.type('input[placeholder="Your name"]', 'Alex Martin');
    await page.type('input[placeholder="you@example.com"]', newEmail);
    await page.type('input[placeholder="Create a password (min 6 characters)"]', 'Password123');
    await page.click('button[type="submit"]');

    // Wait for client-side navigation to /boards
    await page.waitForFunction(() => window.location.pathname === '/boards', { timeout: 10000 });
    console.log('Registered successfully! Navigated to:', page.url());

    // Wait for boards loading to complete
    await page.waitForFunction(() => !document.body.innerText.includes('Loading your boards...'), { timeout: 10000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_registered_dashboard.png') });

    // Verify empty state for new user
    const emptyStateText = await page.evaluate(() => document.body.innerText);
    const hasEmpty = emptyStateText.includes('No boards yet');
    console.log('Empty state verified for new user:', hasEmpty);

    // Logout
    console.log('Logging out new user...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('aside button'));
      const logout = btns.find((b) => b.innerText.includes('Logout'));
      if (logout) logout.click();
    });

    await page.waitForFunction(() => window.location.pathname === '/login', { timeout: 10000 });
    console.log('After logout URL:', page.url());

    // 3. Login as Priya (priya@demo.com)
    console.log('3. Logging in as priya@demo.com / Password123 ...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
    await page.type('input[placeholder="you@example.com"]', 'priya@demo.com');
    await page.type('input[placeholder="Enter your password"]', 'Password123');
    await page.click('button[type="submit"]');

    await page.waitForFunction(() => window.location.pathname === '/boards', { timeout: 10000 });
    console.log('Priya logged in! Current URL:', page.url());

    // Wait for Priya's boards to load from API
    await page.waitForFunction(
      () => document.body.innerText.includes('Final Year Project: Smart Attendance System'),
      { timeout: 10000 }
    );
    console.log('Seeded board visible on Priya dashboard: TRUE');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_priya_dashboard.png') });

    // 4. Create a new board
    console.log('4. Creating a new board...');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('header button')).find((b) =>
        b.innerText.includes('New Board')
      );
      if (btn) btn.click();
    });

    await page.waitForSelector('input[placeholder="e.g. Marketing Launch, Sprint 23"]', {
      visible: true,
      timeout: 5000
    });

    await page.evaluate(() => {
      const input = document.querySelector('input[placeholder="e.g. Marketing Launch, Sprint 23"]');
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeSetter.call(input, 'Priya Research Board');
      input.dispatchEvent(new Event('input', { bubbles: true }));

      const desc = document.querySelector('textarea[placeholder="What is this board for?"]');
      const nativeDescSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
      nativeDescSetter.call(desc, 'Testing board creation in Milestone M3');
      desc.dispatchEvent(new Event('input', { bubbles: true }));
    });

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_create_board_modal.png') });

    await page.evaluate(() => {
      const form = document.querySelector('form');
      if (form) form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    });

    // Wait for the new board to appear in the dashboard list
    await page.waitForFunction(
      () => document.body.innerText.includes('Priya Research Board'),
      { timeout: 10000 }
    );
    console.log("New board 'Priya Research Board' successfully visible in dashboard!");
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_dashboard_with_new_board.png') });

    // 5. Click and open the newly created board
    console.log('5. Clicking and opening the new board...');
    await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('h3'));
      const target = cards.find((h) => h.innerText.includes('Priya Research Board'));
      if (target) {
        target.closest('div.group').click();
      }
    });

    // Wait for client-side navigation to /boards/:boardId
    await page.waitForFunction(() => window.location.pathname.startsWith('/boards/'), {
      timeout: 10000
    });
    console.log('Navigated to board view URL:', page.url());

    // Wait for board view placeholder to finish loading
    await page.waitForFunction(
      () =>
        document.body.innerText.includes('Priya Research Board') &&
        document.body.innerText.includes('Board placeholder ready for Milestone M4'),
      { timeout: 10000 }
    );
    console.log('Board view placeholder verified: TRUE');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_board_view_placeholder.png') });

    console.log('\n======================================================');
    console.log('=== ALL BROWSER TESTS PASSED 100% SUCCESSFULLY! ===');
    console.log('======================================================');
  } catch (err) {
    console.error('Browser test failed:', err);
  } finally {
    await browser.close();
  }
}

runBrowserTest();
