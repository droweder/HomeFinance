
from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        page.goto("http://localhost:5000/login")
        page.wait_for_selector('label:has-text("Email")', timeout=60000)
        page.wait_for_selector('label:has-text("Password")', timeout=60000)
        page.get_by_label("Email").fill("test@test.com")
        page.get_by_label("Password").fill("password")
        page.get_by_role("button", name="Login").click()
        page.wait_for_url("http://localhost:5000/dashboard", timeout=60000)

        page.goto("http://localhost:5000/daily-summary")
        page.get_by_role("link", name="Cartão de Crédito").click()
        page.wait_for_url("http://localhost:5000/credit-card", timeout=60000)

        page.screenshot(path="jules-scratch/verification/verification.png")
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
