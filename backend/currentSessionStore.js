let currentSessionId = null;

export const setCurrentSessionId = (sessionId) => {
  currentSessionId = sessionId ?? null;
};

export const getCurrentSessionId = () => currentSessionId;

export const clearCurrentSessionId = () => {
  currentSessionId = null;
};
