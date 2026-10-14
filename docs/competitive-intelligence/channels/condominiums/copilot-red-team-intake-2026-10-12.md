# Canale amministratori — Red team Copilot intake
**Data:** 2026-10-12
**Fonte originale:** PDF ricevuto in conversazione, `red_team_indipendente_canale_amministratori_condominio_dimora_homeos_20261012_101708.pdf` (21 pagine).
**Stato:** documento esterno, report integrale non ancora incluso in questo repository; nessuna decisione di roadmap o business model approvata.

## Delta rispetto al primo dossier
| Ipotesi | Primo dossier | Red Team |
|---|---|---|
| Building Events → Property Timeline | GO condizionato a pilot (24/30 analitico) | TEST debole; NO GO a investimento completo |
| Owner-driven handover cambio proprietà | Da testare (22/30) | TEST prioritario (non GO) |
| Anagrafe come onboarding | Acquisizione possibile (19/30) | NO GO come wedge autonoma |

## Motivi critici
- Danea Domustudio e Multidomus dispongono già di workflows e cronologie; Condeo dichiara esplicitamente diario eventi condominiale; presentazione della Property Timeline facilmente replicabile.
- Gli incumbent controllano record, API, integrazioni e rapporti con amministratori. Non è dimostrato un accesso completo agli eventi tramite API pubbliche.
- Il valore owner è distante dall'incentivo economico dell'amministratore; nessuna WTP/cooperation misurata.
- Il report cita pricing Multidomus `€2/unità/anno` per modulo standard, indicatore di concorrenza forte, non proof della WTP per Dimora.
- GDPR, finalità, diritti di accesso ≠ riutilizzo illimitato; evitare morosità, dati sanitari, litigiosità o altre info private nella timeline.
- Handover richiede owner consent/selection, documenti minimizzati, prova titolo, nuovo account acquirente, legal review.

## Test proposti dall'autore (soglie di ipotesi, non standard validati)
- **Handover:** 10 compravendite, ≥3 amministratori e ≥2 gestionali; venditore seleziona 8–12 documenti; 7/10 pacchetti conclusi; ≤30 minuti aggiuntivi per studio; ≥6/10 buyer attivi; ≥4/10 transazioni con pagamento reale; nessun eccesso privacy; ≥3/10 property aggiornate entro 60 giorni.
- **Building Events shadow-only:** 2 condomìni e 20 attività chiuse offline, senza sviluppo; stop se <50% sono eventi pertinenti alla singola unità o convalida >2 minuti/evento.

## Limiti e conflitti da riconciliare
- Lo stesso handover entra nell'area transaction readiness, scartata come wedge prioritaria da ADR #77 del 2026-09-16. La ricerca non cambia automaticamente quella decisione.
- Il documento cita novità ottobre 2026 (MioCondominio / Multidomus) e pricing specifico: verificarle indipendentemente prima del dossier consolidato.
- Il verdetto non dimostra che l'handover sia difendibile rispetto a ImmoDoc, Faloosa e altri: confrontare con il red team Agenzie ancora atteso.

## Azione suggerita
Declassare **come raccomandazione analitica** il canale amministratori da primary wedge a futura partnership / fonte dati; decisione umana richiesta. Nessuna implementazione di Dimora Admin o connettore pesante. Portare al consolidamento A2 solo dopo verifica challenge Agenzie.

**Stato della roadmap:** invariato.
