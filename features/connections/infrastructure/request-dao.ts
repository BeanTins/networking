import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand, QueryCommand } from "@aws-sdk/lib-dynamodb"
import logger from "../../../infrastructure/lambda-logger"
import { v4 as uuidv4 } from "uuid"
 
export class ConnectionRequest {
  invitationId: string
  initiatingNetworkerId: string
  invitedNetworkerId: string
}

export class RequestDAO
{
  private dynamoDB: DynamoDBDocumentClient
  private tableName: string

  constructor(region: string)
  {
    const client = new DynamoDBClient({region: region});
    this.dynamoDB = DynamoDBDocumentClient.from(client);
    
    this.tableName = process.env.ConnectionRequestTable!
  }

  async add(initiatingNetworkerId: string,
            invitedNetworkerId: string)
  {
    let request = {
      invitationId: uuidv4(),
      initiatingNetworkerId: initiatingNetworkerId,
      invitedNetworkerId: invitedNetworkerId
    }
    try
    {
      const result = await this.dynamoDB.send(new PutCommand({
        TableName: this.tableName,
        Item: request
      }))
    } 
    catch(err)
    {
      logger.error("connection request save failed " + JSON.stringify(err))
    }
  }

  async remove(invitationId: string)
  {
    try
    {
      const result = await this.dynamoDB.send(new DeleteCommand({
        TableName: this.tableName,
        Key: {
          invitationId: invitationId
        }
      }))
    } 
    catch(err)
    {
      logger.error("connection request remove failed " + JSON.stringify(err))
    }
  }

  async get(invitationId: string)
  {
    let request
    try
    {
      const result = await this.dynamoDB.send(new GetCommand({
        TableName: this.tableName,
        Key: {
          invitationId: invitationId
        }
      }))
      request = result.Item
      logger.verbose("retrieved invitationId " + invitationId + " with result " + JSON.stringify(result))
    } 
    catch(err)
    {
      logger.error("connection request retrieval failed for invitationId: " +
                   invitationId + 
                   " with " + 
                   JSON.stringify(err))
    }

    return request
  }

  async getInvitationId(initiatingNetworkerId: string, invitedNetworkerId: string): Promise<string|undefined>  
  {
    let invitationId
    try
    {
      const result = await this.dynamoDB.send(new QueryCommand({
        TableName: this.tableName,
        IndexName: "networkersIndex",
        KeyConditionExpression: "initiatingNetworkerId = :initiatingNetworkerId AND invitedNetworkerId = :invitedNetworkerId",
        ExpressionAttributeValues: {
          ":initiatingNetworkerId": initiatingNetworkerId,
          ":invitedNetworkerId": invitedNetworkerId
        }        
      }))

      logger.verbose("retrieved initiatingNetworkerId " + invitationId + " invitedNetworkerId " + invitedNetworkerId + " with result " + JSON.stringify(result))

      if (result.Items != undefined)
      {
        invitationId = result.Items[0].invitationId
      }
    } 
    catch(err)
    {
      logger.error("connection request invitiation id retrieval failed for initiatingNetworkerId: ", +
      initiatingNetworkerId + 
      " , invitedNetworkerId: " +
      invitedNetworkerId +
      "with " +
      JSON.stringify(err))
    }

    return invitationId
  }

  async exists(invitationId: string): Promise<boolean>
  {
    return await this.get(invitationId) != null
  }

}

