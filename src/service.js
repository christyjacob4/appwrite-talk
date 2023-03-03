import { account, databases } from "./client"
import { APPWRITE_DATABASE_ID, COLLECTION_MESSAGES, COLLECTION_ROOMS } from "./constants"
import { createToastError, createToastSuccess } from "./utils"

export const createAccount = async () => {
    try {
        return await account.createAnonymousSession()
    } catch (error) {
        createToastError(error.message)
    }
}

export const getAccount = async (silent = true) => {
    try {
        return await account.get()
    } catch (error) {
        !silent && createToastError(error.message)
    }
}

export const createRoom = async (roomId, caller) => {
    try {
        let res = await databases.createDocument(APPWRITE_DATABASE_ID, COLLECTION_ROOMS, roomId, {
            caller
        })
        createToastSuccess('Room created!')
        return res;
    } catch (error) {
        createToastError(error.message)
    }
}

export const updateRoom = async (roomId, caller, callee, silent = true) => {
    try {
        let res = await databases.updateDocument(APPWRITE_DATABASE_ID, COLLECTION_ROOMS, roomId, {
            caller,
            callee
        })
        !silent && createToastSuccess('Room updated successfully')
        return res;
    } catch (error) {
        console.log(error)
    }
}

export const getMessages = async (queries) => {
    try {
        let results = await databases.listDocuments(
            APPWRITE_DATABASE_ID,
            COLLECTION_MESSAGES,
            queries
        );
        return results;
    } catch (error) {
        console.log(error)
    }
}

export const getRoom = async (roomId) => {
    try {
        let res = await databases.getDocument(APPWRITE_DATABASE_ID, COLLECTION_ROOMS, roomId)
        return res;
    } catch (error) {
        console.log(error)
    }
}

export const sendToServer = async (message) => {
    await databases.createDocument(APPWRITE_DATABASE_ID, COLLECTION_MESSAGES, 'unique()', {
        ...message,
        payload: JSON.stringify(message.payload)
    });
};