import { Handler } from "aws-lambda";
import { DynamoDBClient, ReturnValue } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const ddbDocClient = createDDbDocClient();

export const handler: Handler = async (event) => {
  try {
    const { album_name, song_title, artist, genre, track_length, released } = JSON.parse(event.body); 

    
    if (!album_name || !song_title) {
      return {
        statusCode: 400, 
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ message: "Album name and song title are required." }),
      };
    }

    const updates: string[] = [];
    const expressionAttributeValues: any = {};

    if (genre !== undefined) {
      updates.push("genre = :genre");
      expressionAttributeValues[":genre"] = genre;
    }
    if (artist !== undefined) {
        updates.push("artist = :artist");
        expressionAttributeValues[":artist"] = artist;
    }
    if (track_length !== undefined) {
        updates.push("track_length = :track_length");
        expressionAttributeValues[":track_length"] = track_length;
    }
    if (released !== undefined) {
        updates.push("released = :released");
        expressionAttributeValues[":released"] = released;
    }

    
    if (updates.length === 0) {
      return {
        statusCode: 400, 
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ message: "No updates provided." }),
      };
    }

    const updateExpression = `SET ${updates.join(", ")}`;

    const commandInput = {
      TableName: process.env.TABLE_NAME,
      Key: {
        album_name,
        song_title,
      },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: ReturnValue.UPDATED_NEW,
    };

    const commandOutput = await ddbDocClient.send(new UpdateCommand(commandInput));

    if (!commandOutput.Attributes) {
      return {
        statusCode: 404, 
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ message: "Song not found" }),
      };
    }

    return {
      statusCode: 200, 
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ updatedItem: commandOutput.Attributes }),
    };
  } catch (error: any) {
    console.error("Error updating song:", error);
    return {
      statusCode: 500, 
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ error: error.message }),
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
