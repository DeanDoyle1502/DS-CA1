import { Handler } from "aws-lambda";

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

const ddbDocClient = createDDbDocClient();

export const handler: Handler = async (event, context) => {
  try {
    
    console.log("Event: ", JSON.stringify(event?.queryStringParameters));
    const parameters = event?.queryStringParameters;
    const albumName = parameters.albumName ? parameters.albumName : undefined;
    const songTitle = parameters.songTitle ? parameters.songTitle : undefined;


    if (!albumName) {
      return {
        statusCode: 404,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ Message: "Album not found" }),
      };
    }

    const commandInput = {
      TableName: process.env.TABLE_NAME,
      KeyConditionExpression: "album_name = :album_name",
      ExpressionAttributeValues: {
        ":album_name": albumName,
      },
    };

    const commandOutput = await ddbDocClient.send(new QueryCommand(commandInput));

    let songQuery = commandOutput.Items || [];
    if (songTitle) {
      songQuery = songQuery.filter((song) => song.song_title === songTitle);
    }

    

    
    if (!commandOutput.Items) {
      return {
        statusCode: 404,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ Message: "Invalid Album Name or Song Title" }),
      };
    }
    const body = {
      data: songQuery,
    };

    // Return Response
    return {
      statusCode: 200,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ data: songQuery }),
    };
  } catch (error: any) {
    console.log(JSON.stringify(error));
    return {
      statusCode: 500,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ error }),
    };
  }
};

function createDDbDocClient() {
  const ddbClient = new DynamoDBClient({ region: process.env.REGION });
  const marshallOptions = {
    convertEmptyValues: true,
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  };
  const unmarshallOptions = {
    wrapNumbers: false,
  };
  const translateConfig = { marshallOptions, unmarshallOptions };
  return DynamoDBDocumentClient.from(ddbClient, translateConfig);
}
