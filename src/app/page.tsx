'use client'

import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">PrintPilot</h1>
          <p className="text-lg text-gray-600 mb-8">
            Centralized order management for your print-on-demand business
          </p>
          
          <div className="space-y-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Go to Dashboard
            </button>
            
            <div className="text-sm text-gray-500">
              <p>✓ WooCommerce Integration</p>
              <p>✓ Order Synchronization</p>
              <p>✓ Multi-platform Support</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}