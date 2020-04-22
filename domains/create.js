"use strict";

const _db = require("../_dynamodb");
const middy = require("middy");
const {
  cors,
  jsonBodyParser,
  validator,
  httpErrorHandler,
} = require("middy/middlewares");

const createDomain = async (event, context) => {
  const { domain, idp, tenant, verified } = event.body;

  try {
    const params = {
      TableName: process.env.DOMAINS_TABLE,
      Item: {
        domain,
        idp,
        tenant,
        verified,
        created: new Date().getTime(),
      },
      ConditionExpression: "attribute_not_exists(#domain)",
      ExpressionAttributeNames: { "#domain": "domain" },
    };

    // write the domain entry to the database
    console.log("Writing to dynamo DB", JSON.stringify(params));

    let result = await _db.client.put(params).promise();
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params.Item),
    };
  } catch (error) {
    console.log("error", error);

    return {
      statusCode: error.statusCode || 500,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        error: `Could not add the domain for the IdP. Reason: ${error.code}`,
      }),
    };
  }
};

const inputSchema = {
  type: "object",
  properties: {
    body: {
      type: "object",
      properties: {
        domain: { type: "string" },
        tenant: { type: "string" },
        idp: { type: "string" },
        verified: { type: "boolean" },
      },
      required: ["domain", "tenant", "idp"], // Insert here all required event properties
    },
  },
};

const handler = middy(createDomain)
  .use(jsonBodyParser()) // parses the request body when it's a JSON and converts it to an object
  .use(validator({ inputSchema })) // validates the input
  .use(httpErrorHandler()) // handles common http errors and returns proper responses
  .use(cors()); // Adds CORS headers to responses

module.exports = { handler };
