import  { SQSClient, 
    ReceiveMessageCommand, 
    GetQueueUrlCommand, 
    ReceiveMessageResult,
    SendMessageCommand,
    DeleteMessageCommand } from "@aws-sdk/client-sqs"
 
import logger from "../../../../test-helpers/service-test-logger"

interface ValidateParameters{
    requestQueueName: string
    responseQueueName: string        
}

export interface ValidationRequest
{
  correlationId: string,
  initiatingNetworkerId: string,
  requestedConnectionNetworkerIds: string[]
}

export class ValidationClient
{
  public readonly sqsClient: SQSClient
  private requestUrl: string
  private responseUrl: string
  private requestQueueName: string
  private responseQueueName: string
  constructor(region: string, parameters: ValidateParameters) {
    this.sqsClient = new SQSClient({ region: region })
    this.requestQueueName = parameters.requestQueueName
    this.responseQueueName = parameters.responseQueueName
  }

  async getRequestUrl()
  {
    if (this.requestUrl == undefined)
    {
      const input = {
        QueueName: this.requestQueueName,
      }
  
      try {
  
        const command = new GetQueueUrlCommand(input)
        const response = await this.sqsClient.send(command)

        logger.verbose("validate request queue url response - " + JSON.stringify(response))
        this.requestUrl = response.QueueUrl!
      }
      catch(error)
      {
        logger.error("Failed to get validate request queue url -  " + error)
        throw error
      }
    }

    return this.requestUrl
  }

  async getResponseUrl()
  {
    if (this.responseUrl == undefined)
    {
      const input = {
        QueueName: this.responseQueueName,
      }
  
      try {
  
        const command = new GetQueueUrlCommand(input)
        const response = await this.sqsClient.send(command)
    
        logger.verbose("validate response queue url response - " + JSON.stringify(response))
        this.responseUrl = response.QueueUrl!
      }
      catch(error)
      {
        logger.error("Failed to get validate response queue url -  " + error)
        throw error
      }
    }

    return this.responseUrl
  }

  async request(validationRequest: ValidationRequest)
  {
    const url = await this.getRequestUrl()

    try {
      const params = {
        QueueUrl: url,
        WaitTimeSeconds: 10,
        MessageBody: JSON.stringify(validationRequest)
      }   
      const command = new SendMessageCommand(params)

      logger.verbose("receive validate request command - " + JSON.stringify(command))

      const response = await this.sqsClient.send(command)
  
      logger.verbose("validate request queue response - " + JSON.stringify(response))
    }
    catch(error)
    {
      logger.error("Failed to receive event -  " + error)
      throw error
    }

  }  

  async waitForResponse()
  {
    let event: any
    const url = await this.getResponseUrl()

    try {
      const params = {
        QueueUrl: url,
        WaitTimeSeconds: 10
      }   
      const command = new ReceiveMessageCommand(params)

      logger.verbose("receive validate response command - " + JSON.stringify(command))

      let response: ReceiveMessageResult
      response = await this.sqsClient.send(command)
  
      logger.verbose("validate response queue response - " + JSON.stringify(response))

      if (response.Messages != undefined && response.Messages.length > 0)
      {
        const message = response.Messages[0]

        const body = message.Body!

        const bodyObject = JSON.parse(body)

        event = bodyObject

        await this.deleteMessage(message.ReceiptHandle!, url)
      }
    }
    catch(error)
    {
      logger.error("Failed to receive event -  " + error)
      throw error
    }

    return event

  }

  async clear()
  {
    await this.clearQueue(await this.getResponseUrl())
    await this.clearQueue(await this.getRequestUrl())
  }

  async clearQueue(url: string)
  {
    try {
      const params = {
        QueueUrl: url,
        MaxNumberOfMessages: 10
      }   
      const command = new ReceiveMessageCommand(params)
    
      let response: ReceiveMessageResult
      do
      {
        response = await this.sqsClient.send(command)
  
        logger.verbose("event listener clear response - " + JSON.stringify(response))
        if (response.Messages != undefined && response.Messages.length > 0)
        {
          for (const message of response.Messages)
          {
            await this.deleteMessage(message.ReceiptHandle!, url)
            logger.verbose("Deleted queue message - " + JSON.stringify(message))
          }
        }
      } while((response.Messages != undefined) && (response.Messages.length < 10))
    }
    catch(error)
    {
      logger.error("Failed to delete queue message -  " + error)
      throw error
    }
  }  

  async deleteMessage(receiptHandle: string, url: string)
  {
    try {
      const params = {
        QueueUrl: url,
        ReceiptHandle: receiptHandle
      }   
  
      const command = new DeleteMessageCommand(params)

      const response = await this.sqsClient.send(command)

      logger.verbose("validate queue delete message response - " + JSON.stringify(response))
    }
    catch(error)
    {
      logger.error("Failed to delete validate queue message -  " + error)
      throw error
    }
  }    
}