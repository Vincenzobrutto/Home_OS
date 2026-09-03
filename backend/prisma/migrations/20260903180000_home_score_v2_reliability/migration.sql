-- B44: Home Score v2 sostituisce la dimensione "Efficienza" con
-- "Affidabilità del record" (vedi common/home-score.ts, decisions.md).
-- Rename della colonna, non drop+add: le 12 righe storiche esistenti
-- mantengono il loro valore v1 (Efficienza) nella stessa colonna, che dalla
-- prossima riga in poi (calculationVersion 'v2') significa Affidabilità del
-- record — la discontinuità è già gestita da ScoreTrend quando lo storico
-- attraversa più calculationVersion diverse.
ALTER TABLE "score_snapshots" RENAME COLUMN "efficiency_score" TO "reliability_score";
