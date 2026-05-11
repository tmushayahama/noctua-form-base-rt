/**
 * Real Barista API responses snapshotted from `downloads/models/` (which is gitignored).
 * Use the `*Raw` exports as input to `transformGraphData` tests; use the transformed
 * `*Model` exports anywhere a realistic `GraphModel` is needed.
 *
 * Relation coverage (mix and match for tests that care):
 *   swissOne     — part_of, has_part, occurs_in, located_in, has_input, has_output,
 *                  enabled_by, directly_+/-_regulates, small_molecule_activator (10 relations)
 *   anotherModel — swissOne + causally_upstream_+, indirectly_+/-_regulates,
 *                  small_molecule_inhibitor (14 relations, most diverse)
 *   largeVal     — adds provides_input_for, constitutively_upstream; 376 individuals
 *                  (biggest model — use for scale / activity-rich scenarios)
 */
import { transformGraphData } from '@/features/gocam/services/graphServices'
import swissOneRawJson from './raw/swiss-1.json'
import anotherModelRawJson from './raw/another-model.json'
import largeValRawJson from './raw/large-val.json'

export const swissOneRaw = swissOneRawJson
export const anotherModelRaw = anotherModelRawJson
export const largeValRaw = largeValRawJson

export const swissOneModel = transformGraphData(swissOneRawJson)
export const anotherModel = transformGraphData(anotherModelRawJson)
export const largeValModel = transformGraphData(largeValRawJson)
