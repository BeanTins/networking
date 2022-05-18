import { APIGatewayEvent } from "aws-lambda"

export class LambdaEventBuilder{

  private body: string| null
  private pathParameters: any

  constructor(){
    this.body = null
    this.pathParameters = null
  }

  withBody(body: any){
    this.body = JSON.stringify(body)
    return this
  }

  withPathParameters(pathParameters: any){
    this.pathParameters = pathParameters
    return this
  }

  build(): APIGatewayEvent{

    let event: APIGatewayEvent

    const identity = {
      accessKey: null,
        accountId: null,
        apiKey: null,
        apiKeyId: null,
        caller: null,
        clientCert: null,
        cognitoAuthenticationProvider: null,
        cognitoAuthenticationType: null,
        cognitoIdentityId:  null,
        cognitoIdentityPoolId: null,
        principalOrgId: null,
        sourceIp: "",
        user: null,
        userAgent: null,
        userArn: null
      }
      event = {
        headers: {},
        multiValueHeaders: {},
        httpMethod: "",
        isBase64Encoded: true,
        path: "",
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {accountId: "",
          apiId: "",
          authorizer: null,
          protocol: "",
          httpMethod: "",
          identity: identity,
          path: "",
          stage: "",
          requestId: "",
          requestTimeEpoch: 0,
          resourceId: "",
          resourcePath: ""
        },
        resource: "",
        pathParameters: this.pathParameters,
        body: this.body
      } as APIGatewayEvent

      return event
  }

}

