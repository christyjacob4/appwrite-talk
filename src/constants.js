export const APPWRITE_ENDPOINT = 'https://demo.appwrite.io/v1';
export const APPWRITE_PROJECT_ID = 'appwrite-meetup';
export const APPWRITE_DATABASE_ID = 'main';
export const COLLECTION_ROOMS = 'rooms';
export const COLLECTION_MESSAGES = 'messages';
export const TYPE_VIDEO_OFFER = 'video-offer';
export const TYPE_VIDEO_ANSWER = 'video-answer';
export const TYPE_ICE_CANDIDATE = 'new-ice-candidate';
export const TYPE_HANG_UP = 'hang-up';

export const servers = {
    iceServers: [
        {
            urls: "stun:relay.metered.ca:80",
        },
        {
            urls: "turn:relay.metered.ca:80",
            username: "bad128070e40b7a8b3670338",
            credential: "7sFoXt+jTLSL4Wa2",
        },
        {
            urls: "turn:relay.metered.ca:443",
            username: "bad128070e40b7a8b3670338",
            credential: "7sFoXt+jTLSL4Wa2",
        },
        {
            urls: "turn:relay.metered.ca:443?transport=tcp",
            username: "bad128070e40b7a8b3670338",
            credential: "7sFoXt+jTLSL4Wa2",
        }
    ]
}