"""Only aggregate numeric structure leaves this process; no extracted text or paths."""
import sys,json,re,statistics
from pathlib import Path
from PIL import Image
from pypdf import PdfReader

def measure(path):
    if path.stat().st_size>20*1024*1024:raise ValueError('size')
    if path.read_bytes()[:4]==b'%PDF':
        doc=PdfReader(path);texts=[p.extract_text() or '' for p in doc.pages]
        # Count image XObjects without copying or exporting their bytes.
        images=0
        for p in doc.pages:
            resources=p.get('/Resources',{});resources=resources.get_object() if hasattr(resources,'get_object') else resources
            xo=resources.get('/XObject',{});xo=xo.get_object() if hasattr(xo,'get_object') else xo
            images+=sum(1 for x in xo.values() if x.get_object().get('/Subtype')=='/Image')
        text='\n'.join(texts)
        return dict(pages=len(texts),charsPerPage=round(len(text)/max(1,len(texts))),digits=len(re.findall(r'\d',text)),dates=len(re.findall(r'\b(?:\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}|\d{4}-\d{2}-\d{2})\b',text)),hasImages=int(images>0),imageOnly=int(not text.strip()),bytes=path.stat().st_size)
    with Image.open(path) as im:return dict(pages=1,charsPerPage=0,digits=0,dates=0,hasImages=1,imageOnly=1,bytes=path.stat().st_size)

def aggregate(rows):
    result={}
    for key in ['pages','charsPerPage','digits','dates','hasImages','imageOnly','bytes']:
        a=sorted(r[key] for r in rows)
        result[key]=dict(min=min(a),p25=a[int((len(a)-1)*.25)],median=statistics.median(a),p75=a[int((len(a)-1)*.75)],max=max(a)) if a else None
    return result

if __name__=='__main__':
    paths=json.load(sys.stdin);rows=[];missing=0;unreadable=0
    for p in paths:
        try:
            path=Path(p)
            if not path.is_file() or path.is_symlink():missing+=1;continue
            rows.append(measure(path))
        except Exception:unreadable+=1
    print(json.dumps(dict(format='aggregate-structure-v1',documents=len(rows),missing=missing,unreadable=unreadable,metrics=aggregate(rows))))
