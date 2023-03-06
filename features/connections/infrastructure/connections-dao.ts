import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient, TransactWriteCommand, QueryCommand } from "@aws-sdk/lib-dynamodb"
import logger from "../../../infrastructure/lambda-logger"

export class Connection {
  public networkerId: string
  public connectedToNetworkerId: string

  static create(networkerId: string, connectedToNetworkerId: string){
    let connection = new Connection()

    connection.networkerId = networkerId
    connection.connectedToNetworkerId = connectedToNetworkerId

    return connection
  }
}

export class ConnectionsDAO
{
    private dynamoDB: DynamoDBDocumentClient
    private tableName: string
  
    constructor(region: string)
    {
      const client = new DynamoDBClient({region: region});
      this.dynamoDB = DynamoDBDocumentClient.from(client);
      
      this.tableName = process.env.ConnectionsTable!
    }

    async add(firstNetworkerId: string, secondNetworkerId: string)
    {
      try
      {
        const result = await this.dynamoDB.send(
          new TransactWriteCommand({
            TransactItems: [
              {
                Put: {
                  TableName: this.tableName,
                  Item: {
                    networkerId: firstNetworkerId, 
                    connectionNetworkerId: secondNetworkerId,
                  }
                }
              },
              {
                Put: {
                  TableName: this.tableName,
                  Item: {
                    networkerId: secondNetworkerId, 
                    connectionNetworkerId: firstNetworkerId,
                  }
                }
              }
            ]
          })
        )
      }
      catch(err){
        logger.error(err)
      }
    }

    async isInstigatorConnectedWithEveryone(instigatorNetworkerId: string, otherPartipantIds: Set<string>): Promise<boolean>
    {
      let connectedToAll: boolean = false

      var connectedToNetworkersObject: any = {}
      var index = 0;
      otherPartipantIds.forEach(function(value) {
          index++;
          var titleKey = ":connectedToNetworkerId"+index
          connectedToNetworkersObject[titleKey.toString()] = value
      })

      var params = {
        KeyConditionExpression: "#networkerId = :networkerId",
        FilterExpression: "#connectedToNetworkerId IN ("+Object.keys(connectedToNetworkersObject).toString()+ ")",
        ExpressionAttributeValues: {...connectedToNetworkersObject,":networkerId": instigatorNetworkerId},
        ExpressionAttributeNames: { "#connectedToNetworkerId": "connectedToNetworkerId" , "#networkerId": "networkerId"},
        TableName: this.tableName 
      }
      logger.verbose(JSON.stringify(params))
      try{
          let result = await this.dynamoDB.send(new QueryCommand(params))
          logger.verbose("wait for connections query result - " + JSON.stringify(result))
          if((result.Count != null) && result.Count == otherPartipantIds.size)
          {
            connectedToAll = true
          }
        }
      catch(err){
        logger.error("connection table query failed with " + JSON.stringify(err))
      }
    
      return connectedToAll
    }
    

    async exists(firstNetworkerId: string, secondNetworkerId: string): Promise<boolean>
    {
      let connectionExists: boolean = false

      var params = {
        KeyConditionExpression: "#networkerId = :networkerId and #connectedToNetworkerId = :connectedToNetworkerId",
        ExpressionAttributeValues: { ":networkerId": firstNetworkerId, ":connectedToNetworkerId": secondNetworkerId},
        ExpressionAttributeNames: {"#networkerId": "networkerId", "#connectedToNetworkerId": "connectedToNetworkerId"},
        TableName: this.tableName
      }
      try{
          let result = await this.dynamoDB.send(new QueryCommand(params))
          logger.verbose("active member query result - " + result)
          if((result.Count != null) && result.Count > 0)
          {
            connectionExists = true
          }
      }
      catch(err){
        logger.error(err)
      }

      return connectionExists
    }
  
}

