import { APIGatewayProxyHandler } from 'aws-lambda';
import 'source-map-support/register';
import * as AWS from 'aws-sdk';
import apiResponses from '../shared/apiResponses';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { Song } from '../shared/types'; 

const ddbDocClient = createDDbDocClient();
const translate = new AWS.Translate();

export const handler: APIGatewayProxyHandler = async (event) => {
    const albumName = event.queryStringParameters?.albumName;
    const language = event.queryStringParameters?.language;

    if (!albumName) {
        return apiResponses._400({ message: 'Missing albumName in query parameters' });
    }

    if (!language) {
        return apiResponses._400({ message: 'Missing language in query parameters' });
    }

    try {
        const commandInput = {
            TableName: process.env.TABLE_NAME,
            KeyConditionExpression: "album_name = :album_name",
            ExpressionAttributeValues: {
                ":album_name": albumName,
            },
        };
       
        const commandOutput = await ddbDocClient.send(new QueryCommand(commandInput));
        console.log("Query Output:", JSON.stringify(commandOutput, null, 2))
        
        const albumDetails = (commandOutput.Items?.[0] || {}) as Song;

        if (!albumDetails) {
        console.error("Album not found")
            return apiResponses._400({ message: 'Album not found' });
        }

        const fieldsToTranslate: (keyof Song)[] = ['artist', 'genre', 'song_title'];
        const translatedDetails: any = {};

        for (const field of fieldsToTranslate) {
            if (albumDetails[field] && typeof albumDetails[field] === "string") {
                const translateParams: AWS.Translate.Types.TranslateTextRequest = {
                    Text: albumDetails[field],
                    SourceLanguageCode: 'en',
                    TargetLanguageCode: language,
                };
                const translated = await translate.translateText(translateParams).promise();
                translatedDetails[field] = translated.TranslatedText;
            } else {
                translatedDetails[field] = albumDetails[field];
            }
        }

        return apiResponses._200({ translatedAlbum: { ...albumDetails, ...translatedDetails } });

    } catch (error) {
        console.error('Error fetching or translating album:', error);
        return apiResponses._500({ message: 'Unable to process album translation' });
    }
}

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
