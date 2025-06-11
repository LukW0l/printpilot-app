import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Get the active system configuration
    const config = await prisma.systemConfig.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    })

    if (!config) {
      return NextResponse.json({
        message: 'No configuration found, using defaults'
      }, { status: 404 })
    }

    return NextResponse.json(config)
  } catch (error) {
    console.error('Error fetching system config:', error)
    return NextResponse.json(
      { error: 'Failed to fetch system configuration' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    console.log('Saving settings data:', JSON.stringify(data, null, 2))

    // First, mark all existing configs as inactive
    await prisma.systemConfig.updateMany({
      where: { isActive: true },
      data: { isActive: false }
    })

    // Create new configuration
    const config = await prisma.systemConfig.create({
      data: {
        // Company Information
        companyName: data.companyName,
        companyLogo: data.companyLogo,
        companyEmail: data.companyEmail,
        companyPhone: data.companyPhone,
        companyAddress: data.companyAddress,
        companyNip: data.companyNip,
        companyRegon: data.companyRegon,
        companyWebsite: data.companyWebsite,
        
        // Business Settings
        defaultCurrency: data.defaultCurrency || 'PLN',
        defaultTimezone: data.defaultTimezone || 'Europe/Warsaw',
        businessHours: data.businessHours,
        workingDays: data.workingDays,
        
        // Notification Settings
        emailNotifications: data.emailNotifications ?? true,
        lowStockThreshold: data.lowStockThreshold || 10,
        orderVolumeAlert: data.orderVolumeAlert || 50,
        notificationFrequency: data.notificationFrequency || 'REAL_TIME',
        
        // Inventory Settings
        autoReorderEnabled: data.autoReorderEnabled ?? false,
        reorderLeadDays: data.reorderLeadDays || 7,
        safetyStockPercent: data.safetyStockPercent || 20,
        
        // Shipping Settings
        defaultSenderName: data.defaultSenderName,
        defaultSenderAddress: data.defaultSenderAddress,
        shippingMarkup: data.shippingMarkup || 0,
        freeShippingThreshold: data.freeShippingThreshold,
        
        // Apaczka API Settings
        apaczkaAppId: data.apaczkaAppId,
        apaczkaApiKey: data.apaczkaApiKey,
        apaczkaTestMode: data.apaczkaTestMode ?? false,
        companyPostalCode: data.companyPostalCode,
        
        // Furgonetka API Settings
        furgonetkaClientId: data.furgonetkaClientId,
        furgonetkaClientSecret: data.furgonetkaClientSecret,
        furgonetkaUsername: data.furgonetkaUsername,
        furgonetkaPassword: data.furgonetkaPassword,
        furgonetkaTestMode: data.furgonetkaTestMode ?? false,
        
        // User Interface Settings
        dashboardLayout: data.dashboardLayout || 'DEFAULT',
        itemsPerPage: data.itemsPerPage || 20,
        chartDateRange: data.chartDateRange || 30,
        exportFormat: data.exportFormat || 'PDF',
        
        // Integration Settings
        adobeStockApiKey: data.adobeStockApiKey,
        adobeStockEnabled: data.adobeStockEnabled ?? false,
        webhookRetryCount: data.webhookRetryCount || 3,
        syncBatchSize: data.syncBatchSize || 50,
        
        // Production Settings
        rushOrderSurcharge: data.rushOrderSurcharge || 25.0,
        maxDailyCapacity: data.maxDailyCapacity,
        productionLeadDays: data.productionLeadDays || 3,
        
        // Email Templates
        orderConfirmationTemplate: data.orderConfirmationTemplate,
        shippingNotificationTemplate: data.shippingNotificationTemplate,
        lowStockEmailTemplate: data.lowStockEmailTemplate,
        
        // Branding
        primaryColor: data.primaryColor || '#3B82F6',
        secondaryColor: data.secondaryColor || '#6B7280',
        logoPosition: data.logoPosition || 'TOP_LEFT',
        customCss: data.customCss,
        
        // Backup and Maintenance
        autoBackupEnabled: data.autoBackupEnabled ?? true,
        backupFrequency: data.backupFrequency || 'WEEKLY',
        dataRetentionMonths: data.dataRetentionMonths || 24,
        
        // Status
        isActive: true,
        version: '1.0'
      }
    })

    return NextResponse.json(config)
  } catch (error) {
    console.error('Error saving system config:', error)
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error')
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { 
        error: 'Failed to save system configuration',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const data = await request.json()
    
    // Get the current active configuration
    const currentConfig = await prisma.systemConfig.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    })

    if (!currentConfig) {
      // If no configuration exists, create one
      return POST(request)
    }

    // Update the existing configuration
    const updatedConfig = await prisma.systemConfig.update({
      where: { id: currentConfig.id },
      data: {
        // Company Information
        companyName: data.companyName,
        companyLogo: data.companyLogo,
        companyEmail: data.companyEmail,
        companyPhone: data.companyPhone,
        companyAddress: data.companyAddress,
        companyNip: data.companyNip,
        companyRegon: data.companyRegon,
        companyWebsite: data.companyWebsite,
        
        // Business Settings
        defaultCurrency: data.defaultCurrency,
        defaultTimezone: data.defaultTimezone,
        businessHours: data.businessHours,
        workingDays: data.workingDays,
        
        // Notification Settings
        emailNotifications: data.emailNotifications,
        lowStockThreshold: data.lowStockThreshold,
        orderVolumeAlert: data.orderVolumeAlert,
        notificationFrequency: data.notificationFrequency,
        
        // Inventory Settings
        autoReorderEnabled: data.autoReorderEnabled,
        reorderLeadDays: data.reorderLeadDays,
        safetyStockPercent: data.safetyStockPercent,
        
        // Shipping Settings
        defaultSenderName: data.defaultSenderName,
        defaultSenderAddress: data.defaultSenderAddress,
        shippingMarkup: data.shippingMarkup,
        freeShippingThreshold: data.freeShippingThreshold,
        
        // Apaczka API Settings
        apaczkaAppId: data.apaczkaAppId,
        apaczkaApiKey: data.apaczkaApiKey,
        apaczkaTestMode: data.apaczkaTestMode,
        companyPostalCode: data.companyPostalCode,
        
        // Furgonetka API Settings
        furgonetkaClientId: data.furgonetkaClientId,
        furgonetkaClientSecret: data.furgonetkaClientSecret,
        furgonetkaUsername: data.furgonetkaUsername,
        furgonetkaPassword: data.furgonetkaPassword,
        furgonetkaTestMode: data.furgonetkaTestMode,
        
        // User Interface Settings
        dashboardLayout: data.dashboardLayout,
        itemsPerPage: data.itemsPerPage,
        chartDateRange: data.chartDateRange,
        exportFormat: data.exportFormat,
        
        // Integration Settings
        adobeStockApiKey: data.adobeStockApiKey,
        adobeStockEnabled: data.adobeStockEnabled,
        webhookRetryCount: data.webhookRetryCount,
        syncBatchSize: data.syncBatchSize,
        
        // Production Settings
        rushOrderSurcharge: data.rushOrderSurcharge,
        maxDailyCapacity: data.maxDailyCapacity,
        productionLeadDays: data.productionLeadDays,
        
        // Email Templates
        orderConfirmationTemplate: data.orderConfirmationTemplate,
        shippingNotificationTemplate: data.shippingNotificationTemplate,
        lowStockEmailTemplate: data.lowStockEmailTemplate,
        
        // Branding
        primaryColor: data.primaryColor,
        secondaryColor: data.secondaryColor,
        logoPosition: data.logoPosition,
        customCss: data.customCss,
        
        // Backup and Maintenance
        autoBackupEnabled: data.autoBackupEnabled,
        backupFrequency: data.backupFrequency,
        dataRetentionMonths: data.dataRetentionMonths,
        
        updatedAt: new Date()
      }
    })

    return NextResponse.json(updatedConfig)
  } catch (error) {
    console.error('Error updating system config:', error)
    return NextResponse.json(
      { error: 'Failed to update system configuration' },
      { status: 500 }
    )
  }
}