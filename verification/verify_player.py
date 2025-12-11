from playwright.sync_api import sync_playwright

def verify_full_player():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Use a mobile viewport to trigger the mobile-first design
        context = browser.new_context(viewport={"width": 375, "height": 667})
        page = context.new_page()

        try:
            print("Navigating to app...")
            page.goto("http://localhost:8080")
            page.wait_for_load_state("networkidle")

            print("Searching for a song...")
            page.fill("input[placeholder*='Search']", "lofi")
            page.press("input[placeholder*='Search']", "Enter")
            
            # Wait for results
            page.wait_for_selector("text=lofi", timeout=10000)
            
            # Click the play button explicitly instead of the image to avoid overlay issues
            print("Clicking play button...")
            
            # Find the button that contains the Play icon (we can target the button itself)
            # In SongList, the button has a Play icon inside.
            # let's try to click the button in the last column
            play_btn = page.locator("button:has(.lucide-play)").first
            play_btn.click(force=True)
            
            print("Waiting for Mini Player to appear...")
            # Wait for Mini Player (bottom bar)
            page.wait_for_selector("button .lucide-pause", timeout=10000)
            
            print("Capturing Mini Player screenshot...")
            page.screenshot(path="verification/mini_player.png")

            print("Expanding to Full Player...")
            # Click the mini player container (bottom fixed div)
            # Use force click or JS click if overlays are an issue
            # The mini player is at the bottom.
            # We can use a specific selector for the mini player container
            # In Player.tsx, MiniPlayer has onClick={onExpand}
            
            # We can find the element by text (Song Title) which is inside the mini player
            # But let's just click the center-bottom of the screen again with force
            page.mouse.click(187, 650)
            
            # Wait for Full Player animation
            page.wait_for_timeout(2000)
            
            # Check for Full Player specific elements
            expect_now_playing = page.get_by_text("Now Playing")
            if expect_now_playing.is_visible():
                print("Full Player Expanded successfully.")
            
            print("Capturing Full Player screenshot...")
            page.screenshot(path="verification/full_player.png")
            
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_full_player()
