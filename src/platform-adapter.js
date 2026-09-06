/** Platform boundary for a future server-side integration. Manual mode never handles credentials. */
export class DraftPlatformAdapter {
  async getLeague() { throw new Error("Platform adapter not configured"); }
  async getDraftPicks() { throw new Error("Platform adapter not configured"); }
}

export class ManualDraftAdapter extends DraftPlatformAdapter {
  constructor(ledger) { super(); this.ledger = ledger; }
  async getDraftPicks() { return this.ledger.picks; }
}
