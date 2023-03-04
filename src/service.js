import { account, databases } from "./client"
import { APPWRITE_DATABASE_ID, COLLECTION_MESSAGES, COLLECTION_ROOMS } from "./constants"
import { createToastError, createToastSuccess } from "./utils"

export const createAccount = async () => {
}

export const getAccount = async (silent = true) => {
}

export const createRoom = async (roomId, caller) => {
}

export const updateRoom = async (roomId, caller, callee, silent = true) => {
}

export const getMessages = async (queries) => {
}

export const getRoom = async (roomId) => {
}

export const sendToServer = async (message) => {
};