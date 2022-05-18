import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient, TransactWriteCommand, QueryCommand } from "@aws-sdk/lib-dynamodb"
import logger from "./logger"

export class Connection {
  public memberId: string
  public connectedToMemberId: string

  static create(memberId: string, connectedToMemberId: string){
    let connection = new Connection()

    connection.memberId = memberId
    connection.connectedToMemberId = connectedToMemberId

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

    async add(firstMemberId: string, secondMemberId: string)
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
                    memberId: firstMemberId, 
                    connectionMemberId: secondMemberId,
                  }
                }
              },
              {
                Put: {
                  TableName: this.tableName,
                  Item: {
                    memberId: secondMemberId, 
                    connectionMemberId: firstMemberId,
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

    async exists(firstMemberId: string, secondMemberId: string): Promise<boolean>
    {
      let connectionExists: boolean = false

      var params = {
        KeyConditionExpression: "#memberId = :memberId and #connectedToMemberId = :connectedToMemberId",
        ExpressionAttributeValues: { ":memberId": firstMemberId, ":connectedToMemberId": secondMemberId},
        ExpressionAttributeNames: {"#memberId": "memberId", "#connectedToMemberId": "connectedToMemberId"},
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

