"""Offline browser regression for canvas sizing, decimal typing, and framed STL.
Run with Playwright and Chromium installed; writes fixtures under test-results.
"""
from pathlib import Path
import json, os, shutil
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'test-results'/'export-controls';OUT.mkdir(parents=True,exist_ok=True)
checks=[];errors=[]
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'),headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
    page=browser.new_page(viewport={'width':1440,'height':1050},accept_downloads=True)
    page.context.set_offline(True);page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content((ROOT/'index.html').read_text());page.wait_for_function('window.SashikoStencil && window.SashikoStudio')
    state=page.evaluate('SashikoStudio.getState()');stencil=page.evaluate('SashikoStencil.getSettings()')
    assert state['weight']==.9 and state['columns']==state['rows']==3
    assert stencil['scope']=='panel' and stencil['thickness']==.9 and stencil['slotWidth']==1.8
    assert stencil['rimEnabled'] and stencil['rimWidth']==1 and stencil['cornerRadius']==.6
    checks.append('requested defaults and automatic 3x3')
    page.screenshot(path=str(OUT/'default-canvas.png'),full_page=True)
    scroll=page.evaluate('''()=>{const e=document.getElementById('pattern-list'),c=e.querySelector('.pattern-card');return {client:e.clientHeight,total:e.scrollHeight,card:c.getBoundingClientRect().height,gap:parseFloat(getComputedStyle(e).rowGap)};}''')
    assert scroll['total']>scroll['client'] and abs(scroll['client']-(4*scroll['card']+3*scroll['gap']+6))<2
    checks.append('four visible design rows with internal scrolling')
    page.select_option('#size-preset','100,100')
    assert page.input_value('#panelWidth')=='100' and page.input_value('#panelHeight')=='100'
    page.fill('#panelHeight','120.5');page.press('#panelHeight','Tab')
    page.fill('#tileWidth','24');page.press('#tileWidth','Tab')
    state=page.evaluate('SashikoStudio.getState()');assert state['panelWidth']==100 and state['panelHeight']==120.5 and state['tileWidth']==24
    page.evaluate('SashikoStudio.setState({pattern:"grid",stitch:3,opening:2})')
    layout=page.evaluate('SashikoStudio.getPanelLayout()');assert layout['columns']==layout['rows']==4
    # A nested SVG must use user-space widths, not physical mm that multiply scale.
    scale=page.evaluate('''()=>{const root=document.querySelector('#sheet>svg'),child=root.querySelector('svg');return {root:root.viewBox.baseVal.width,child:child.width.baseVal.value,ratio:child.getScreenCTM().a/root.getScreenCTM().a};}''')
    assert scale['root']==100 and scale['child']==96 and abs(scale['ratio']-1)<.0001
    checks.append('presets remain editable, tile size independent, true-scale nested SVG')
    with page.expect_download() as info:page.click('#export-panel')
    info.value.save_as(OUT/'canvas.svg')
    assert 'width="100mm" height="120.5mm"' in (OUT/'canvas.svg').read_text()
    page.select_option('#size-preset','215.9,279.4')
    assert page.evaluate('SashikoStudio.buildPrint(SashikoStudio.getModel()).count')==1
    page.select_option('#size-preset','100,100')
    page.click('#export-stencil');page.wait_for_function('!SashikoStencil.isBusy()',timeout=90000)
    def type_decimal(ident,text):
        page.focus('#'+ident);page.press('#'+ident,'Control+A')
        # Deliberately pause longer than the rebuild debounce after each character.
        for c in text:page.keyboard.type(c);page.wait_for_timeout(240)
        assert page.input_value('#'+ident)==text,(ident,page.input_value('#'+ident))
        page.press('#'+ident,'Tab');page.wait_for_function('!SashikoStencil.isBusy()',timeout=90000)
    for field,value in [('thickness','1.2'),('slotWidth','1.2'),('minWeb','0.8'),('rimWidth','1.2'),('cornerRadius','0.6'),('opening','1.2')]:
        type_decimal('stencil-'+field,value)
        actual=page.evaluate('SashikoStudio.getState().opening') if field=='opening' else page.evaluate('(k)=>SashikoStencil.getSettings()[k]',field)
        assert actual==float(value),(field,actual)
    checks.append('typed decimals in all six stencil number fields, including pauses')
    report=page.evaluate('SashikoStencil.getReport()');assert report and report.get('watertight'),page.locator('#stencil-checks').inner_text()
    assert report['W']==report['H']==100 and report['thickness']==1.2 and report['layout']['rim']==1.2
    page.click('[data-stencil-view="3d"]');page.wait_for_timeout(300)
    page.screenshot(path=str(OUT/'stencil-3d.png'),full_page=True)
    page.click('[data-stencil-view="top"]')
    if page.locator('#stencil-ack-row').is_visible():page.check('#stencil-ack')
    with page.expect_download() as info:page.click('#stencil-download')
    info.value.save_as(OUT/'ui-framed.stl')
    page.select_option('#stencil-style','dots');page.wait_for_function('!SashikoStencil.isBusy()',timeout=90000)
    assert page.evaluate('SashikoStencil.getResult().watertight'),page.locator('#stencil-checks').inner_text()
    checks.append('exact-size framed STL, rounded corners, dots, actual download')
    page.select_option('#stencil-style','solid');page.wait_for_function('!SashikoStencil.isBusy()',timeout=90000)
    assert page.locator('#stencil-download').is_disabled() and 'islands' in page.locator('#stencil-checks').inner_text()
    page.evaluate('SashikoStudio.setState({pattern:"waves",tileWidth:36,panelAuto:true})')
    page.wait_for_function('!SashikoStencil.isBusy()',timeout=90000)
    assert page.evaluate('SashikoStencil.getResult().watertight'),page.locator('#stencil-checks').inner_text()
    page.screenshot(path=str(OUT/'solid-waves.png'),full_page=True)
    checks.append('solid union exports open waves and blocks loose islands')
    page.click('#stencil-close')
    page.evaluate('SashikoStudio.setState({panelWidth:10,panelHeight:10})')
    assert page.locator('#export-panel').is_disabled()
    page.click('#export-stencil');page.wait_for_function('!SashikoStencil.isBusy()')
    assert page.locator('#stencil-download').is_disabled() and 'No complete tile' in page.locator('#stencil-checks').inner_text()
    page.click('#stencil-close')
    page.select_option('#size-preset','auto')
    checks.append('zero-fit guard and return to automatic sizing')
    with page.expect_download() as info:page.click('#save-preset')
    settings=OUT/'settings-v3.json';info.value.save_as(settings);assert json.loads(settings.read_text())['version']==3
    page.click('#reset');page.set_input_files('#preset-file',str(settings));page.wait_for_function('SashikoStencil.getSettings().style==="solid"')
    assert page.evaluate('SashikoStudio.getState().panelAuto')
    # Older presets keep their original dimensions and no implicit new rim.
    page.set_input_files('#preset-file',str(ROOT/'presets/reference-library/shippo.json'))
    page.wait_for_function('SashikoStudio.getState().pattern==="shippo"')
    assert page.evaluate('SashikoStencil.getSettings().rimEnabled') is False
    assert page.evaluate('SashikoStudio.getState().panelWidth')==96
    checks.append('version 3 round-trip and version 2 compatibility')
    page.click('#reset');page.set_viewport_size({'width':390,'height':844})
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
    page.screenshot(path=str(OUT/'mobile-canvas.png'),full_page=True)
    page.click('#export-stencil');page.wait_for_function('!SashikoStencil.isBusy()')
    assert page.evaluate('document.getElementById("stencil-dialog").scrollWidth<=innerWidth')
    page.screenshot(path=str(OUT/'mobile-stencil.png'),full_page=True)
    page.click('#stencil-close');assert not page.evaluate('SashikoStencil.isBusy()')
    checks.append('mobile layout and cancellation')
    assert not errors,errors
    (OUT/'browser-report.json').write_text(json.dumps({'checks':checks,'pageErrors':errors,'offline':True},indent=2))
    print('\n'.join('PASS: '+c for c in checks));browser.close()
