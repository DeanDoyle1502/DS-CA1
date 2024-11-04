import { marshall } from "@aws-sdk/util-dynamodb";
import { Song } from "./types";

export const generateSongItem = (song: Song) => {
  return {
    PutRequest: {
      Item: marshall(song),
    },
  };
};

export const generateBatch = (data: Song[]) => {
  return data.map((e) => {
    return generateSongItem(e);
  });
};
