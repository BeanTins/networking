import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient, ScanCommand, DeleteCommand, PutCommand } from "@aws-sdk/lib-dynamodb"
import logger from "./service-test-logger"

interface ConnectionParameters{
  tableName: string
}
export class ConnectionsAccessor {
  
  private dynamoDB: DynamoDBDocumentClient
  private TableName: string

  constructor(region: string, parameters: ConnectionParameters)
  {
    const client = new DynamoDBClient({region: region})
    this.dynamoDB = DynamoDBDocumentClient.from(client)
    this.TableName = parameters.tableName
  }

  async clear()
  {
    const queryTableName = {
        TableName: this.TableName
    }
    
    const items =  await this.dynamoDB.send(new ScanCommand(queryTableName))
    const tableName = this.TableName
    const dynamoDB = this.dynamoDB
  
    if (items.Items) {
      for await (const item of items.Items){
  
          var record = {
              TableName: tableName,
              Key: {"networkerId": item["networkerId"]}
          };
  
          logger.verbose("Clearing connections - " + JSON.stringify(record))
          
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

  async add(networkerId: string, connectedToNetworkerId: string)
  {
    const putTableCommand = {
        TableName: this.TableName,
        Item: {"networkerId": networkerId, connectedToNetworkerId: connectedToNetworkerId}
    }
    
    try
    {
      await this.dynamoDB.send(new PutCommand(putTableCommand))
    }
    catch(error)
    {
      logger.error("Failed to add record to table " + this.TableName + " - " + error)
    }
  }

}
