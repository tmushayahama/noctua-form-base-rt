import { camStencil } from '../data/stencilData'
import type { StencilItemNode } from '../data/stencilData'

export default function StencilPalette() {
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, node: StencilItemNode) => {
    e.dataTransfer.setData(
      'application/noctua-stencil',
      JSON.stringify({ type: node.type, id: node.id })
    )
    e.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <div className="flex h-full w-[100px] shrink-0 flex-col border-r border-[#002255] bg-white">
      <div className="flex items-center border-b border-gray-300 bg-gray-100 px-2 py-2">
        <span className="text-2xs font-bold uppercase tracking-wide text-gray-600">Toolbox</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {camStencil.map(group => (
          <div key={group.id}>
            {group.nodes.map(node => (
              <div
                key={node.id}
                draggable
                onDragStart={e => handleDragStart(e, node)}
                className="flex cursor-grab flex-col items-center border-b border-gray-200 bg-white px-1 py-2 hover:bg-gray-50 active:cursor-grabbing"
                title={node.description}
              >
                <img
                  src={node.iconUrl}
                  alt={node.label}
                  className="h-[50px] w-full object-contain"
                  draggable={false}
                />
                <span className="mt-1 text-center text-[8px] font-medium leading-tight">
                  {node.label}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
