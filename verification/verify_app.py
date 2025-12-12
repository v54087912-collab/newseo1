from playwright.sync_api import sync_playwright, expect
import os

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 720})
        page = context.new_page()

        # Load the local HTML file
        file_path = os.path.abspath("index.html")
        page.goto(f"file://{file_path}")

        # Verify page title
        expect(page).to_have_title("GlassyTasks - Portfolio To-Do & Notes")

        # Verify Tabs exist
        expect(page.locator(".tab-btn").first).to_contain_text("Tasks")

        # --- To-Do Test ---
        # Add a task
        page.fill("#todo-input", "Buy groceries")
        page.click("#add-todo-btn")

        # Verify task added
        expect(page.locator(".task-text").first).to_have_text("Buy groceries")

        # Add a high priority task
        page.fill("#todo-input", "Finish project")
        page.select_option("#priority-select", "high")
        page.click("#add-todo-btn")

        # Verify order (newest on top)
        expect(page.locator(".task-text").first).to_have_text("Finish project")
        # Use to_contain_class instead of to_have_class for partial match
        expect(page.locator(".task-item").first).to_contain_class("task-item")

        # Complete the first task
        page.locator(".task-checkbox").first.click()

        # Switch to Active filter
        page.click("button[data-filter='active']")

        # Switch back to All
        page.click("button[data-filter='all']")

        # --- Notes Test ---
        # Switch to Notes tab
        page.click("button[data-tab='notes']")

        # Check empty state
        # Initially empty state is visible (if no notes) or hidden (if notes exist from local storage? new session should be empty)
        # But wait, localStorage persists across sessions in browser, but here we launch a fresh browser context?
        # Actually standard playwright launch creates incognito context usually, but localStorage might be empty.
        expect(page.locator("#empty-state-notes")).to_be_visible()

        # Create a note
        page.click("#add-note-btn")
        expect(page.locator("#note-modal")).to_be_visible()

        page.fill("#note-title-input", "Meeting Notes")
        page.fill("#note-body-input", "Discuss Q3 goals and roadmap.")
        page.click("#save-note-btn")

        # Verify note added
        expect(page.locator(".note-title").first).to_have_text("Meeting Notes")
        expect(page.locator("#empty-state-notes")).not_to_be_visible()

        # Take screenshot
        page.screenshot(path="verification/app_verification.png", full_page=True)

        browser.close()

if __name__ == "__main__":
    run()
