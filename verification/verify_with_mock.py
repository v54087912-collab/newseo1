from playwright.sync_api import sync_playwright, expect
import json

def verify_with_mock():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Mock the API Proxy
        def handle_route(route):
            request = route.request
            if "type=search" in request.url:
                # Mock Search Results
                mock_data = {
                    "results": [
                        {
                            "title": "Mock Song One",
                            "duration": "3:30",
                            "thumbnail": "https://placehold.co/150x150?text=Song1",
                            "videoId": "video1"
                        },
                        {
                            "title": "Mock Song Two",
                            "duration": "4:20",
                            "thumbnail": "https://placehold.co/150x150?text=Song2",
                            "videoId": "video2"
                        }
                    ]
                }
                route.fulfill(
                    status=200,
                    content_type="application/json",
                    body=json.dumps(mock_data)
                )
            else:
                route.continue_()

        # Intercept /api/proxy
        page.route("**/api/proxy*", handle_route)

        # Go to local server
        page.goto("http://localhost:8080")

        # Type into search
        page.fill("#searchInput", "test")

        # Wait for results
        expect(page.locator(".result-card")).to_have_count(2)
        expect(page.locator("text=Mock Song One")).to_be_visible()

        # Take screenshot
        page.screenshot(path="verification/mock_search_results.png")

        browser.close()

if __name__ == "__main__":
    verify_with_mock()
