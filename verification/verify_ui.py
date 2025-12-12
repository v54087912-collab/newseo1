from playwright.sync_api import sync_playwright, expect

def verify_app():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        # Go to local server
        page.goto("http://localhost:8080")
        
        # Wait for search input to be visible
        expect(page.locator("#searchInput")).to_be_visible()
        
        # Check title
        expect(page).to_have_title("Music Web App")
        
        # Take screenshot of initial state
        page.screenshot(path="verification/initial_state.png")
        
        # Type into search (this won't fetch real data because api/proxy is not running in python simple server)
        # But we can verify UI reaction
        page.fill("#searchInput", "test")
        
        # Wait for spinner (it appears when loading)
        # Since we mocked the fetch or the fetch will fail (404 for /api/proxy), we expect error message or spinner.
        # In script.js: fetch failure -> 'Error loading results' in resultsContainer.
        
        # Wait for results container to update
        page.wait_for_timeout(1000) # Wait for debounce + fetch attempt
        
        page.screenshot(path="verification/search_state.png")
        
        browser.close()

if __name__ == "__main__":
    verify_app()
