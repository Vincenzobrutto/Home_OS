# Laboratorio locale delle soglie

Prototipo di verifica, distinto dal workspace di produzione: selezione di candidati geometrici, correzione degli estremi e segmentazione di una copia temporanea. Nessun salvataggio nella pratica, API, login, chiamata AI o riconoscimento automatico di frecce. Dati originali e manifest privati non vanno committati.

Dalla root del repository, con le dipendenze frontend già disponibili:

```powershell
node backend-v5/tools/agency-threshold-lab/build.cjs C:/percorso/cases.private.json C:/percorso/laboratorio.html
```

Il manifest contiene1–5casi con label, image (dataURI PNG/JPEG), proposal {spaces,symbols}, config (RasterConfig). Un caso sintetico può fornire synthetic:true e opening (OpeningObservation); gli altri usano il rilevatore geometrico entro il campo dei seed/contorni. Le immagini devono rispettare i limiti Raster del modulo. Il builder usa esbuild già presente nelle dipendenze frontend, senza installazioni. L'HTML risultante è autosufficiente e contiene gli originali: gestirlo come documento privato.

Le proposte non sono porte già riconosciute. Selezione esplicita, massimo30soglie per anteprima; ogni modifica deseleziona la soglia. I ruoli ingresso/porta interna richiedono evidenze e contesto in OpeningObservation; il rilevatore locale propone soltanto aperture non classificate. Non scegliere una variante dal numero di contorni recuperati. Nessuna proprietà, superficie, conformità o coefficiente assegnati automaticamente.

In produzione servono ancora integrazione con fonte/versione/SHA e CAS, persistenza delle decisioni e riesecuzione nel worker; il laboratorio non sostituisce quei contratti. Su immagini grandi la scansione gira sul thread UI e può bloccarlo per alcuni secondi: worker e collaudo mobile restano da completare.

Un caso può includere surfacePreview: pacchetto precomputato preview_only, confirmed:false, totalM2:null con regioni valide non sovrapposte. Il pulsante dedicato dichiara la revisione tecnica: nessun riconoscimento autonomo/salvataggio. surfacePreviewThresholds lega le soglie alle coordinate osservate, evitando ordinali instabili. Originali e geometrie private fuori Git.
