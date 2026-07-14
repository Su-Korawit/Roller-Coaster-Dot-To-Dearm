// src/components/admin/FarmDataSection.jsx
import { useState } from 'react'
import FarmShopsTab from './FarmShopsTab'
import FarmItemsTab from './FarmItemsTab'
import FarmPlantsTab from './FarmPlantsTab'

const TABS = [
  { id: 'shops',  label: '🏪 Shops'  },
  { id: 'items',  label: '📦 Items'  },
  { id: 'plants', label: '🌱 Plants' },
]

export default function FarmDataSection() {
  const [tab, setTab] = useState('shops')
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Farm Data</h2>
        <p className="text-sm text-gray-500 mt-0.5">จัดการพืช ไอเทม และร้านค้าในเกม</p>
      </div>
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto no-scrollbar">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-shrink-0 whitespace-nowrap px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.id
                ? 'border-brand text-brand'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'shops'  && <FarmShopsTab />}
      {tab === 'items'  && <FarmItemsTab />}
      {tab === 'plants' && <FarmPlantsTab />}
    </div>
  )
}
