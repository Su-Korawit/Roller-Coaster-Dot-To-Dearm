// The room a new account starts with: what claimWelcomePack writes on the server, and what
// guests (no account, no callables) see. A test keeps it identical to
// functions/roomLogic.js STARTER_LAYOUT. Positions are px (multiples of 8); the lamp sits in
// the desk's left slot, so its x/y are the desk's.
export const STARTER_LAYOUT = {
  tier: 0,
  theme: 'minimal',
  petId: null,
  placed: [
    { itemId: 'bed_basic', x: 16, y: 16 },
    { itemId: 'desk_basic', x: 96, y: 32 },
    { itemId: 'chair_basic', x: 104, y: 48 },
    { itemId: 'lamp_desk', x: 96, y: 32, slot: 'left' },
    { itemId: 'bookshelf_basic', x: 144, y: 32 },
    { itemId: 'rug_round', x: 64, y: 80 },
  ],
}
