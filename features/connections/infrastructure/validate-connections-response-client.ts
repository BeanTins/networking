import  { SQSClient, 
  GetQueueUrlCommand, 
  SendMessageCommand } from "@aws-sdk/client-sqs"
import logger from "../../../infrastructure/lambda-logger"

interface ValidateConnectionsResponseClientParameters{
  region: string
  queueName: string
}

export interface ValidateConnectionResponse {
    correlationId: string
    validated: boolean
}

export class ValidateConnectionsResponseClient {
  public readonly sqsClient: SQSClient
  private url: string
  private queueName: string
  constructor(parameters: ValidateConnectionsResponseClientParameters) {
    this.sqsClient = new SQSClient({ region: parameters.region })
    this.queueName = parameters.queueName
  }

  async getUrl()
  {
    if (this.url == undefined)
    {
      const input = {
        QueueName: this.queueName,
      }
  
      try {
  
        const command = new GetQueueUrlCommand(input)
        const response = await this.sqsClient.send(command)
    
        logger.verbose("validate connection response queue url - " + JSON.stringify(response))
        this.url = response.QueueUrl!
      }
      catch(error)
      {
        logger.error("Failed to get validate connection response queue url -  " + error)
        throw error
      }
    }

    return this.url
  }

  async send(validateResponse: ValidateConnectionResponse)
  {
    const url = await this.getUrl()

    try {
      const params = {
        QueueUrl: url,
        MessageBody: JSON.stringify(
            validateResponse
        )
      }   
      const command = new SendMessageCommand(params)

      logger.verbose("validate connections response - " + JSON.stringify(params))

      const response = await this.sqsClient.send(command)
    }
    catch(error)
    {
      logger.error("Failed to send event - " + error)
      throw error
    }
  }
}