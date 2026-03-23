let recordingStartTimeMs = null;

export const setRecordingStartTime = (value) => {
  recordingStartTimeMs = typeof value === "number" ? value : null;
};

export const getRecordingStartTime = () => recordingStartTimeMs;

export const clearRecordingStartTime = () => {
  recordingStartTimeMs = null;
};
