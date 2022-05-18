export class DataMapperMock{

  put: jest.Mock
  query: jest.Mock
  get: jest.Mock
  delete: jest.Mock

  constructor(){
    this.get = jest.fn()
    this.put = jest.fn()
    this.query = jest.fn()
    this.delete = jest.fn()
  }

  queryResponse(records: any[]){

    const myAsyncIterable = {
      *[Symbol.asyncIterator]() {
        for (const record of records)
        {
          yield record
        }
      }
    }

    this.query.mockReturnValue(myAsyncIterable)
  }

  queryUsingSet(set: any[], keyName: string)
  {
    this.queryFake((valueConstructor, keyCondition) => {

      var matches = set.filter(obj => {
        return keyCondition[keyName] == obj[keyName]
      })

      const myAsyncIterable = {
        *[Symbol.asyncIterator]() {
          for (const match of matches)
          yield match
        }
      }

      return myAsyncIterable
    })
  } 

  queryFake(fake: (classType: any, filter: any)=>any){
    
    this.query = jest.fn()
    this.query.mockImplementation(fake)
  }

  querySequenceResponses(recordsSequence: any[][]){

    for (const currentRecords of recordsSequence)
    {
      const myAsyncIterable = {
      *[Symbol.asyncIterator]() {
          for (const record of currentRecords)
          {
            yield record
          }
        }
      }
      this.query.mockReturnValueOnce(myAsyncIterable)
    }
  }

}

export class DataMapperFactoryMock{

  private dataMappers: Map<string, DataMapperMock>

  constructor(){
    this.dataMappers = new Map()
  }

  create(typeName: string)
  {
    const dataMapper = new DataMapperMock()
    this.dataMappers.set(typeName, dataMapper)
    return dataMapper
  }
  map(){
    return jest.fn().mockImplementation(() => {
      return {
        put: (item: any) => {
          const dataMapper = this.resolveDataMapper(item, "put")
          return dataMapper!.put(item)
        },
        get: (item: any) => {
          const dataMapper = this.resolveDataMapper(item, "get")
          return dataMapper!.get(item)
        },
        query: (valueConstructor: any, keyCondition: any) => {
          const dataMapper = this.resolveDataMapper(valueConstructor, "query")
          const result = dataMapper!.query(valueConstructor, keyCondition)
          return result
        },
        delete: (item: any) => {
          const dataMapper = this.resolveDataMapper(item, "delete")
          return dataMapper!.delete(item)
        }
      }
    })
  }

  resolveDataMapper(item: any, method: string)
  {
    let itemName = item.name
    if (itemName == undefined)
    {
      itemName = item.constructor.name
    }
    if (itemName == undefined)
    {
      throw Error("no name found for datamapper record type" + JSON.stringify(item)) 
    }

    const dataMapper = this.dataMappers.get(itemName)

    if (dataMapper == undefined)
    {
      throw Error("no datamapper found for " + JSON.stringify(item) + method)
    }
    return dataMapper
  }
 
}


