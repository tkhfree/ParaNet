import { useLocation } from 'react-router-dom'

const useQuery = <T = Record<string, string>>(key?: string) => {
  const location = useLocation()
  const query = new URLSearchParams(location.search)

  if (!key) {
    return query
      .keys()
      .reduce((prev, key) => ({ ...prev, [key]: query.get(key) as T[keyof T] }), {} as T)
  }

  return query.get(key) as T
}

export default useQuery
