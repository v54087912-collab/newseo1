from playwright.sync_api import sync_playwright

def verify_music_app():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        # Navigate to the app
        # Assuming port 3000 as per npm run dev default
        page.goto("http://localhost:3000")
        
        # Verify title
        page.wait_for_selector("text=MusicFlow")
        
        # Take a screenshot of the initial state
        page.screenshot(path="verification/initial_state.png")
        
        # Perform a search
        page.fill("input[placeholder='Search for songs...']", "faded")
        page.press("input[placeholder='Search for songs...']", "Enter")
        
        # Wait for results
        # We look for a song title or an element that appears after search
        # The API might be slow, so we wait.
        try:
            page.wait_for_selector("text=Alan Walker - Faded", timeout=10000)
            page.screenshot(path="verification/search_results.png")
            print("Search results verified.")
        except Exception as e:
            print(f"Search results failed to load: {e}")
            page.screenshot(path="verification/search_fail.png")

        browser.close()

if __name__ == "__main__":
    verify_music_app()
