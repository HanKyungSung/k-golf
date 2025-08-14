import { useNavigate } from 'react-router-dom'

export function useRouter() {
  const navigate = useNavigate()
  return {
    push: (to: string) => navigate(to),
    replace: (to: string) => navigate(to, { replace: true }),
    back: () => navigate(-1),
  }
}

export const redirect = (url: string) => {
  window.location.assign(url)
}
