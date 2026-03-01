import { ActivityType } from '@/features/gocam/models/cam'

export interface StencilItemNode {
  id: string
  label: string
  type: ActivityType
  iconUrl: string
  description: string
}

export interface StencilGroup {
  id: string
  label: string
  nodes: StencilItemNode[]
}

export const camStencil: StencilGroup[] = [
  {
    id: 'activity_unit',
    label: 'Activity Type',
    nodes: [
      {
        type: ActivityType.ACTIVITY,
        id: 'default',
        label: 'DEFAULT',
        iconUrl: './assets/images/activity/default.png',
        description:
          'Click and drag onto canvas to create new activity for a single object, either a gene product or a protein complex identifier',
      },
      {
        type: ActivityType.PROTEIN_COMPLEX,
        id: 'proteinComplex',
        label: 'PROTEIN COMPLEX',
        iconUrl: './assets/images/activity/proteinComplex.png',
        description:
          'Click and drag onto canvas to create new activity for a protein complex that you define using a GO complex term and specifying the gene product subunits',
      },
      {
        type: ActivityType.MOLECULE,
        id: 'molecule',
        label: 'MOLECULE',
        iconUrl: './assets/images/activity/molecule.png',
        description:
          'Click and drag onto canvas to create a new small molecule that is either a substrate, a product, or a regulator of an activity',
      },
    ],
  },
]
