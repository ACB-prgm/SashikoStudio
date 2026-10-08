"""Offline browser + geometry smoke/regression tests for the uploaded references.
Writes vector previews, sampled authoring graphs and STL engine inputs for review.
Requires the same optional Playwright dependency as test_browser.py.
"""
from pathlib import Path
import json, os, shutil, time
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'test-results'/'references';OUT.mkdir(parents=True,exist_ok=True)
EXPECTED=['shippo','asanoha','hanaguruma','yoshiwara-tsunagi','kasane-rindou','kamon','tsubomi','nowaki','sayagata','seigaiha','juuji','fundou-tsunagi','yabane','chidori-tsunagi','hishi-seigaiha','kaki-no-hana']
errors=[]
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'),headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
    page=browser.new_page(viewport={'width':1440,'height':1000})
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.context.set_offline(True)
    page.set_content((ROOT/'index.html').read_text(),wait_until='load')
    page.wait_for_function('window.SashikoStudio && window.SashikoStencil')
    registered=page.evaluate('Object.keys(SashikoStudio.patterns)')
    assert set(EXPECTED)<=set(registered),registered
    assert page.locator('[data-pattern]').count()==len(registered)
    reports=[]
    for name in EXPECTED:
        result=page.evaluate('''(name)=>{
            const S=SashikoStudio, start=performance.now();
            S.setState({...S.defaults,pattern:name,columns:2,rows:2,view:'tile'});
            const m=S.getModel(); if(!m)throw new Error(name+' did not build');
            let input=null,inputError=null;
            try{input=SashikoStencil.makeInput(m,SashikoStencil.defaults);}catch(e){inputError=e.message;}
            const graph=m.edges.map(e=>({route:e.route,p0:e.p0,p1:e.p1,points:Array.from({length:Math.max(2,Math.ceil(e.L/.12)+1)},(_,i)=>e.at(e.L*i/(Math.max(2,Math.ceil(e.L/.12)+1)-1)))}));
            const matrix=[];
            for(const tileWidth of [24,48,96])for(const stitch of [1.5,2,3])for(const opening of [.5,1,2]){
                const n=S.buildModel({...S.defaults,pattern:name,tileWidth,stitch,opening});
                if(!Number.isFinite(n.min)||!n.dashes.length)throw new Error(name+' invalid stitch geometry');
                for(const e of n.edges)if(!Number.isFinite(e.L)||e.L<=0)throw new Error(name+' invalid path length');
                matrix.push({tileWidth,stitch,opening,skipped:n.skipped,omitted:n.omitted});
            }
            return {name,W:m.W,H:m.H,edges:m.edges.length,dashes:m.dashes.length,min:m.min,max:m.max,skipped:m.skipped,omitted:m.omitted,warnings:m.warnings,input,inputError,graph,matrix,ms:performance.now()-start,
                geometry:S.svgFor(m,3,3,{mode:'geometry'}),stitches:S.svgFor(m,3,3,{mode:'stitches'})};
        }''',name)
        for mode in ('geometry','stitches'):(OUT/f'{name}-{mode}.svg').write_text(result.pop(mode))
        (OUT/f'{name}-graph.json').write_text(json.dumps({'W':result['W'],'H':result['H'],'edges':result.pop('graph')}))
        if result['input']:(OUT/f'{name}-input.json').write_text(json.dumps(result['input']))
        result.pop('input')
        preset=json.loads((ROOT/'presets'/'reference-library'/f'{name}.json').read_text())
        assert preset['stencil']['scope']=='repeat'
        page.set_input_files('#preset-file',str(ROOT/'presets'/'reference-library'/f'{name}.json'))
        page.wait_for_function('(name)=>SashikoStudio.getState().pattern===name',arg=name)
        assert page.evaluate('SashikoStencil.getSettings().scope')=='repeat'
        checked=page.evaluate('''preset=>{
            const m=SashikoStudio.buildModel(preset.settings);
            if(m.skipped||m.omitted)throw new Error('Verified preset drops an interval: '+preset.settings.pattern);
            return {input:SashikoStencil.makeInput(m,preset.stencil),settings:m.s,skipped:m.skipped,omitted:m.omitted,warnings:m.warnings};
        }''',preset)
        (OUT/f'{name}-verified-input.json').write_text(json.dumps(checked.pop('input')))
        result['meshExample']=checked
        reports.append(result)
        print(name, 'edges',result['edges'],'stitches',result['dashes'],'skipped',result['skipped'], 'inputError',result['inputError'],round(result['ms']),flush=True)
    page.evaluate('SashikoStudio.setState({pattern:"shippo",view:"panel",columns:3,rows:3})')
    page.screenshot(path=str(OUT/'desktop.png'),full_page=True)
    page.set_viewport_size({'width':390,'height':844})
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+1')
    page.screenshot(path=str(OUT/'mobile.png'),full_page=True)
    assert not errors,errors
    (OUT/'browser.json').write_text(json.dumps({'patterns':reports,'pageErrors':errors,'registered':registered},indent=2))
    browser.close()
