let emitToAllSockets = null;

export const registerSocketEmitter = (emitter) => {
    emitToAllSockets = emitter;
}

export const emitSocketEvent = (eventName, payload) => {
    if (typeof emitToAllSockets === "function") {
        emitToAllSockets(eventName, payload);
    }
}
