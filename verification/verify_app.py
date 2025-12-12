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

        # --- To-Do Test ---
        # Add a task
        page.fill("#todo-input", "Buy groceries")
        page.click("#add-todo-btn")

        # Add a high priority task
        page.fill("#todo-input", "Finish project")
        page.select_option("#priority-select", "high")
        page.click("#add-todo-btn")

        # Verify tasks exist
        expect(page.locator(".task-text").first).to_have_text("Finish project")
        expect(page.locator(".task-text").nth(1)).to_have_text("Buy groceries")

        # --- Persistence Test ---
        # Reload the page
        page.reload()

        # Verify tasks persist
        expect(page.locator(".task-text").first).to_have_text("Finish project")
        expect(page.locator(".task-text").nth(1)).to_have_text("Buy groceries")

        # --- Notes Test ---
        # Switch to Notes tab
        page.click("button[data-tab='notes']")

        # Create a note
        page.click("#add-note-btn")
        page.fill("#note-title-input", "Meeting Notes")
        page.fill("#note-body-input", "Discuss Q3 goals and roadmap.")
        page.click("#save-note-btn")

        # Verify note added
        expect(page.locator(".note-title").first).to_have_text("Meeting Notes")

        # Reload again to test note persistence
        page.reload()

        # Switch back to Notes tab (default is Todo usually, or persistent? My code doesn't persist active tab, just data)
        page.click("button[data-tab='notes']")
        expect(page.locator(".note-title").first).to_have_text("Meeting Notes")

        # Take screenshot
        page.screenshot(path="verification/app_verification.png", full_page=True)

        browser.close()

if __name__ == "__main__":
    run()
