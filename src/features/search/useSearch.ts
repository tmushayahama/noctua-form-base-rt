import { useAppSelector } from '@/app/hooks'
import { selectSearch } from './searchSlice'

export const useSearchFilter = () => {
  const search = useAppSelector(selectSearch)

  const getQueryFilter = () => ({
    geneIds: search.genes.map(g => g.gene),
    slimTermIds: search.slimTerms.map(t => t.id),
  })

  return {
    filter: getQueryFilter(),
    isEmpty: search.filtersCount === 0,
  }
}
