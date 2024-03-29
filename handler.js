'use strict';

const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

const {
  graphql,
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLString,
  GraphQLNonNull
} = require('graphql');

const promisify = foo => new Promise((resolve, reject) => {
  foo((error, result) => {
    if (error) {
      reject(error)
    } else {
      resolve(result)
    }
  })
});

const getGreeting = firstName => promisify(callback =>
    dynamoDb.get({
      TableName: process.env.DYNAMODB_TABLE,
      Key: {
        firstName
      },
    }, callback))
  .then(result => {
    if (!result.Item) {
      return firstName
    }
    return result.Item.nickname
  })
  .then(name => `Hello, ${name}.`)

const changeNickname = (firstName, nickname) => promisify(callback =>
    dynamoDb.update({
      TableName: process.env.DYNAMODB_TABLE,
      Key: {
        firstName
      },
      UpdateExpression: 'SET nickname = :nickname',
      ExpressionAttributeValues: {
        ':nickname': nickname
      }
    }, callback))
  .then(() => nickname)

const schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    /* unchanged */
  }),
  mutation: new GraphQLObjectType({
    name: 'RootMutationType',
    fields: {
      changeNickname: {
        args: {

          firstName: {
            name: 'firstName',
            type: new GraphQLNonNull(GraphQLString)
          },
          nickname: {
            name: 'nickname',
            type: new GraphQLNonNull(GraphQLString)
          }
        },
        type: GraphQLString,

        resolve: (parent, args) => changeNickname(args.firstName, args.nickname)
      }
    }
  })
})

module.exports.hello = async event => {
  return {
    statusCode: 200,
    body: JSON.stringify({
        message: 'Go Serverless v1.0! Your function executed successfully!',
        input: event,
      },
      null,
      2
    ),
  };
}

module.exports.query = (event, context, callback) => graphql(schema, event.queryStringParameters.query)
  .then(
    result => callback(null, {
      statusCode: 200,
      body: JSON.stringify(result)
    }),
    err => callback(err)
  );