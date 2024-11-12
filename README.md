Distributed Systems - CA1

## Serverless REST Assignment - Distributed Systems.

__Name:__ ....your name .....

__Demo:__ ... link to your YouTube video demonstration ......

### Context.
I added a table which holds musical albums the partition key is the album name and the sort key is the song title. It also holds details in genre, release ate and track length.

### App API endpoints.

[ Provide a bullet-point list of the app's endpoints (excluding the Auth API) you have successfully implemented. ]
e.g.
 
+ POST /songs - add an album and songs to the table 
+ GET /songs/{partition-key}/ - Get all songs by album name
+ GET/songs/{partition-key}?attributeX=value - Get a specific song by album name and song title
+ PUT /songs/?{partition-key}attributesX=value - update details of a song.
+ translate /translate/?{partition-key}&attributeX=value - translate a songs text.



### Update constraint (if relevant).

PUT and POST are behind a protected route so that only verifiied users can add albums or make changes to existing ones. The Authorisation happens seperately as a service using the same layout as had been shown in the labs and refactored to fit the new project.

