declare module '@woocommerce/woocommerce-rest-api' {
  export default class WooCommerceRestApi {
    constructor(options: {
      url: string
      consumerKey: string
      consumerSecret: string
      version: string
    })
    
    get(endpoint: string, params?: any): Promise<any>
    post(endpoint: string, data: any): Promise<any>
    put(endpoint: string, data: any): Promise<any>
    delete(endpoint: string): Promise<any>
  }
}