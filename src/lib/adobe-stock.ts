import axios from 'axios'

interface AdobeStockConfig {
  apiKey: string
  baseUrl?: string
}

interface SearchParams {
  keywords: string
  limit?: number
  offset?: number
  filters?: {
    orientation?: 'horizontal' | 'vertical' | 'square'
    hasReleases?: boolean
    contentType?: 'photo' | 'illustration' | 'vector' | 'video'
  }
}

interface StockAsset {
  id: string
  title: string
  creator_name: string
  thumbnail_url: string
  preview_url: string
  width: number
  height: number
  content_type: string
  is_licensed: boolean
}

export class AdobeStockClient {
  private apiKey: string
  private baseUrl: string

  constructor(config: AdobeStockConfig) {
    this.apiKey = config.apiKey
    this.baseUrl = config.baseUrl || 'https://stock.adobe.io/Rest/Media/1'
  }

  async search(params: SearchParams): Promise<StockAsset[]> {
    try {
      const queryParams = new URLSearchParams({
        'search_parameters[words]': params.keywords,
        'search_parameters[limit]': (params.limit || 20).toString(),
        'search_parameters[offset]': (params.offset || 0).toString()
      })

      if (params.filters?.orientation) {
        queryParams.append('search_parameters[filters][orientation]', params.filters.orientation)
      }
      if (params.filters?.hasReleases !== undefined) {
        queryParams.append('search_parameters[filters][has_releases]', params.filters.hasReleases.toString())
      }
      if (params.filters?.contentType) {
        queryParams.append('search_parameters[filters][content_type:' + params.filters.contentType + ']', '1')
      }

      const response = await axios.get(`${this.baseUrl}/Search/Files`, {
        params: queryParams,
        headers: {
          'x-api-key': this.apiKey,
          'x-product': 'PrintPilot/1.0'
        }
      })

      return response.data.files.map((file: any) => ({
        id: file.id,
        title: file.title,
        creator_name: file.creator_name,
        thumbnail_url: file.thumbnail_url,
        preview_url: file.comp_url,
        width: file.width,
        height: file.height,
        content_type: file.content_type,
        is_licensed: file.is_licensed || false
      }))
    } catch (error) {
      console.error('Adobe Stock API error:', error)
      throw error
    }
  }

  async getAssetInfo(assetId: string): Promise<StockAsset> {
    try {
      const response = await axios.get(`${this.baseUrl}/Content/Info`, {
        params: {
          'content_id': assetId
        },
        headers: {
          'x-api-key': this.apiKey,
          'x-product': 'PrintPilot/1.0'
        }
      })

      const content = response.data.contents[0]
      return {
        id: content.id,
        title: content.title,
        creator_name: content.creator_name,
        thumbnail_url: content.thumbnail_url,
        preview_url: content.comp_url,
        width: content.width,
        height: content.height,
        content_type: content.content_type,
        is_licensed: content.is_licensed || false
      }
    } catch (error) {
      console.error('Adobe Stock API error:', error)
      throw error
    }
  }

  async getLicenseInfo(assetId: string): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/Member/License`, {
        params: {
          'content_id': assetId
        },
        headers: {
          'x-api-key': this.apiKey,
          'x-product': 'PrintPilot/1.0'
        }
      })

      return response.data
    } catch (error) {
      console.error('Adobe Stock API error:', error)
      throw error
    }
  }

  async downloadAsset(assetId: string, licenseState: string): Promise<string> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/Member/License`,
        {
          'content_id': assetId,
          'license': licenseState
        },
        {
          headers: {
            'x-api-key': this.apiKey,
            'x-product': 'PrintPilot/1.0',
            'Content-Type': 'application/json'
          }
        }
      )

      return response.data.download_url
    } catch (error) {
      console.error('Adobe Stock API error:', error)
      throw error
    }
  }
}

// Singleton instance
let adobeStockClient: AdobeStockClient | null = null

export function getAdobeStockClient(): AdobeStockClient {
  if (!adobeStockClient) {
    const apiKey = process.env.ADOBE_STOCK_API_KEY
    if (!apiKey) {
      throw new Error('Adobe Stock API key not configured')
    }
    adobeStockClient = new AdobeStockClient({ apiKey })
  }
  return adobeStockClient
}