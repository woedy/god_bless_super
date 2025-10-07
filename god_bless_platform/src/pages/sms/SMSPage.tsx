/**
 * SMS Page
 * Main SMS campaigns page - redirects to CampaignsPage
 */

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * SMS Page Component
 * Redirects to the campaigns page
 */
export function SMSPage() {
  const navigate = useNavigate()

  useEffect(() => {
    navigate('/sms/campaigns', { replace: true })
  }, [navigate])

  return null
}