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
        <div className="min-w-[80px] rounded-lg bg-[#1976d2] px-4 py-2 text-center text-sm font-medium text-white">
          {error.meta?.subjectNode?.label}
        </div>
        <div className="flex flex-1 items-center justify-center">
          <span className="whitespace-nowrap rounded-full bg-[#ff4081] px-3 py-1.5 text-xs font-medium text-white">
            {error.meta?.edge?.label}
          </span>
        </div>
        <div className="min-w-[80px] rounded-lg bg-[#1976d2] px-4 py-2 text-center text-sm font-medium text-white">
          {error.meta?.objectNode?.label}
        </div>
      </div>
    </div>
  )
}

function CardinalityViz({ error }: { error: CamError }) {
  return (
    <div className="mt-4 border-t border-gray-200 pt-4">
      <div className="flex items-center gap-4 rounded-lg border border-[#ff9800] bg-[#fff8e1] p-4">
        <div className="min-w-[80px] rounded-lg bg-[#ff9800] px-4 py-2 text-center text-sm font-medium text-white">
          {error.meta?.subjectNode?.label}
        </div>
        <div className="flex flex-1 items-center justify-center">
          <span className="whitespace-nowrap rounded-full bg-[#ff9800] px-3 py-1.5 text-xs font-medium text-white">
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
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#4caf50] text-white">
          <FaSitemap size={14} />
        </div>
        <h3 className="m-0 text-lg font-semibold">Nodes</h3>
        <span className="rounded-xl bg-[#e8f5e8] px-2 py-0.5 text-xs font-semibold text-[#4caf50]">
          {nodes.length}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {nodes.map(node => (
          <div
            key={node.uid}
            className="flex items-center gap-3 rounded-lg border border-gray-200 bg-[#f9f9f9] p-3 hover:border-[#4caf50] hover:bg-white"
          >
            <span className="min-w-[40px] rounded bg-[#4caf50] px-2 py-1 text-center text-xs font-semibold text-white">
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
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#4caf50] text-white">
          <FaLink size={14} />
        </div>
        <h3 className="m-0 text-lg font-semibold">Edges</h3>
        <span className="rounded-xl bg-[#e8f5e8] px-2 py-0.5 text-xs font-semibold text-[#4caf50]">
          {edges.length}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {edges.map(edge => (
          <div
            key={edge.uid}
            className="flex items-center gap-3 rounded-lg border border-gray-200 bg-[#f9f9f9] p-3 hover:border-[#4caf50] hover:bg-white"
          >
            <span className="min-w-[24px] rounded bg-[#ff4081] px-2 py-1 text-center text-xs font-semibold text-white">
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
    <div className="flex h-full flex-col bg-[#fafafa]">
      {/* Header */}
      <div className="flex items-center justify-between bg-[#1976d2] px-6 py-4 text-white">
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
        <div className="min-w-[100px] rounded-lg border border-[#f44336] bg-[#ffebee] p-3 text-center">
          <div className="text-2xl font-bold leading-none text-[#f44336]">{violations.length}</div>
          <div className="mt-1 text-xs text-[#f44336]/80">Total Errors</div>
        </div>
        <div className="min-w-[100px] rounded-lg border border-[#1976d2] bg-[#e3f2fd] p-3 text-center">
          <div className="text-2xl font-bold leading-none text-[#1976d2]">{diffNodes.length}</div>
          <div className="mt-1 text-xs text-[#1976d2]/80">Node Errors</div>
        </div>
        <div className="min-w-[100px] rounded-lg border border-[#ff9800] bg-[#fff3e0] p-3 text-center">
          <div className="text-2xl font-bold leading-none text-[#ff9800]">{diffEdges.length}</div>
          <div className="mt-1 text-xs text-[#ff9800]/80">Relation Errors</div>
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
                      className="rounded-lg border-l-4 border-l-[#f44336] bg-white p-4 shadow-[0_2px_4px_rgba(0,0,0,0.12)] hover:shadow-[0_4px_8px_rgba(0,0,0,0.16)]"
                    >
                      <div className="mb-3 flex items-start gap-4">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f44336] text-sm font-semibold text-white">
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
