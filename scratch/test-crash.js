const puppeteer = require('puppeteer');

async function run() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  // Log browser console messages
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure().errorText));

  // Navigate to login
  await page.goto('http://localhost:3000/login');
  
  // Login as admin
  await page.type('input[type="email"]', 'admin@college.edu');
  await page.type('input[type="password"]', 'changeme123');
  await page.click('button[type="submit"]');
  
  // Wait for navigation to dashboard
  await page.waitForNavigation();
  console.log('Navigated to dashboard');
  
  // Click on the first session card (if any exists)
  try {
    const sessionCard = await page.waitForSelector('.card.cursor-pointer', { timeout: 3000 });
    if (sessionCard) {
      console.log('Found a session card, clicking it to test ActiveSessionPage...');
      await sessionCard.click();
      
      // Wait to see if error boundary triggers
      await new Promise(r => setTimeout(r, 2000));
      const content = await page.content();
      if (content.includes('This page couldn’t load')) {
        console.log('CRASH DETECTED ON OLD SESSION!');
      } else {
        console.log('No crash on old session.');
      }
    }
  } catch (err) {
    console.log('No existing sessions found or click failed.');
  }

  // Now try creating a new session
  await page.goto('http://localhost:3000/dashboard/sessions/new');
  console.log('Navigated to Create Session');

  // Fill Step 1
  await page.type('input[placeholder="e.g. CS-3A"]', 'Test Class');
  await page.type('input[placeholder="e.g. Data Structures"]', 'Test Subject');
  await page.click('button[type="submit"]');
  
  // Fill Step 2
  await new Promise(r => setTimeout(r, 500));
  await page.click('button[type="submit"]');

  // Wait for Step 3 and location success
  await new Promise(r => setTimeout(r, 2000));
  // Mock geolocation in puppeteer
  await page.evaluateOnNewDocument(function() {
    navigator.geolocation.getCurrentPosition = function(cb) {
      setTimeout(() => cb({ coords: { latitude: 37.7749, longitude: -122.4194, accuracy: 10 } }), 100);
    };
  });
  
  // Wait for "Create Session" button to be enabled
  await new Promise(r => setTimeout(r, 1000));
  
  // Try to click create
  try {
    const buttons = await page.$$('button');
    let createBtn;
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.includes('Create Session')) createBtn = btn;
    }
    
    if (createBtn) {
      await createBtn.click();
      console.log('Clicked create session, waiting for redirect...');
      await new Promise(r => setTimeout(r, 3000));
      const finalContent = await page.content();
      if (finalContent.includes('This page couldn’t load')) {
        console.log('CRASH DETECTED ON CREATE SESSION REDIRECT!');
      } else {
        console.log('No crash on create session.');
      }
    }
  } catch(e) {
    console.log('Failed to create session:', e.message);
  }

  await browser.close();
}

run();
