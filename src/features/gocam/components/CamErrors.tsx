import { useMemo } from 'react'
import { FaExclamationCircle, FaSitemap, FaLink, FaTimes } from 'react-icons/fa'
import type { GraphModel, CamError, GraphNode, Edge } from '../models/cam'
import { ErrorType } from '../models/cam'
import { processViolations, computeDiffs } from '../services/violationService'
import { useAppDispatch } from '@/app/hooks'
import { setRightDrawerOpen } from '@/@noctua.core/components/drawer/drawerSlice'
import Button from '@mui/material/Button'

interface CamErrorsProps {
  model: GraphModel
}

function RelationViz({ error }: { error: CamError }) {
  return (
    <div className="mt-4 border-t border-gray-200 pt-4">
      <div className="flex items-center gap-4 rounded-lg bg-gray-100 p-4">
        <div className="min-w-[80px] rounded-lg bg-blue-600 px-4 py-2 text-center text-sm font-medium text-white">
          {error.meta?.subjectNode?.label}
        </div>
        <div className="flex flex-1 items-center justify-center">
          <span className="whitespace-nowrap rounded-full bg-pink-500 px-3 py-1.5 text-xs font-medium text-white">
            {error.meta?.edge?.label}
          </span>
        </div>
        <div className="min-w-[80px] rounded-lg bg-blue-600 px-4 py-2 text-center text-sm font-medium text-white">
          {error.meta?.objectNode?.label}
        </div>
      </div>
    </div>
  )
}

function CardinalityViz({ error }: { error: CamError }) {
  return (
    <div className="mt-4 border-t border-gray-200 pt-4">
      <div className="flex items-center gap-4 rounded-lg border border-amber-500 bg-amber-50 p-4">
        <div className="min-w-[80px] rounded-lg bg-amber-500 px-4 py-2 text-center text-sm font-medium text-white">
          {error.meta?.subjectNode?.label}
        </div>
        <div className="flex flex-1 items-center justify-center">
          <span className="whitespace-nowrap rounded-full bg-amber-500 px-3 py-1.5 text-xs font-medium text-white">
            {error.meta?.edge?.label}
          </span>
        </div>
      </div>
    </div>
  )
}

function DiffNodesSection({ nodes }: { nodes: GraphNode[] }) {
  if (nodes.length === 0) return null
  return (
    <div className="border-b border-gray-200 p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-500 text-white">
          <FaSitemap size={14} />
        </div>
        <h3 className="m-0 text-lg font-semibold">Nodes</h3>
        <span className="rounded-xl bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-500">
          {nodes.length}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {nodes.map(node => (
          <div
            key={node.uid}
            className="flex items-center gap-3 rounded-lg border border-gray-200 bg-neutral-50 p-3 hover:border-green-500 hover:bg-white"
          >
            <span className="min-w-[40px] rounded bg-green-500 px-2 py-1 text-center text-xs font-semibold text-white">
              {node.id}
            </span>
            <div className="flex-1">
              {node.label && <div className="text-sm font-semibold">{node.label}</div>}
              <div className="font-mono text-xs text-gray-500">{node.id}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function DiffEdgesSection({ edges }: { edges: Edge[] }) {
  if (edges.length === 0) return null
  return (
    <div className="p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-500 text-white">
          <FaLink size={14} />
        </div>
        <h3 className="m-0 text-lg font-semibold">Edges</h3>
        <span className="rounded-xl bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-500">
          {edges.length}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {edges.map(edge => (
          <div
            key={edge.uid}
            className="flex items-center gap-3 rounded-lg border border-gray-200 bg-neutral-50 p-3 hover:border-green-500 hover:bg-white"
          >
            <span className="min-w-[24px] rounded bg-pink-500 px-2 py-1 text-center text-xs font-semibold text-white">
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
        ))}
      </div>
    </div>
  )
}

const CamErrors: React.FC<CamErrorsProps> = ({ model }) => {
  const dispatch = useAppDispatch()
  const violations = useMemo(() => processViolations(model), [model])
  const { diffNodes, diffEdges } = useMemo(() => computeDiffs(model), [model])

  const handleClose = () => {
    dispatch(setRightDrawerOpen(false))
  }

  return (
    <div className="flex h-full flex-col bg-neutral-50">
      {/* Header */}
      <div className="flex items-center justify-between bg-blue-600 px-6 py-4 text-white">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20">
            <FaExclamationCircle size={18} />
          </div>
          <h1 className="m-0 text-xl font-semibold">Validation Errors</h1>
        </div>
        <Button
          variant="outlined"
          size="small"
          onClick={handleClose}
          startIcon={<FaTimes size={12} />}
          sx={{
            color: 'white',
            borderColor: 'rgba(255,255,255,0.3)',
            '&:hover': { borderColor: 'rgba(255,255,255,0.5)', bgcolor: 'rgba(255,255,255,0.1)' },
          }}
        >
          Close
        </Button>
      </div>

      {/* Summary stats */}
      <div className="flex gap-4 border-b border-gray-200 bg-white px-6 py-4">
        <div className="min-w-[100px] rounded-lg border border-red-500 bg-red-50 p-3 text-center">
          <div className="text-2xl font-bold leading-none text-red-500">{violations.length}</div>
          <div className="mt-1 text-xs text-red-500/80">Total Errors</div>
        </div>
        <div className="min-w-[100px] rounded-lg border border-blue-600 bg-blue-50 p-3 text-center">
          <div className="text-2xl font-bold leading-none text-blue-600">{diffNodes.length}</div>
          <div className="mt-1 text-xs text-blue-600/80">Node Errors</div>
        </div>
        <div className="min-w-[100px] rounded-lg border border-amber-500 bg-orange-50 p-3 text-center">
          <div className="text-2xl font-bold leading-none text-amber-500">{diffEdges.length}</div>
          <div className="mt-1 text-xs text-amber-500/80">Relation Errors</div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {violations.length === 0 && diffNodes.length === 0 && diffEdges.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">No validation errors found.</p>
        ) : (
          <>
            {/* Error list */}
            {violations.length > 0 && (
              <div className="p-6">
                <div className="flex flex-col gap-4">
                  {violations.map((error, i) => (
                    <div
                      key={i}
                      className="rounded-lg border-l-4 border-l-red-500 bg-white p-4 shadow-[0_2px_4px_rgba(0,0,0,0.12)] hover:shadow-[0_4px_8px_rgba(0,0,0,0.16)]"
                    >
                      <div className="mb-3 flex items-start gap-4">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-500 text-sm font-semibold text-white">
                          {i + 1}
                        </div>
                        <div className="text-base text-gray-900">{error.message}</div>
                      </div>
                      {error.type === ErrorType.RELATION && <RelationViz error={error} />}
                      {error.type === ErrorType.CARDINALITY && <CardinalityViz error={error} />}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Annotations: diff nodes/edges */}
            <div className="border-t border-gray-200 bg-white">
              <DiffNodesSection nodes={diffNodes} />
              <DiffEdgesSection edges={diffEdges} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default CamErrors
