// Token DI per HouseScanProvider: GenesisService dipende dall'interfaccia,
// mai direttamente da MockHouseScanProvider — sostituire il mock con un
// provider reale in futuro significa cambiare solo il binding in
// genesis.module.ts, non il servizio che lo usa.
export const HOUSE_SCAN_PROVIDER = Symbol('HOUSE_SCAN_PROVIDER');
