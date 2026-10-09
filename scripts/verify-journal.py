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
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.set_default_navigation_timeout(60000)
    page.goto(base, wait_until="networkidle")
    assert "The Abyss" in page.title()
    colors = page.locator(".journal-site").evaluate("e=>({background:getComputedStyle(e).backgroundColor,teal:getComputedStyle(e).getPropertyValue('--brand').trim(),navy:getComputedStyle(e).getPropertyValue('--navy').trim()})")
    assert colors == {"background":"rgb(245, 241, 232)","teal":"#1c6670","navy":"#0e1c3b"}, colors
    page.screenshot(path=str(out/"homepage-desktop.png"),full_page=True)
    issue = page.locator('a[href^="/issues/"]').first.get_attribute("href")
    article = page.locator('a[href^="/articles/"]').first.get_attribute("href")
    assert issue and article
    for path in ["/current-issue","/issues","/about","/editorial-standards","/corrections","/newsletter","/articles","/topics","/search?q=peptides",issue,issue+"/cover",article]:
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
    assert page.locator("h1").count() == 1
    assert page.locator(".article-glance dt").all_text_contents() == ["What we know", "What we don’t know", "What to watch"]
    assert page.locator(".article-evidence .evidence-steps li").count() == 5
    assert "Animal studies" in page.locator(".article-evidence .is-highlighted").inner_text()
    assert page.locator("#ghk-cu-copper-peptide").evaluate("e=>e.previousElementSibling.classList.contains('article-evidence')"), "Ladder must follow the BPC-157 section"
    page.locator(".article-evidence").screenshot(path=str(out/"article-evidence-desktop.png"))
    broken = page.locator('a[href^="#"]').evaluate_all('(els)=>els.filter(e=>e.hash && !document.getElementById(decodeURIComponent(e.hash.slice(1)))).map(e=>e.hash)')
    assert not broken, broken
    page.get_by_role("button",name="Copy link",exact=True).click()
    assert "copied" in page.locator(".article-copy-status").inner_text().lower() or page.get_by_label("Article link to copy").is_visible()
    page.locator(".chart-data").first.locator("summary").click()
    assert page.locator(".chart-data").first.locator("table").is_visible()
    page.locator(".chart-data").first.locator("summary").click()
    page.screenshot(path=str(out/"article-desktop.png"),full_page=True)
    page.emulate_media(media="print")
    page.pdf(path=str(out/"article-print.pdf"),format="A4",print_background=True)
    page.emulate_media(media="screen")
    printed = fitz.open(out/"article-print.pdf")
    printed_text = "\n".join(sheet.get_text() for sheet in printed)
    assert "Category" in printed_text and "Cite this article" in printed_text, "Print view must preserve chart data and citations"
    print_compact = re.sub(r"\s+", "", printed_text.lower())
    assert "ataglance" in print_compact and "theevidenceladder" in print_compact
    page.set_viewport_size({"width":390,"height":844})
    for path in ["/",issue,issue+"/cover",article,"/about","/editorial-standards"]:
        page.goto(base+path,wait_until="networkidle")
        assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth"), f"Horizontal overflow on {path}"
    page.goto(base,wait_until="networkidle")
    page.screenshot(path=str(out/"homepage-mobile.png"),full_page=True)
    page.goto(base+article,wait_until="networkidle")
    page.locator(".article-glance").screenshot(path=str(out/"article-glance-mobile.png"))
    page.locator(".article-evidence").screenshot(path=str(out/"article-evidence-mobile.png"))
    page.locator(".article-mobile-contents summary").click()
    assert page.locator(".article-mobile-contents nav").is_visible()
    page.screenshot(path=str(out/"article-mobile.png"),full_page=True)
    page.set_viewport_size({"width":320,"height":740})
    for path in ["/",issue+"/cover","/editorial-standards",article,"/search?q=peptides"]:
        page.goto(base+path,wait_until="networkidle")
        assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth"), f"Horizontal overflow on {path} at 320px"
    page.set_viewport_size({"width":1440,"height":1100})
    for name,path in [("issue",issue),("cover",issue+"/cover"),("about","/about"),("editorial-standards","/editorial-standards")]:
        page.goto(base+path,wait_until="networkidle")
        page.screenshot(path=str(out/(name+"-desktop.png")),full_page=True)
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
        page.goto(base+"/admin/posts/new",wait_until="networkidle")
        page.get_by_role("button",name="Chart",exact=True).click()
        dialog=page.get_by_role("dialog")
        dialog.get_by_label("Title",exact=True).fill("Unsaved chart")
        dialog.get_by_label("Grid",exact=True).click()
        dialog.get_by_role("button",name="Cancel",exact=True).click()
        page.get_by_role("button",name="Chart",exact=True).click()
        dialog=page.get_by_role("dialog")
        assert dialog.get_by_label("Title",exact=True).input_value()=="Untitled chart", "Chart form must reset when reopened"
        assert dialog.get_by_label("Grid",exact=True).is_checked()
        dialog.get_by_label("Data (label, number",exact=False).fill("Incomplete,\nValid,4")
        dialog.get_by_role("button",name="Insert",exact=True).click()
        page.get_by_label("Headline",exact=True).fill("Article template review")
        page.get_by_label("Excerpt",exact=True).fill("A sample article to review the published typography.")
        sample="## Evidence\n\nA paragraph with **emphasis**, `code`, and [a link](https://example.org).\n\n## Evidence\n\n| Study | Result |\n| --- | --- |\n| Trial | 4 |\n\n:::chart\n{\"type\":\"bar\",\"title\":\"Invalid\",\"data\":null}\n:::"
        page.get_by_placeholder("Write in Markdown. Add images from the toolbar or drop them here.").fill(sample)
        page.locator("summary").filter(has_text="Article summary and evidence ladder").click()
        page.get_by_label("Show At a glance",exact=True).check()
        for label,body in [("What we know","A controlled trial measured the outcome."),("What we don’t know","Long-term effects remain uncertain."),("What to watch","Independent replication and follow-up.")]:
            page.get_by_label(label,exact=True).fill(body)
        page.get_by_label("Show evidence ladder",exact=True).check()
        page.get_by_label("Subject",exact=True).fill("Template review")
        page.get_by_label("Main body of evidence",exact=True).select_option("Small human studies")
        page.get_by_label("Place after section",exact=True).select_option("evidence")
        page.get_by_label("Figure caption",exact=True).fill("A sample caption with study limitations.")
        page.get_by_label("Article type",exact=True).select_option("Evidence Check")
        page.get_by_role("tab",name="Preview",exact=True).click()
        preview=page.locator(".article-editor-preview")
        assert preview.get_by_role("heading",name="Article template review",exact=True).is_visible()
        assert preview.locator("#evidence").count()==1 and preview.locator("#evidence-2").count()==1
        assert preview.locator("table").is_visible()
        assert preview.locator(".article-glance").is_visible()
        assert "Small human studies" in preview.locator(".article-evidence .is-highlighted").inner_text()
        assert preview.locator("#evidence-2").evaluate("e=>e.previousElementSibling.classList.contains('article-evidence')")
        assert preview.locator(".journal-kicker").first.inner_text().lower()=="evidence check"
        import json
        assert json.loads(page.locator('input[name="atAGlance"]').input_value())["known"] == "A controlled trial measured the outcome."
        assert json.loads(page.locator('input[name="evidenceLadder"]').input_value())["afterHeading"] == "evidence"
        page.get_by_label("Show At a glance",exact=True).uncheck()
        page.get_by_label("Show evidence ladder",exact=True).uncheck()
        assert preview.locator(".article-glance").count()==0 and preview.locator(".article-evidence").count()==0
        assert page.locator('input[name="atAGlance"]').input_value()=="null"
        assert page.locator('input[name="evidenceLadder"]').input_value()=="null"
        page.screenshot(path=str(out/"article-editor-preview.png"),full_page=True)
        print("Editor routes, article preview, chart reset, invalid-chart handling, and issue selection checks passed (no content saved).")
    assert not errors, errors
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
    if kind in ["full","article"]:
        for label in ["At a glance","What we know","What we don’t know","What to watch","The evidence ladder","Regulatory approval"]: assert label in text, label
        assert text.index("BPC-157\n") < text.index("The evidence ladder") < text.index("GHK-Cu (copper peptide)")
    print(kind, "PDF:",len(doc),"pages",response.headers["Content-Disposition"])
    (out/f"{kind}.pdf").write_bytes(data)
for path in ["/api/download/issue/1900-01","/api/download/nonsense/current","/articles/missing/download","/issues/1900/01/cover"]:
    try: urllib.request.urlopen(base+path); raise AssertionError(path)
    except urllib.error.HTTPError as error: assert error.code==404
print("Palette, page routes, citations, mobile layout, PDF contents, images, and missing-resource checks passed.")
