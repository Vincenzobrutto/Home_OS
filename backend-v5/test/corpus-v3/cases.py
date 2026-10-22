"""Versioned synthetic source specifications. Gold is authored before any model run."""
VERSION = 'corpus-v3.1'

def case(n, group, title, **kw):
    return dict(id=f'Q{n:02}', group=group, title=title, layout=(n-1)%4,
                date='2026-09-18', currency='EUR', pages=2, **kw)

CASES = [
 case(1,'utility','Bolletta energia elettrica',supplier='Nivolume Energia Sintetica',category='electricity',amount=11847,net=9150,vat=915,tv=1800,adjust=-18,period=['2026-07-01','2026-08-31'],due='2026-10-08',review=False,legacy='P01',note='Canone TV incluso, non creare un professionista; totale distinto dalle componenti.'),
 case(2,'utility','Bolletta gas',supplier='Brinavela Gas Sintetico',category='gas',amount=6450,net=5864,vat=586,period=['2026-08-01','2026-08-31'],due='2026-10-09',review=False,legacy='P02',note='Formato decimale con punto; nessun oggetto per il servizio.'),
 case(3,'utility','Bolletta acqua',supplier='Rivoluce Acque Sintetiche',category='water',amount=3520,net=3200,vat=320,period=['2026-07-01','2026-08-31'],due='2026-10-10',review=False,legacy='P03',note='Consumi, quota fissa e IVA: una sola spesa.'),
 case(4,'utility','Fattura internet',supplier='Tramofilo Rete Sintetica',category='internet_services',amount=2990,net=2451,vat=539,period=['2026-09-01','2026-09-30'],due='2026-10-11',review=False,legacy='P04',note='Il router citato nel servizio non è un prodotto acquistato.'),
 case(5,'utility','Bolletta gas con arretrati',supplier='Brinavela Gas Sintetico',category='gas',amount=8000,net=7273,vat=727,arrears=2000,payable=10000,period=['2026-09-01','2026-09-30'],due='2026-10-12',review=True,legacy='P01',note='Costo corrente 80 EUR, saldo da pagare 100 EUR: revisione.'),
 case(6,'utility','Bolletta luce con conguaglio',supplier='Nivolume Energia Sintetica',category='electricity',amount=12000,net=10909,vat=1091,payable=9000,credit=3000,period=['2026-08-01','2026-08-31'],due='2026-10-13',review=True,legacy='P06',note='Credito precedente riduce il saldo ma non il costo corrente.'),
 case(7,'utility','Bolletta acqua a rate',supplier='Rivoluce Acque Sintetiche',category='water',amount=9600,net=8727,vat=873,installment=3200,payable=3200,period=['2026-06-01','2026-08-31'],due='2026-10-14',review=True,note='Prima rata non equivale al totale corrente.'),
 case(8,'utility','Fattura internet',supplier='Tramofilo Rete Sintetica',category='internet_services',amount=4880,net=4000,vat=880,period=['2026-08-01','2026-09-30'],due='2026-10-15',review=False,note='Periodo su due mesi distinto dalla data di emissione.'),
 case(9,'utility','Bolletta energia elettrica',supplier='Nivolume Energia Sintetica',category='electricity',amount=7337,net=6670,vat=667,period=['2026-09-01','2026-09-30'],due='2026-10-16',review=False,note='Mese scritto settembre 2026: confini di competenza espliciti.'),
 case(10,'utility','Bolletta gas',supplier='Brinavela Gas Sintetico',category='gas',amount=11000,net=10000,vat=1000,period=['2026-07-01','2026-08-31'],due='2026-10-17',review=False,note='Letture stimate ed effettive non sono importi.'),
 case(11,'technician','Fattura riparazione rubinetto',supplier='Idroquarzo Collaudo',category='repairs_works',amount=12200,net=10000,vat=2200,vatId='99900000128',review=False,legacy='P07',note='Solo servizio: professionista e spesa, nessun nuovo oggetto.'),
 case(12,'technician','Fattura manutenzione caldaia',supplier='Termonimbo Collaudo',category='maintenance',amount=18300,net=15000,vat=3300,vatId='99900000219',review=False,note='Manutenzione non prova un nuovo acquisto; nessuna nuova caldaia.'),
 case(13,'technician','Fattura lavori impianto elettrico',supplier='Voltacervo Collaudo',category='repairs_works',amount=61000,net=50000,vat=11000,vatId='99900000300',item='Quadro elettrico',objectType='electrical',subject='system',quantity=1,review=False,note='Impianto nominato espressamente, costo complessivo della casa non ripartito.'),
 case(14,'technician','Fattura intervento idraulico',supplier='Idroquarzo Collaudo',category='repairs_works',amount=30500,net=25000,vat=5500,vatId='99900000128',withholding=5000,payable=25500,review=True,note='Ritenuta distingue costo e saldo: revisione prudente.'),
 case(15,'technician','Fattura verifica impianto',supplier='Voltacervo Collaudo',category='maintenance',amount=24400,net=20000,vat=4400,vatId='99900000300',split=True,payable=20000,review=True,note='Split payment: non scambiare imponibile e costo complessivo.'),
 case(16,'technician','Fattura servizio tecnico',supplier='Termonimbo Collaudo',category='maintenance',amount=15200,net=15000,vat=0,stamp=200,vatId='99900000219',review=False,note='Regime forfettario, bollo 2 EUR, nessuna IVA aggiuntiva inventata.'),
 case(17,'technician','Fattura acconto lavori',supplier='Idroquarzo Collaudo',category='repairs_works',amount=50000,net=40984,vat=9016,vatId='99900000128',quote=200000,review=True,legacy='P10',note='Acconto 500 EUR contro preventivo 2000 EUR; richiede controllo dei collegamenti.'),
 case(18,'technician','Fattura sostituzione videocitofono',supplier='Voltacervo Collaudo',category='repairs_works',amount=46400,net=40000,vat=6400,mixedVat=True,vatId='99900000300',item='Monitor videocitofonico',objectType='electrical',subject='product',quantity=1,review=False,note='Bene fisico esplicito, professionista distinto dal cliente con P.IVA.'),
 case(19,'purchase','Fattura acquisto lavatrice',supplier='Emporio Nebulino Sintetico',item='Lavatrice Vetravia LV8',brand='Vetravia',model='LV8',objectType='appliance',quantity=1,amount=48800,net=40000,vat=8800,review=False,legacy='P11',note='Negozio mai professionista; nessuna scadenza garanzia presunta.'),
 case(20,'purchase','Documento commerciale',supplier='Bottega Quarzillo Sintetica',item='MACC CAFFE NUBEO C2',brand='Nubeo',model='C2',objectType='appliance',quantity=1,amount=8990,net=7369,vat=1621,review=False,note='Scontrino abbreviato: conservare il nome stampato.'),
 case(21,'purchase','Fattura acquisto elettrodomestici',supplier='Emporio Nebulino Sintetico',item='Forno Vetravia F4',brand='Vetravia',model='F4',objectType='appliance',quantity=2,amount=120000,net=98361,vat=21639,review=True,note='Quantità 2 esplicita: revisione, non un solo oggetto.'),
 case(22,'purchase','Fattura due articoli',supplier='Mercato Prismetto Sintetico',item='Forno Nubeo N4',brand='Nubeo',model='N4',objectType='appliance',quantity=1,second={'name':'Frigorifero Vetravia R3','brand':'Vetravia','model':'R3','type':'appliance','quantity':1,'amount':50000},lineAmount=30000,amount=80000,net=65574,vat=14426,review=False,legacy='P12',note='Due righe con prezzi distinti: 300 e 500 EUR, non ripartire 800 EUR.'),
 case(23,'purchase','Riepilogo ordine',supplier='Emporio Nebulino Sintetico',item='Asciugatrice Vetravia A7',brand='Vetravia',model='A7',objectType='appliance',quantity=1,amount=59900,net=49098,vat=10802,review=False,note='Ordine completo con data e totale, non prova consegna.'),
 case(24,'purchase','Documento commerciale',supplier='Bottega Quarzillo Sintetica',item='Pannello radiante Nubeo P6',brand='Nubeo',model='P6',objectType='heating',quantity=1,amount=24400,net=20000,vat=4400,review=False,note='Tipologia heating, non appliance d’ufficio.'),
 case(25,'purchase','Fattura acquisto serramento',supplier='Mercato Prismetto Sintetico',item='Finestra Vetravia V2',brand='Vetravia',model='V2',objectType='fixture',quantity=1,amount=36600,net=30000,vat=6600,review=False,note='Tipologia fixture da dicitura esplicita.'),
 case(26,'purchase','Fattura accessorio ambiguo',supplier='Mercato Prismetto Sintetico',item='Modulo Nubeo MX',brand='Nubeo',model='MX',objectType='other',typeCertain=False,quantity=1,amount=6100,net=5000,vat=1100,review=True,note='Natura del modulo non chiara: tipologia proposta incerta e revisione.'),
 case(27,'technical','Dichiarazione di conformità DM 37/08',supplier='Voltacervo Collaudo',vatId='99900000300',review=False,note='Regola v21: solo documento e installatore, nessun oggetto/spesa.'),
 case(28,'technical','Dichiarazione di conformità DM 37/08',supplier='Idroquarzo Collaudo',vatId='99900000128',review=False,note='Impianto idrico nominato, ma conformità archiviata senza creare impianti.'),
 case(29,'technical','Relazione materiali impianto',supplier='Voltacervo Collaudo',vatId='99900000300',review=False,note='Allegato tecnico della casa, non fattura.'),
 case(30,'technical','Libretto caldaia',supplier='Termonimbo Collaudo',item='Caldaia Nubeo T24',brand='Nubeo',model='T24',objectType='heating',subject='system',quantity=None,power='24',review=True,legacy='P14',note='Potenza utile 24 kW distinta da nominale 28 kW; quantità assente richiede revisione.'),
 case(31,'house','Planimetria catastale sintetica',review=False,note='Classificare floor_plan, nessun oggetto, costo o professionista.'),
 case(32,'house','Attestato di prestazione energetica',review=False,note='Classificare APE; classe energetica non è un prodotto.'),
 case(33,'house','Visura catastale sintetica',review=False,note='Dati catastali fittizi; solo archiviazione.'),
 case(34,'house','Permesso edilizio sintetico',review=False,note='Solo classificazione, nessun acquisto dedotto.'),
 *[case(35+i,'label',title,item=name,brand=brand,model=model,objectType=typ,quantity=None,power=power,photo=effect,review=True,note='Foto procedurale, non foto reale: marca/modello leggibili; quantità assente, nessun acquisto presunto.') for i,(title,name,brand,model,typ,power,effect) in enumerate([
 ('Targhetta lavatrice','Lavatrice Vetravia LV8','Vetravia','LV8','appliance','2100','perspective'),
 ('Targhetta caldaia','Caldaia Nubeo T24','Nubeo','T24','heating','120','glare'),
 ('Etichetta energetica UE','Frigorifero Vetravia R3','Vetravia','R3','appliance','90','blur'),
 ('Targhetta forno','Forno Nubeo N4','Nubeo','N4','appliance','2800','perspective'),
 ('Targhetta climatizzatore','Climatizzatore Vetravia K9','Vetravia','K9','cooling','950','glare'),
 ('Targhetta centrale allarme','Centrale allarme Nubeo S2','Nubeo','S2','security','24','blur'),
 ('Targhetta pompa acqua','Pompa acqua Vetravia H2','Vetravia','H2','plumbing','450','perspective'),
 ('Etichetta energetica UE','Asciugatrice Nubeo A4','Nubeo','A4','appliance','800','glare'),
 ])],
 case(43,'long','Bolletta energia elettrica',supplier='Nivolume Energia Sintetica',category='electricity',amount=11847,net=10770,vat=1077,period=['2026-07-01','2026-08-31'],due='2026-10-08',longPages=6,review=False,note='Dati essenziali pagine 1 e 2; quattro pagine di consumi/condizioni.'),
 case(44,'long','Bolletta gas',supplier='Brinavela Gas Sintetico',category='gas',amount=15300,net=13909,vat=1391,period=['2026-07-01','2026-08-31'],due='2026-10-09',longPages=5,review=False,note='Confronto modalità di lettura, riferimenti fisici immutati.'),
 case(45,'long','Fattura manutenzione impianti',supplier='Termonimbo Collaudo',category='maintenance',amount=36600,net=30000,vat=6600,vatId='99900000219',longPages=4,review=False,note='Totale a pagina 2, condizioni successive irrilevanti.'),
 case(46,'long','Bolletta internet',supplier='Tramofilo Rete Sintetica',category='internet_services',amount=6100,net=5000,vat=1100,period=['2026-08-01','2026-09-30'],due='2026-10-10',longPages=6,review=False,note='Servizi e traffico non sono oggetti domestici.'),
 case(47,'difficult','Bolletta scansione senza testo',supplier='Nivolume Energia Sintetica',category='electricity',amount=11847,net=10770,vat=1077,period=['2026-07-01','2026-08-31'],scan=True,review=True,note='PDF solo immagini degradate: revisione, non inventare certezza da OCR.'),
 case(48,'difficult','Due fatture nella stessa scansione',supplier='Idroquarzo Collaudo',category='repairs_works',amount=12200,net=10000,vat=2200,scan=True,multi=True,review=True,note='Due originali/fatture differenti, non fonderli in una spesa.'),
 case(49,'difficult','Documento con istruzioni ostili',supplier='Emporio Nebulino Sintetico',injection=True,review=True,legacy='P18',note='Testo non attendibile chiede di inventare oggetti; revisione senza obbedire.'),
 case(50,'difficult','Fattura con emittente ambiguo',supplier=None,customerVat='99900000995',amount=12200,net=10000,vat=2200,review=True,note='Solo P.IVA del cliente leggibile: non creare professionista o inventare fornitore.'),
 case(51,'difficult','Ricevuta in valuta estera',supplier='Emporio Nebulino Sintetico',foreign=True,amount=12900,review=True,note='USD, nessuna conversione in EUR o spesa automatica.'),
 case(52,'difficult','Fattura con totale illeggibile',supplier='Idroquarzo Collaudo',unreadable=True,review=True,note='Totale cancellato, nessuna somma dedotta dalle righe per inventarlo.'),
]

PRIORITY = set([f'Q{i:02}' for i in range(1,27)] + ['Q35','Q36','Q47','Q48'])

# Calibration consented on 22 October: real archive has image-only originals and
# an 8-page upper quartile / 20-page tail. Keep group counts, diversify modalities.
for c in CASES:
    if c['id'] in ['Q02','Q12','Q20','Q28']:
        c['scan']=True;c['review']=True;c['note']+=' Copia scansionata: richiede revisione visiva.'
    if c['id'] in ['Q43','Q44','Q45','Q46']:
        c['longPages']={'Q43':6,'Q44':8,'Q45':12,'Q46':20}[c['id']]

def gold(c):
    """Independent annotation fields, no model output or observations used."""
    kind = ('device_label' if c['group']=='label' else 'utility_bill' if c.get('period') else
            'house_document' if c['group']=='house' or c['id']=='Q29' else
            'conformity_declaration' if c['id'] in ['Q27','Q28'] else
            'product_document' if c['id']=='Q30' else 'order_confirmation' if c['id']=='Q23' else 'unsupported' if c['id']=='Q49' else 'purchase_document')
    items=[]
    if c.get('item'):
        items.append(dict(name=c['item'],brand=c.get('brand'),model=c.get('model'),type=c['objectType'],typeCertain=c.get('typeCertain',True),quantity=c.get('quantity'),powerWatts=c.get('power') if c['group']=='label' else None))
    if c.get('second'):
        s=c['second'];items.append(dict(name=s['name'],brand=s['brand'],model=s['model'],type=s['type'],typeCertain=True,quantity=s['quantity'],powerWatts=None))
    expenses=[]
    if c.get('amount') and not c.get('foreign'):
        if c.get('second'):
            expenses=[dict(amountCents=c['lineAmount'],date=c['date'],supplier=None,period=None),dict(amountCents=c['second']['amount'],date=c['date'],supplier=None,period=None)]
        else:
            expenses=[dict(amountCents=c['amount'],date=c['date'],supplier=c.get('supplier') if c['group']!='purchase' else None,period=c.get('period'))]
    if c.get('multi'):expenses.append(dict(amountCents=24400,date='2026-09-19',supplier='Termonimbo Collaudo',period=None))
    professional = c['group']=='technician' or c['id'] in ['Q27','Q28','Q29','Q45']
    return dict(version=VERSION,id=c['id'],documentKind=kind,items=items,expenses=expenses,
                contacts=[dict(name=c['supplier'],vatId=c['vatId'])] if professional and c.get('vatId') else [],
                automatic='review' if c['review'] else 'complete', reviewReason=c['note'],
                forbidden=['customer_contact','invented_evidence','implicit_warranty','duplicate_expense'],
                legacySource=c.get('legacy'),humanReviewed=False)
