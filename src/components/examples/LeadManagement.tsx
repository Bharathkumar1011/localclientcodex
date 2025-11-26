import LeadManagement from '../LeadManagement'
import { useAuth } from '@/hooks/useAuth'

export default function LeadManagementExample() {
  const { user } = useAuth()
  
  if (!user) {
    return <div>Loading...</div>
  }
  
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <LeadManagement stage="qualified" currentUser={user} />
    </div>
  )
}