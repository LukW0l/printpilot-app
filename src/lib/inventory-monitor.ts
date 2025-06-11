export interface InventoryAlert {
  id: string
  type: 'stretcher_bar' | 'crossbar' | 'cardboard'
  itemName: string
  currentStock: number
  minStock: number
  urgency: 'low' | 'medium' | 'high'
}

export async function createInventoryNotifications(
  createNotification: (itemName: string, stock: number) => void
) {
  try {
    const response = await fetch('/api/inventory/alerts')
    
    if (!response.ok) {
      console.error('Failed to fetch inventory alerts')
      return
    }
    
    const data = await response.json()
    
    if (data.success && data.alerts) {
      data.alerts.forEach((alert: InventoryAlert) => {
        createNotification(alert.itemName, alert.currentStock)
      })
    }
  } catch (error) {
    console.error('Error creating inventory notifications:', error)
  }
}