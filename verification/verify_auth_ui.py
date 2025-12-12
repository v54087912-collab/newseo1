from playwright.sync_api import sync_playwright

def verify_login_signup():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        # Navigate to Login
        print("Navigating to Login page...")
        page.goto("http://localhost:3000/login")
        page.wait_for_selector("text=Welcome Back")
        page.screenshot(path="verification/login_page.png")
        print("Login page verified.")

        # Navigate to Signup
        print("Navigating to Signup page...")
        page.click("text=Sign up")
        page.wait_for_selector("text=Create Account")
        page.screenshot(path="verification/signup_page.png")
        print("Signup page verified.")

        browser.close()

if __name__ == "__main__":
    verify_login_signup()
