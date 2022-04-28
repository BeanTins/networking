export class HttpResponse{
    static created(item: string){
      return HttpResponse.build(201, item + " created")
    }

    static ok(message: string){
      return HttpResponse.build(200, message)
    }
    
    static error(error: any, statusCodeMap : Map<any, number>){
      
      let statusCode = 500
  
      for (let [key, value] of statusCodeMap) {
        if (error instanceof key)
        {
          statusCode = value
        }
      }
  
      return HttpResponse.build(statusCode, error.message)
    }

    static build(statusCode: Number, message: string)
    {
      return {
        statusCode: statusCode,
        body: JSON.stringify({
          message: message
        }) 
      }
    }
}
  