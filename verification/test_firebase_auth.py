from playwright.sync_api import sync_playwright
import time

def run_auth_test():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Capture console logs
        page.on("console", lambda msg: print(f"BROWSER LOG: {msg.text}"))

        email = "devxrev01@gmail.com"
        password = "devxrev01"
        
        print("--- Starting Auth Test ---")

        # 1. Check Signup
        print(f"\n[Step 1] Attempting Signup with {email}...")
        try:
            page.goto("http://localhost:3000/signup")
            page.wait_for_selector("input[placeholder='Email Address']", state="visible")
            
            page.fill("input[placeholder='Email Address']", email)
            page.fill("input[placeholder='Password']", password)
            page.fill("input[placeholder='Confirm Password']", password)
            
            page.click("button:has-text('Sign Up')")
            
            # Wait for either redirection (success) or error message
            # We assume success redirects to '/', error shows text.
            try:
                # Wait up to 5 seconds for a potential error or redirect
                page.wait_for_timeout(3000) 
                
                # Check for error message
                error_locator = page.locator("text=Failed to create an account")
                if error_locator.is_visible():
                    error_text = error_locator.inner_text()
                    print(f"Signup Result: Detected Error -> {error_text}")
                    page.screenshot(path="verification/signup_error.png")
                    
                    if "email-already-in-use" in error_text or "already in use" in error_text:
                         print("Status: Account already exists (Expected behavior if testing repeatedly).")
                    else:
                         print("Status: Unexpected Signup Error.")
                    
                    # Proceed to Login check since Signup failed
                    should_login = True
                else:
                    # Check if redirected to dashboard
                    if page.url.rstrip('/') == "http://localhost:3000":
                        print("Signup Result: Success! Redirected to Dashboard.")
                        print("Status: New Account Created.")
                        page.screenshot(path="verification/signup_success.png")
                        should_login = False # Already logged in
                    else:
                        print(f"Signup Result: Uncertain. Current URL: {page.url}")
                        page.screenshot(path="verification/signup_uncertain.png")
                        should_login = True # Try login just in case

            except Exception as e:
                print(f"Error checking signup result: {e}")
                should_login = True

        except Exception as e:
            print(f"Signup Flow Failed: {e}")
            should_login = True

        # 2. Check Login (if needed)
        if should_login:
            print(f"\n[Step 2] Attempting Login with {email}...")
            try:
                page.goto("http://localhost:3000/login")
                page.wait_for_selector("input[placeholder='Email Address']")
                
                page.fill("input[placeholder='Email Address']", email)
                page.fill("input[placeholder='Password']", password)
                
                page.click("button:has-text('Login')")
                
                # Wait for redirect
                page.wait_for_url("http://localhost:3000/", timeout=10000)
                print("Login Result: Success! Redirected to Dashboard.")
                page.screenshot(path="verification/login_success.png")
                
            except Exception as e:
                print(f"Login Flow Failed: {e}")
                page.screenshot(path="verification/login_fail.png")

        # 3. Verify User State
        print("\n[Step 3] Verifying User State on Dashboard...")
        try:
            # Ensure we are on dashboard
            if page.url.rstrip('/') != "http://localhost:3000":
                page.goto("http://localhost:3000")
            
            page.wait_for_load_state("networkidle")
            
            # Check for Navbar elements
            # Logout button
            logout_btn = page.locator("button:has-text('Logout')")
            if logout_btn.is_visible():
                print("UI Check: 'Logout' button is visible.")
            else:
                print("UI Check: 'Logout' button NOT visible (Test Failed).")

            # Email display
            email_text = page.locator(f"text={email}")
            if email_text.is_visible():
                print(f"UI Check: Email '{email}' is displayed in Navbar.")
            else:
                print(f"UI Check: Email '{email}' NOT found in Navbar.")

            # Check for 'Login to Generate' (Should NOT exist)
            old_text = page.locator("text=Login to Generate")
            if not old_text.is_visible():
                 print("UI Check: 'Login to Generate' text is correctly REMOVED.")
            else:
                 print("UI Check: 'Login to Generate' text IS STILL PRESENT (Test Failed).")

            page.screenshot(path="verification/final_state.png")

        except Exception as e:
             print(f"User State Verification Failed: {e}")

        browser.close()
        print("\n--- Test Completed ---")

if __name__ == "__main__":
    run_auth_test()
