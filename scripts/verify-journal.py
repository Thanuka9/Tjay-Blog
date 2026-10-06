"""Read-only browser/PDF checks against a running local journal."""
import os, re, urllib.request, urllib.error
from pathlib import Path
import fitz
from playwright.sync_api import sync_playwright

base = os.environ.get("JOURNAL_TEST_URL", "http://localhost:3100")
out = Path("artifacts/journal-review")
out.mkdir(parents=True, exist_ok=True)
with sync_playwright() as p:
    browser = p.chromium.launch(channel="msedge", headless=True)
    page = browser.new_page(viewport={"width":1440,"height":1100})
    page.set_default_navigation_timeout(60000)
    page.goto(base, wait_until="networkidle")
    assert "The Abyss" in page.title()
    colors = page.locator(".journal-site").evaluate("e=>({background:getComputedStyle(e).backgroundColor,teal:getComputedStyle(e).getPropertyValue('--brand').trim(),navy:getComputedStyle(e).getPropertyValue('--navy').trim()})")
    assert colors == {"background":"rgb(245, 240, 230)","teal":"#2c797c","navy":"#0d1e3f"}, colors
    page.screenshot(path=str(out/"homepage-desktop.png"),full_page=True)
    issue = page.locator('a[href^="/issues/"]').first.get_attribute("href")
    article = page.locator('a[href^="/articles/"]').first.get_attribute("href")
    assert issue and article
    for path in ["/current-issue","/issues","/about","/editorial-standards","/corrections","/newsletter",issue,article]:
        response=page.goto(base+path,wait_until="networkidle")
        assert response.status==200, (path,response.status)
        body = page.locator("body").inner_text()
        assert "The Assay" not in body, (path, body[max(0,body.find("The Assay")-60):body.find("The Assay")+100])
    page.get_by_role("button",name="Cite",exact=True).click()
    dialog=page.get_by_role("dialog")
    assert "AB-" in dialog.inner_text()
    dialog.get_by_role("button",name="APA",exact=True).click()
    assert "The Abyss" in dialog.inner_text()
    page.screenshot(path=str(out/"citation-dialog.png"),full_page=True)
    page.keyboard.press("Escape")
    page.screenshot(path=str(out/"article-desktop.png"),full_page=True)
    page.set_viewport_size({"width":390,"height":844})
    for path in ["/",issue,article]:
        page.goto(base+path,wait_until="networkidle")
        assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth"), f"Horizontal overflow on {path}"
    page.goto(base,wait_until="networkidle")
    page.screenshot(path=str(out/"homepage-mobile.png"),full_page=True)
    if os.environ.get("JOURNAL_VERIFY_ADMIN") == "1" and base.startswith("http://localhost:"):
        values = dict(line.split("=",1) for line in Path(".env.local").read_text().splitlines() if "=" in line and not line.startswith("#"))
        password = values.get("ADMIN_PASSWORD", "").strip().strip('"\'')
        assert password, "Local admin password is required for optional editor checks"
        page.set_viewport_size({"width":1440,"height":1100})
        page.goto(base+"/admin/login?next=/admin/issues",wait_until="networkidle")
        page.get_by_label("Password",exact=True).fill(password)
        page.get_by_role("button",name="Sign in",exact=True).click()
        page.wait_for_url(base+"/admin/issues")
        for path in ["/admin/issues","/admin/issues/new","/admin/posts/new"]:
            response=page.goto(base+path,wait_until="networkidle")
            assert response.status==200
        assert page.get_by_label("Author",exact=True).input_value()=="The Abyss"
        assert page.get_by_label("Article number",exact=True).is_visible()
        page.goto(base+"/admin/issues/new",wait_until="networkidle")
        page.get_by_role("checkbox").first.check()
        assert page.locator('input[name="postIds"]').count()==1
        page.get_by_role("checkbox").first.uncheck()
        assert page.locator('input[name="postIds"]').count()==0
        page.screenshot(path=str(out/"issue-editor.png"),full_page=True)
        print("Editor routes, article metadata, and issue selection checks passed (no content saved).")
    browser.close()

for kind,url in [("full",issue+"/download"),("article",article+"/download"),("contents","/api/download/contents/"+issue.split("/")[-2]+"-"+issue.split("/")[-1])]:
    response=urllib.request.urlopen(base+url, timeout=60)
    data=response.read()
    assert response.headers["Content-Type"]=="application/pdf"
    assert "attachment;" in response.headers["Content-Disposition"]
    doc=fitz.open(stream=data,filetype="pdf")
    text="\n".join(page.get_text() for page in doc)
    assert "The Abyss" in text
    assert "The Assay" not in text
    if kind=="full":
        for label in ["From the Editor","Table of Contents","References","Cite this article","Publication information"]: assert label in text, label
        assert text.index("From the Editor") < text.index("Table of Contents") < text.index("References")
        assert any(page.get_images() for page in doc), "Article image was not embedded"
    if kind=="article": assert "Table of Contents" not in text
    print(kind, "PDF:",len(doc),"pages",response.headers["Content-Disposition"])
    (out/f"{kind}.pdf").write_bytes(data)
for path in ["/api/download/issue/1900-01","/api/download/nonsense/current","/articles/missing/download"]:
    try: urllib.request.urlopen(base+path); raise AssertionError(path)
    except urllib.error.HTTPError as error: assert error.code==404
print("Palette, page routes, citations, mobile layout, PDF contents, images, and missing-resource checks passed.")
