// Client side of the Study Room economy. Thin wrappers over the Functions-owned
// callables: the server decides prices, balances and what a saved layout may contain.
import { getFunctions, httpsCallable } from 'firebase/functions'

const call = async (name, data) => (await httpsCallable(getFunctions(), name)(data)).data

export const buyRoomItem = (itemId) => call('buyRoomItem', { itemId })
export const claimWelcomePack = () => call('claimWelcomePack')
export const saveRoomLayout = (layout) => call('saveRoomLayout', { layout })
