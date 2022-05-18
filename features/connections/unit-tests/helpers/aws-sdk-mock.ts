class EventBridge {
  putEvents: jest.Mock = jest.fn()
}

// class DocumentClient {
//   transactWrite: jest.Mock = jest.fn()
// }

class SES {
  sendEmail: jest.Mock = jest.fn()
}

export class AWSSDKMock{

  private awsMockedInstance: any
  readonly EventBridge: EventBridge
  readonly SES: SES
  //readonly DynamoDB: DocumentClient

  buildMockedCall(service: string, functionName: string)
  {
    const mockedCall = jest.fn().mockImplementation(() => {
      return {promise: jest.fn()}
    })
    this.awsMockedInstance[service].mockImplementation(() => {
      return {[functionName]: mockedCall}
    })

    return mockedCall
  }

  buildServiceMocks(service: any)
  {
    for (var member in service) {
      if (service.hasOwnProperty(member)) {
        service[member] = this.buildMockedCall(service.constructor.name, member)
      }
    }

    return service
  }

  buildMockedCall2(service: string, functionName: string)
  {
    const mockedCall = jest.fn().mockImplementation(() => {
      return {promise: jest.fn()}
    })
    this.awsMockedInstance["DynamoDB"][service].mockImplementation(() => {
      return {[functionName]: mockedCall}
    })

    return mockedCall
  }

  buildServiceMocks2(service: any)
  {
    for (var member in service) {
      if (service.hasOwnProperty(member)) {
        service[member] = this.buildMockedCall2(service.constructor.name, member)
      }
    }

    return service
  }

  constructor(awsMockedInstance: any){
   
    this.awsMockedInstance = awsMockedInstance
    this.EventBridge = this.buildServiceMocks(new EventBridge())
    //this.DynamoDB = this.buildServiceMocks(new DynamoDB())

    // this.DynamoDB = this.buildServiceMocks2(new DocumentClient())
    const mockedCall = jest.fn().mockImplementation(() => {
      return {promise: jest.fn()}
    })

    this.awsMockedInstance.DynamoDB.mockImplementation(() => ({
      DocumentClient: jest.fn(() => ({
        transactWrite: mockedCall
      }))}))

    this.SES = this.buildServiceMocks(new SES())
  }
}

