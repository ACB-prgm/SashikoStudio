from pathlib import Path
import json,time,sys,os,shutil
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'test-results';OUT.mkdir(exist_ok=True)
errors=[]
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'),headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
    page=browser.new_page(viewport={'width':1440,'height':1050},device_scale_factor=1,accept_downloads=True)
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.context.set_offline(True)
    page.set_content((ROOT/"index.html").read_text(),wait_until="load")
    page.wait_for_function('window.SashikoStudio && window.SashikoStencil')
    page.screenshot(path=str(OUT/'main-desktop.png'),full_page=True)
    page.click('#export-stencil')
    page.wait_for_function('!SashikoStencil.isBusy()',timeout=120000)
    print('DEFAULT',page.locator('#stencil-checks').inner_text(),flush=True)
    page.screenshot(path=str(OUT/'stencil-desktop.png'),full_page=True)
    results=[]
    for pattern in ['interlaced','grid','diamonds','circles','chevrons','waves']:
        page.evaluate('(pattern)=>SashikoStudio.setState({pattern})',pattern)
        page.wait_for_function('!SashikoStencil.isBusy()',timeout=30000)
        assert page.evaluate('!!SashikoStencil.getResult()'),page.locator('#stencil-checks').inner_text()
        r=page.evaluate('SashikoStencil.getReport()')
        results.append(r)
        print(pattern, r.get('triangles'),r.get('errors'),r.get('warnings'),r.get('elapsedMs'),flush=True)
        (OUT/(pattern+'-report.json')).write_text(json.dumps(r,indent=2))
        data=page.evaluate('Array.from(SashikoStencil.getResult()?.buffer ? new Uint8Array(SashikoStencil.getResult().buffer) : [])')
        if data:(OUT/(pattern+'-repeat.stl')).write_bytes(bytes(data))
        payload=page.evaluate('SashikoStencil.makeInput()')
        (OUT/(pattern+'-input.json')).write_text(json.dumps(payload))
    page.evaluate('SashikoStudio.setState({pattern:"interlaced"})')
    page.wait_for_function('!SashikoStencil.isBusy() && SashikoStencil.getResult() !== null',timeout=120000)
    page.click('[data-stencil-view="3d"]')
    page.wait_for_timeout(500)
    page.screenshot(path=str(OUT/'stencil-3d.png'),full_page=True)
    if page.locator('#stencil-ack-row').is_visible():page.check('#stencil-ack')
    with page.expect_download() as info:
        page.click('#stencil-download')
    dl=info.value;dl.save_as(OUT/'ui-download.stl')
    assert (OUT/'ui-download.stl').stat().st_size>84
    with page.expect_download() as info:
        page.click('#stencil-report')
    info.value.save_as(OUT/'ui-report.json')
    page.click('#stencil-close')
    with page.expect_download() as info:page.click('#save-preset')
    info.value.save_as(OUT/'settings-v2.json')
    saved=json.loads((OUT/'settings-v2.json').read_text());assert saved['version']==2 and saved['stencil']['slotWidth']==.9
    page.set_viewport_size({'width':390,'height':844});page.click('#export-stencil')
    page.wait_for_function('!SashikoStencil.isBusy() && SashikoStencil.getResult() !== null',timeout=120000)
    page.click('[data-stencil-view="top"]')
    page.screenshot(path=str(OUT/'stencil-mobile.png'),full_page=True)
    assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1')
    print('JS errors:',errors,flush=True)
    (OUT/'browser-report.json').write_text(json.dumps({'errors':errors,'results':results},indent=2))
    assert not errors,errors
    browser.close()
