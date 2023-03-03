import { toast } from '@zerodevx/svelte-toast'

export const parseMessage = async (message) => {
    let payload = JSON.parse(message.payload);
    return {
        ...message,
        payload
    };
};

export const reportError = (errMessage) => {
    log_error(`Error ${errMessage.name}: ${errMessage.message}`);
}

export const log = (text) => {
    var time = new Date();
    console.log("[" + time.toLocaleTimeString() + "] " + text);
}

function log_error(text) {
    var time = new Date();
    console.trace("[" + time.toLocaleTimeString() + "] " + text);
}

export const createToast = (message, theme) => {
    toast.push(message, {
        theme
    })
}

export const createToastError = (message) => {
    createToast(message, {
        '--toastColor' : 'white',
        '--toastBackground': 'red',
        '--toastBarHeight': 0
    })
}

export const createToastSuccess = (message) => {
    createToast(message, {
        '--toastColor' : 'white',
        '--toastBackground': 'green',
        '--toastBarHeight': 0
    })
}