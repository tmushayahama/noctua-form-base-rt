import { camStencil } from '../data/stencilData'
import type { ActivityType } from '@/features/gocam/models/cam'
import type { StencilItemNode } from '../data/stencilData'
import CategoryIcon from '@mui/icons-material/Category'
import HubIcon from '@mui/icons-material/Hub'
import ScienceIcon from '@mui/icons-material/Science'
import { ActivityType as AT } from '@/features/gocam/models/cam'

function stencilIcon(type: ActivityType) {
  switch (type) {
    case AT.PROTEIN_COMPLEX:
      return <HubIcon className="text-purple-600" />
    case AT.MOLECULE:
      return <ScienceIcon className="text-amber-700" />
    default:
      return <CategoryIcon className="text-green-600" />
  }
}

interface StencilPaletteProps {
  onDrop: (type: ActivityType, x: number, y: number) => void
}

export default function StencilPalette({ onDrop: _onDrop }: StencilPaletteProps) {
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, node: StencilItemNode) => {
    e.dataTransfer.setData(
      'application/noctua-stencil',
      JSON.stringify({ type: node.type, id: node.id })
    )
    e.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center border-b border-gray-300 bg-gray-100 px-4 py-2">
        <span className="text-xs font-bold uppercase tracking-wide text-gray-600">Toolbox</span>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {camStencil.map(group => (
          <div key={group.id}>
            {group.nodes.map(node => (
              <div
                key={node.id}
                draggable
                onDragStart={e => handleDragStart(e, node)}
                className="mb-2 flex cursor-grab items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing"
                title={node.description}
              >
                {stencilIcon(node.type)}
                <div className="flex flex-col">
                  <span className="text-xs font-semibold">{node.label}</span>
                  <span className="text-2xs text-gray-500">
                    {node.description.length > 80
                      ? node.description.slice(0, 80) + '...'
                      : node.description}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
