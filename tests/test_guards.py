from pathlib import Path
from playwright.sync_api import sync_playwright
import json,os,shutil
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'test-results'
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'),headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':1440,'height':1050},accept_downloads=True);page.context.set_offline(True);errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.set_content((ROOT/'index.html').read_text())
 page.evaluate('SashikoStudio.setState({weight:.35,columns:4,rows:6});SashikoStencil.setSettings({scope:"repeat",thickness:1.4,slotWidth:.9,rimEnabled:false})')
 page.click('#export-stencil');page.wait_for_function('!SashikoStencil.isBusy()')
 assert page.locator('#stencil-download').is_disabled()
 page.check('#stencil-ack');assert page.locator('#stencil-download').is_enabled()
 page.fill('#stencil-slotWidth','2.8');page.press('#stencil-slotWidth','Tab');page.wait_for_function('!SashikoStencil.isBusy()')
 assert page.locator('#stencil-download').is_disabled();assert 'not longer' in page.locator('#stencil-checks').inner_text()
 page.fill('#stencil-slotWidth','0.9');page.press('#stencil-slotWidth','Tab');page.wait_for_function('!SashikoStencil.isBusy()')
 page.fill('#stencil-opening','2');page.press('#stencil-opening','Tab');page.wait_for_function('!SashikoStencil.isBusy()')
 assert page.evaluate('SashikoStudio.getState().opening')==2
 assert page.evaluate('SashikoStencil.getResult().spacing.minWeb')>.95
 page.evaluate('SashikoStudio.setState({columns:4,rows:6})')
 page.select_option('#stencil-scope','panel');page.wait_for_function('!SashikoStencil.isBusy()',timeout=30000)
 r=page.evaluate('SashikoStencil.getReport()');assert r['watertight'] and r['W']==192
 page.click('#stencil-close')
 with page.expect_download() as dl:page.click('#export-tile')
 dl.value.save_as(OUT/'regression-export.svg');assert '<svg' in (OUT/'regression-export.svg').read_text()
 assert page.evaluate('SashikoStudio.buildPrint(SashikoStudio.getModel()).count')>=1
 # Version 1 settings are accepted and new stencil fields use defaults.
 old={'app':'Sashiko Pattern Studio','version':1,'settings':{'pattern':'waves','tileWidth':36,'stitch':1.8}}
 oldfile=OUT/'legacy-v1.json';oldfile.write_text(json.dumps(old));page.set_input_files('#preset-file',str(oldfile));page.wait_for_function('SashikoStudio.getState().pattern==="waves"')
 assert page.evaluate('SashikoStencil.getSettings().slotWidth')==.9
 # New JSON presets round-trip both sets of controls.
 page.evaluate('SashikoStencil.setSettings({slotWidth:.75,thickness:.8,minWeb:1.1,scope:"panel"})')
 with page.expect_download() as dl:page.click('#save-preset')
 newfile=OUT/'roundtrip-v2.json';dl.value.save_as(newfile)
 page.click('#reset');page.set_input_files('#preset-file',str(newfile));page.wait_for_function('SashikoStencil.getSettings().slotWidth===.75')
 assert page.evaluate('SashikoStencil.getSettings().thickness')==.8
 # Closing a pending export cancels rather than leaving a stale download.
 page.click('#export-stencil');page.click('#stencil-close');assert not page.evaluate('SashikoStencil.isBusy()')
 assert not errors,errors
 (OUT/'ui-guards.json').write_text(json.dumps({'offline':True,'warningsGateDownload':True,'tooWideSlotsBlocked':True,'linkedJunctionControl':True,'fullPanelWorker':True,'svgAndPrintRegression':True,'legacyPreset':True,'v2PresetRoundtrip':True,'cancelBuild':True,'jsErrors':errors},indent=2))
 print('PASS: offline UI, export guards, linked pattern settings, panel export, old/new presets, SVG/print regression and cancellation')
 b.close()
