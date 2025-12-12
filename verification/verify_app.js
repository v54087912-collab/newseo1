const { chromium } = require('playwright');
const assert = require('assert');

(async () => {
  console.log('Starting verification...');
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // 1. Open the app
  await page.goto('http://localhost:8080');
  const title = await page.title();
  assert.match(title, /GlassyTasks/);
  console.log('Title verified');

  // 2. Create Task
  await page.fill('#taskInput', 'Test Task 1');
  await page.selectOption('#priorityInput', 'high');
  await page.click('#addTaskBtn');

  // Check for task existence
  await page.waitForSelector('.task-text:has-text("Test Task 1")');
  console.log('Task created');

  // 3. Verify Priority UI
  const priorityDot = await page.locator('.task-item:has-text("Test Task 1") .p-high');
  assert.ok(await priorityDot.isVisible(), 'High priority dot visible');
  console.log('Priority UI verified');

  // 4. Persistence Test (part 1)
  await page.fill('#taskInput', 'Task to Persist');
  await page.click('#addTaskBtn');
  await page.waitForSelector('.task-text:has-text("Task to Persist")');

  // 5. Notes Logic
  await page.click('#tabNotes');
  await page.waitForSelector('#notesSection', { state: 'visible' });

  await page.click('#addNoteBtn');
  await page.waitForSelector('#noteModal', { state: 'visible' });

  await page.fill('#noteTitle', 'Persistent Note');
  await page.fill('#noteBody', 'Body text');
  await page.click('#saveNoteBtn');

  await page.waitForSelector('.note-title:has-text("Persistent Note")');
  console.log('Note created');

  // 6. Reload and Verify Persistence
  await page.reload();
  await page.waitForSelector('#taskInput'); // Default view

  const taskVisible = await page.isVisible('.task-text:has-text("Task to Persist")');
  assert.ok(taskVisible, 'Task persisted after reload');
  console.log('Task persistence verified');

  const notes = await page.evaluate(() => JSON.parse(localStorage.getItem('glassy_notes')));
  assert.ok(notes && notes.length > 0, 'Notes exist in storage');
  assert.strictEqual(notes[0].title, 'Persistent Note');
  console.log('Note persistence verified');

  // 7. Visual Verification (Screenshot)
  await page.click('#tabNotes');
  await page.waitForSelector('.note-card');

  // WAIT FOR ANIMATION
  await page.waitForTimeout(1000);

  await page.screenshot({ path: 'verification/final_screenshot.png', fullPage: true });
  console.log('Screenshot captured at verification/final_screenshot.png');

  await browser.close();
  console.log('All verifications passed!');
})();
