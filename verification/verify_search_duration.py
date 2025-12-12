from playwright.sync_api import sync_playwright, expect
import time

def verify_search_duration():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        # Go to the app
        print("Navigating to app...")
        try:
            page.goto("http://localhost:3000")
        except Exception as e:
            print(f"Failed to load page: {e}")
            return

        # Wait for search bar
        print("Waiting for search bar...")
        search_input = page.get_by_placeholder("Search for songs...")
        expect(search_input).to_be_visible(timeout=10000)

        # Type search term
        print("Searching for 'faded'...")
        search_input.fill("faded")
        search_input.press("Enter")

        # Wait for results
        print("Waiting for results...")
        # We expect a duration text format (e.g., "3:30")
        # In SongList.tsx: {song.channel} • {song.duration}
        # Let's wait for a song list item
        
        # Wait for at least one duration text to appear. 
        # The duration format in the API is typically "MM:SS" or similar.
        # We can look for the separator "•"
        page.wait_for_selector("text=•", timeout=15000)

        # Take screenshot
        print("Taking screenshot...")
        page.screenshot(path="verification/search_duration.png")
        
        print("Verification complete.")
        browser.close()

if __name__ == "__main__":
    verify_search_duration()
