'use client'

import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { theme } from '@/styles/theme'

interface DashboardChartsProps {
  ordersByDay: { date: string; count: number }[]
  ordersByStatus: { status: string; count: number }[]
  ordersByShop: { shop: string; count: number }[]
  revenueByDay: { date: string; revenue: number }[]
}

const COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#EF4444', '#F59E0B', '#10B981']

const statusTranslations: Record<string, string> = {
  'NEW': 'Nowe',
  'PROCESSING': 'W realizacji',
  'PRINTED': 'Wydrukowane',
  'SHIPPED': 'Wysłane',
  'DELIVERED': 'Dostarczone',
  'CANCELLED': 'Anulowane'
}

export default function DashboardCharts({ ordersByDay = [], ordersByStatus = [], ordersByShop = [], revenueByDay = [] }: DashboardChartsProps) {
  // Transform status data to include Polish names
  const translatedStatusData = ordersByStatus.map(item => ({
    ...item,
    name: statusTranslations[item.status] || item.status,
    status: item.status
  }))
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* Orders by Day */}
      <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300">
        <h3 className="text-lg font-bold text-gray-900 mb-6">Trend zamówień</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={ordersByDay}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="date" stroke="#374151" fontSize={12} />
            <YAxis stroke="#374151" fontSize={12} allowDecimals={false} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#F9FAFB', 
                border: '1px solid #E5E7EB', 
                borderRadius: '12px',
                color: '#374151',
                fontSize: '12px'
              }} 
            />
            <Line type="monotone" dataKey="count" stroke="#6366F1" strokeWidth={3} dot={{ fill: '#6366F1', strokeWidth: 2, r: 4 }} activeDot={{ r: 6, stroke: '#6366F1', strokeWidth: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Orders by Shop */}
      <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300">
        <h3 className="text-lg font-bold text-gray-900 mb-6">Zamówienia według sklepu</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={ordersByShop} layout="vertical">
            <defs>
              <linearGradient id="countGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#8B5CF6" stopOpacity={1}/>
                <stop offset="100%" stopColor="#7C3AED" stopOpacity={1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis type="number" stroke="#374151" fontSize={12} />
            <YAxis dataKey="shop" type="category" stroke="#374151" fontSize={12} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#F9FAFB', 
                border: '1px solid #E5E7EB', 
                borderRadius: '12px',
                color: '#374151',
                fontSize: '12px'
              }} 
            />
            <Bar dataKey="count" fill="url(#countGradient)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Revenue by Day */}
      <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300">
        <h3 className="text-lg font-bold text-gray-900 mb-6">Trend przychodów</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={revenueByDay}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity={1}/>
                <stop offset="100%" stopColor="#059669" stopOpacity={1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="date" stroke="#374151" fontSize={12} />
            <YAxis stroke="#374151" fontSize={12} allowDecimals={false} />
            <Tooltip 
              formatter={(value) => `${value} PLN`} 
              contentStyle={{ 
                backgroundColor: '#F9FAFB', 
                border: '1px solid #E5E7EB', 
                borderRadius: '12px',
                color: '#374151',
                fontSize: '12px'
              }} 
            />
            <Bar dataKey="revenue" fill="url(#revenueGradient)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}