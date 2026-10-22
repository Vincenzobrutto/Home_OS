"""Independent source/gold arithmetic and rendered-content audit, no model output."""
import json,hashlib,re,sys
from pathlib import Path
from pypdf import PdfReader
from PIL import Image
from cases import CASES,gold

ROOT=Path(__file__).resolve().parent
def normalized(s):return re.sub(r'\s+',' ',s).strip()
def run():
    manifest=json.loads((ROOT/'manifest.json').read_text());specs={c['id']:c for c in CASES};rows=[]
    for e in manifest['cases']:
        c=specs[e['id']];g=json.loads((ROOT/e['gold']).read_text());path=ROOT/e['path']
        assert hashlib.sha256(path.read_bytes()).hexdigest()==e['sha256']==g['sourceSha256'],e['id']+' hash'
        assert g['id']==e['id'] and g['version']==manifest['goldVersion']
        assert (g['automatic']=='review')==c['review']
        if c.get('net') is not None:
            # Explicit totals only: do not derive the expected value from the displayed total.
            summed=c['net']+c.get('vat',0)+c.get('stamp',0)+c.get('tv',0)+c.get('adjust',0)
            assert summed==c['amount'],e['id']+' independently summed components'
        if c.get('second'):assert c['lineAmount']+c['second']['amount']==c['amount']
        if c.get('arrears'):assert c['amount']+c['arrears']==c['payable']
        if c.get('credit'):assert c['amount']-c['credit']==c['payable']
        if c.get('withholding'):assert c['amount']-c['withholding']==c['payable']
        if c.get('mixedVat'):assert 20000*.1+20000*.22==c['vat']
        for v in [c.get('vatId'),c.get('customerVat')]:
            if v:
                digits=[int(d) for d in v];s=sum(digits[i] if i%2==0 else (digits[i]*2 if digits[i]*2<10 else digits[i]*2-9) for i in range(10))
                assert (10-s%10)%10==digits[10],e['id']+' VAT checksum'
        if e['sourceMode']=='text':
            pages=[p.extract_text() or '' for p in PdfReader(path).pages];text=normalized('\n'.join(pages))
            assert len(pages)==e['pages']
            for item in g['items']:
                for key in ['name','brand','model']:
                    if item.get(key):assert normalized(item[key]) in text,e['id']+' '+key
            for contact in g['contacts']:
                assert normalized(contact['name']) in text and contact['vatId'] in text
            if c.get('supplier'):assert normalized(c['supplier']) in text
            if c.get('amount') and not c.get('unreadable'):
                numeric=f'{c["amount"]/100:,.2f}'.replace(',','X').replace('.',',').replace('X','.')
                assert numeric in text or f'{c["amount"]/100:.2f}' in text,e['id']+' amount'
            for d in c.get('period',[]):assert d in text,e['id']+' period'
        elif e['sourceMode']=='visual_pdf':
            assert not any((p.extract_text() or '').strip() for p in PdfReader(path).pages),e['id']+' unexpected text layer'
        else:
            with Image.open(path) as im:assert im.width>=1000 and im.height>=650
        rows.append(dict(id=e['id'],arithmetic='pass',sourceMode=e['sourceMode'],expected=g['automatic'],note=g['reviewReason']))
    target=ROOT/'.build'/'source-gold-audit.json';target.write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(f'{len(rows)} source/gold audits passed. Human visual review remains separate.')
if __name__=='__main__':run()
