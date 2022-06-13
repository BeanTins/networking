import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient, ScanCommand, DeleteCommand, PutCommand } from "@aws-sdk/lib-dynamodb"
import logger from "../../../../test-helpers/component-test-logger"

interface ConnectionRequestParameters{
  tableName: string
}
export class ConnectionRequestAccessor {
  
  private dynamoDB: DynamoDBClient
  private tableName: string

  constructor(region: string, parameters: ConnectionRequestParameters)
  {
    const client = new DynamoDBClient({region: region})
    this.dynamoDB = DynamoDBDocumentClient.from(client)

    this.tableName = parameters.tableName
  }

  async clear()
  {
    const queryTableName = {
        TableName: this.tableName
    }
    
    const items =  await this.dynamoDB.send(new ScanCommand(queryTableName))
    const tableName = this.tableName
    const dynamoDB = this.dynamoDB
  
    if (items.Items) {
      for await (const item of items.Items){
  
          var record = {
              TableName: tableName,
              Key: {"invitationId": item["invitationId"]}
          };
  
          logger.verbose("Clearing connection request - " + JSON.stringify(record))
          
          try
          {
              await dynamoDB.send(new DeleteCommand(record))
          }
          catch(error)
          {
            logger.error("Failed to clear record from " + tableName + " - " + error)
          }
      }
    }
  } 

  async add(initiatingMemberId: string, invitedMemberId: string, invitationId: string)
  {
    try
    {
      const items =  await this.dynamoDB.send(new PutCommand({
          TableName: this.tableName,
          Item: {
            "initiatingMemberId" : initiatingMemberId,
            "invitedMemberId" : invitedMemberId,
            "invitationId" : invitationId
          }
        }))
    }
    catch(error)
    {
      logger.error("Failed to add connection request " + error)
    }
  }

  async waitForRemoval(initiatingMemberId: string, invitedMemberId: string, retries: number = 3, retryWaitInMillisecs = 500)
  {
    let itemRemoved: boolean = false
    var params = {
      FilterExpression: "#initiatingMemberId = :initiatingMemberId AND #invitedMemberId = :invitedMemberId",
      ExpressionAttributeValues: {
        ":initiatingMemberId": initiatingMemberId,
        ":invitedMemberId": invitedMemberId,
      },
      ExpressionAttributeNames: 
       { "#initiatingMemberId": "initiatingMemberId",
         "#invitedMemberId": "invitedMemberId" },
      TableName: this.tableName
    }
    logger.verbose(JSON.stringify(params))
    try{
      for (let retry = 0; retry < retries; retry++) {
        let result = await this.dynamoDB.send(new ScanCommand(params))
        logger.verbose("wait for connection request removal - " + JSON.stringify(result))
        if((result.Count != null) && result.Count == 0)
        {
          itemRemoved = true
          break
        }
        await new Promise(r => setTimeout(r, retryWaitInMillisecs * Math.pow(2, retry)))
      }
    }
    catch(err){
      logger.error(err)
    }
 
    return itemRemoved
  }


}

