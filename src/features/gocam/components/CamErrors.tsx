import type React from 'react'
import type { GraphModel } from '../models/cam'
import { ActivityType } from '../models/cam'

interface CamErrorsProps {
  model: GraphModel
}

interface ValidationError {
  category: 'activity' | 'edge' | 'model'
  severity: 'error' | 'warning'
  message: string
  activityLabel?: string
}

function validateModel(model: GraphModel): ValidationError[] {
  const errors: ValidationError[] = []

  // Model-level checks
  if (!model.title) {
    errors.push({
      category: 'model',
      severity: 'warning',
      message: 'Model has no title',
    })
  }

  if (model.state === 'development') {
    errors.push({
      category: 'model',
      severity: 'warning',
      message: 'Model is in development state',
    })
  }

  // Activity-level checks
  for (const activity of model.activities) {
    const label = activity.enabledBy?.label ?? activity.rootNode?.label ?? activity.uid

    if (activity.type === ActivityType.ACTIVITY) {
      if (!activity.enabledBy) {
        errors.push({
          category: 'activity',
          severity: 'error',
          message: 'Activity is missing a gene product (enabled by)',
          activityLabel: label,
        })
      }

      if (!activity.molecularFunction) {
        errors.push({
          category: 'activity',
          severity: 'error',
          message: 'Activity is missing a molecular function',
          activityLabel: label,
        })
      }
    }

    // Edge-level checks within activity
    for (const edge of activity.edges) {
      if (!edge.evidence || edge.evidence.length === 0) {
        errors.push({
          category: 'edge',
          severity: 'warning',
          message: `Relation "${edge.label}" has no evidence`,
          activityLabel: label,
        })
      }
    }
  }

  // Activity connection checks
  for (const conn of model.activityConnections) {
    if (!conn.evidence || conn.evidence.length === 0) {
      errors.push({
        category: 'edge',
        severity: 'warning',
        message: `Connection "${conn.label}" between activities has no evidence`,
      })
    }
  }

  return errors
}

const severityStyles = {
  error: 'border-red-300 bg-red-50 text-red-800',
  warning: 'border-amber-300 bg-amber-50 text-amber-800',
}

const severityBadge = {
  error: 'bg-red-100 text-red-700',
  warning: 'bg-amber-100 text-amber-700',
}

const CamErrors: React.FC<CamErrorsProps> = ({ model }) => {
  const errors = validateModel(model)
  const errorCount = errors.filter(e => e.severity === 'error').length
  const warningCount = errors.filter(e => e.severity === 'warning').length

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-200 p-3">
        <div className="flex gap-3 text-xs">
          <span className="rounded bg-red-100 px-2 py-0.5 font-medium text-red-700">
            {errorCount} error{errorCount !== 1 ? 's' : ''}
          </span>
          <span className="rounded bg-amber-100 px-2 py-0.5 font-medium text-amber-700">
            {warningCount} warning{warningCount !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {errors.length === 0 ? (
          <p className="text-sm text-gray-500">No validation errors found.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {errors.map((err, i) => (
              <div key={i} className={`rounded border p-2 text-xs ${severityStyles[err.severity]}`}>
                <div className="flex items-start gap-2">
                  <span
                    className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-2xs font-medium ${severityBadge[err.severity]}`}
                  >
                    {err.severity}
                  </span>
                  <div>
                    <p>{err.message}</p>
                    {err.activityLabel && <p className="mt-0.5 opacity-70">{err.activityLabel}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default CamErrors
