import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb"
import logger from "../../../infrastructure/lambda-logger"

export interface Networker {
  id: string
  email: string
  name: string
}

export class NetworkerDAO
{
  private dynamoDB: DynamoDBClient
  private tableName: string

  constructor(region: string) {
    const client = new DynamoDBClient({region: region})
    this.dynamoDB = DynamoDBDocumentClient.from(client, {marshallOptions: {convertEmptyValues: true, convertClassInstanceToMap:true}})
    this.tableName = process.env.NetworkerProjection!
  }

  async save(networker: Networker)
  {
    try
    {
      const result = await this.dynamoDB.send(new PutCommand({
        TableName: this.tableName,
        Item: networker
      }))
    } 
    catch(err)
    {
      logger.error("networker save failed " + JSON.stringify(err))
    }
  } 

  async load(id: string)
  {
    let networker
    try
    {
      const result = await this.dynamoDB.send(new GetCommand({
        TableName: this.tableName,
        Key: {
          id: id
        }
      }))

      if (result.Item != undefined)
      {
        networker = {id: result.Item.id, name: result.Item.name, email: result.Item.email}
      }
    } 
    catch(err)
    {
      logger.error("networker retrieval failed with " + JSON.stringify(err))
    }

    return networker
  }

  async exists(id: string): Promise<boolean>
  {
    return await this.load(id) != null
  }

}

