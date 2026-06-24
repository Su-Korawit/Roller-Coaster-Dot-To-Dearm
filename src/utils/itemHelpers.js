export const getItemAbbr = (itemId) => {
  const map = {
    turnip_seed: 'TP🌱',
    carrot_seed: 'CR🌱',
    potato_seed: 'PT🌱',
    pumpkin_seed: 'PK🌱',
    turnip: 'TP',
    carrot: 'CR',
    potato: 'PT',
    pumpkin: 'PK',
  }
  return map[itemId] ?? '?'
}

export const getItemColor = (itemId) => {
  if (itemId?.includes('seed')) return '#a8e6a3'
  return '#f5c542'
}
