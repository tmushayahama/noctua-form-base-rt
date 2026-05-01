import { FaSitemap, FaLink, FaTimes, FaEyeSlash, FaBan } from 'react-icons/fa'
import type { GraphModel, CamError, GraphNode, Edge } from '../models/cam'
import { ErrorType } from '../models/cam'
import { useAppDispatch } from '@/app/hooks'
import { setRightDrawerOpen } from '@/@noctua.core/components/drawer/drawerSlice'
import { Button } from '@mantine/core'

interface CamErrorsProps {
  model: GraphModel
}

function RelationViz({ error }: { error: CamError }) {
  return (
    <div className="mt-4 border-t border-slate-300 pt-4">
      <div className="flex items-center gap-4 rounded-md bg-gray-100 p-4">
        <div className="min-w-[80px] rounded-md bg-blue-700 px-4 py-2 text-center text-sm font-medium text-white">
          {error.meta?.subjectNode?.label}
        </div>
        <div className="flex flex-1 items-center justify-center">
          <span className="whitespace-nowrap rounded-full bg-slate-400 px-3 py-1.5 text-xs font-medium text-white">
            {error.meta?.edge?.label}
          </span>
        </div>
        <div className="min-w-[80px] rounded-md bg-blue-700 px-4 py-2 text-center text-sm font-medium text-white">
          {error.meta?.objectNode?.label}
        </div>
      </div>
    </div>
  )
}

function CardinalityViz({ error }: { error: CamError }) {
  return (
    <div className="mt-4 border-t border-slate-300 pt-4">
      <div className="flex items-center gap-4 rounded-md border border-amber-700/30 bg-amber-700/5 p-4">
        <div className="min-w-[80px] rounded-md bg-amber-500 px-4 py-2 text-center text-sm font-medium text-white">
          {error.meta?.subjectNode?.label}
        </div>
        <div className="flex flex-1 items-center justify-center">
          <span className="whitespace-nowrap rounded-full bg-amber-700 px-3 py-1.5 text-xs font-medium text-white">
            {error.meta?.edge?.label}
          </span>
        </div>
      </div>
    </div>
  )
}

function NodeItem({ node }: { node: GraphNode }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-slate-300 bg-gray-50 p-3 hover:border-slate-400 hover:bg-white">
      <div className="min-w-[40px] rounded-sm bg-blue-700 px-2 py-1" />
      <div className="flex-1">
        <div className="text-sm font-semibold">{node.label}</div>
        <div className="font-mono text-xs text-gray-500">{node.id}</div>
      </div>
    </div>
  )
}

function EdgeItem({ edge }: { edge: Edge }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-slate-300 bg-gray-50 p-3 hover:border-slate-400 hover:bg-white">
      <span className="min-w-[24px] rounded-sm bg-slate-400 px-2 py-1 text-center text-xs font-semibold text-white">
        &rarr;
      </span>
      <div className="flex-1 font-mono text-sm text-gray-500">
        {edge.source?.label ?? edge.sourceId}
        {' —— '}
        {edge.label}
        {' ——> '}
        {edge.target?.label ?? edge.targetId}
      </div>
    </div>
  )
}

const CamErrors: React.FC<CamErrorsProps> = ({ model }) => {
  const dispatch = useAppDispatch()
  const {
    shexViolations: violations,
    orphanedNodes: diffNodes,
    orphanedEdges: diffEdges,
    standaloneNodes,
    relationNodes,
  } = model.validationErrors

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex h-10 shrink-0 items-center justify-between bg-white px-6 shadow-sm">
        <span className="text-base font-semibold text-slate-800">Validation Errors</span>
        <Button
          variant="outline"
          size="xs"
          onClick={() => dispatch(setRightDrawerOpen(false))}
          leftSection={<FaTimes size={10} />}
          className="!min-h-[26px] !text-xs !normal-case !text-[#3b5998] !border-gray-300 hover:!border-[#3b5998]"
        >
          Close
        </Button>
      </div>

      <div className="flex shrink-0 gap-4 border-b border-slate-300 bg-white px-6 py-4">
        <div className="min-w-[100px] rounded-md border border-red-700 bg-red-700/10 p-3 text-center text-red-700">
          <div className="text-2xl font-bold leading-none">{violations.length}</div>
          <div className="mt-1 text-xs opacity-80">Data model violation errors (ShEx)</div>
        </div>
        <div className="min-w-[100px] rounded-md border border-blue-700 bg-blue-700/10 p-3 text-center text-blue-700">
          <div className="text-2xl font-bold leading-none">{diffNodes.length}</div>
          <div className="mt-1 text-xs opacity-80">Activity Units / Chemicals errors</div>
        </div>
        <div className="min-w-[100px] rounded-md border border-amber-700 bg-amber-700/10 p-3 text-center text-amber-700">
          <div className="text-2xl font-bold leading-none">{diffEdges.length}</div>
          <div className="mt-1 text-xs opacity-80">Relations errors</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {violations.length > 0 && (
          <div className="p-6">
            <div className="flex flex-col gap-4">
              {violations.map((error, i) => (
                <div
                  key={i}
                  className="rounded-md border-l-4 border-l-red-700 bg-white p-4 shadow-[0_1px_3px_rgba(59,89,152,0.12)] hover:shadow-[0_4px_8px_rgba(0,0,0,0.16)]"
                >
                  <div className="mb-3 flex items-start gap-4">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-700 text-sm font-semibold text-white">
                      {i + 1}
                    </div>
                    <div className="text-base text-slate-800">{error.message}</div>
                  </div>
                  {error.type === ErrorType.RELATION && <RelationViz error={error} />}
                  {error.type === ErrorType.CARDINALITY && <CardinalityViz error={error} />}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-slate-300 bg-white">
          <div className="border-b border-slate-300 p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-700 text-white">
                <FaSitemap size={14} />
              </div>
              <h3 className="m-0 text-lg font-semibold">Activity Units / Chemicals errors</h3>
              <span className="rounded-xl bg-slate-200 px-2 py-0.5 text-xs font-semibold text-blue-700">
                {diffNodes.length}
              </span>
            </div>

            {standaloneNodes.length > 0 && (
              <div className="mt-3 rounded-md border border-slate-300 bg-slate-50 p-3">
                <div className="mb-2.5 flex items-center gap-2">
                  <FaEyeSlash size={16} className="text-slate-400" />
                  <h4 className="m-0 text-[13px] font-semibold text-slate-800">Node not shown</h4>
                  <span className="rounded-xl bg-slate-200 px-2 py-0.5 text-xs font-semibold text-blue-700">
                    {standaloneNodes.length}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {standaloneNodes.map(node => (
                    <NodeItem key={node.uid} node={node} />
                  ))}
                </div>
              </div>
            )}

            {relationNodes.length > 0 && (
              <div className="mt-3 rounded-md border border-slate-300 bg-slate-50 p-3">
                <div className="mb-2.5 flex items-center gap-2">
                  <FaBan size={16} className="text-slate-400" />
                  <h4 className="m-0 text-[13px] font-semibold text-slate-800">
                    Node/relation combination not allowed
                  </h4>
                  <span className="rounded-xl bg-slate-200 px-2 py-0.5 text-xs font-semibold text-blue-700">
                    {relationNodes.length}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {relationNodes.map(node => (
                    <NodeItem key={node.uid} node={node} />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-700 text-white">
                <FaLink size={14} />
              </div>
              <h3 className="m-0 text-lg font-semibold">Relations errors</h3>
              <span className="rounded-xl bg-slate-200 px-2 py-0.5 text-xs font-semibold text-blue-700">
                {diffEdges.length}
              </span>
            </div>
            <div className="mb-2 text-xs text-gray-500">
              Node/relation combination not allowed
            </div>
            <div className="flex flex-col gap-2">
              {diffEdges.map(edge => (
                <EdgeItem key={edge.uid} edge={edge} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CamErrors
