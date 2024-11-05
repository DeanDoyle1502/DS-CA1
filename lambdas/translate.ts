import { APIGatewayProxyHandler } from 'aws-lambda';
import 'source-map-support/register';
import * as AWS from 'aws-sdk'
import apiResponses from '../shared/apiResponses';


export const handler: APIGatewayProxyHandler = async (event) => {
    if (!event.body) {
        return apiResponses._400({ message: 'Missing body' })
    }
    const translate = new AWS.Translate();
    const body = JSON.parse(event.body || '{}');
    const { text, language } = body;

    if (!text) {
        return apiResponses._400({ message: 'missing text fom the body' });
    }
    if (!language) {
        return apiResponses._400({ message: 'missing language from the body' });
    }

    try {
        const translateParams: AWS.Translate.Types.TranslateTextRequest = {
            Text: text,
            SourceLanguageCode: 'en',
            TargetLanguageCode: language,
        };
        const translatedMessage = await translate.translateText(translateParams).promise();
        return apiResponses._200({ translatedMessage });
    } catch (error) {
        console.log('error in the translation', error);
        return apiResponses._400({ message: 'unable to translate the message' });

    }

};