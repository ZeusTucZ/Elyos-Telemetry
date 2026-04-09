const MAX_BUFFER_SIZE = 1800;

let latestLecture = null;
let lectureBuffer = [];
let currentBufferSessionId = null;

const getLectureKey = (lecture) => {
  if (!lecture) return null;

  if (lecture.id !== null && lecture.id !== undefined) {
    return `id:${lecture.id}`;
  }

  if (lecture.timestamp) {
    return `ts:${lecture.timestamp}`;
  }

  return [
    lecture.session_id,
    lecture.lap_number,
    lecture.voltage_battery,
    lecture.current,
    lecture.rpm_motor,
    lecture.velocity_x,
    lecture.velocity_y,
  ].join("|");
};

export const setLatestLecture = (lecture) => {
  latestLecture = lecture;

  const nextSessionId = lecture?.session_id ?? null;
  if (
    currentBufferSessionId !== null &&
    nextSessionId !== null &&
    nextSessionId !== currentBufferSessionId
  ) {
    lectureBuffer = [];
  }

  currentBufferSessionId = nextSessionId ?? currentBufferSessionId;

  const lectureKey = getLectureKey(lecture);
  const lastLectureKey = getLectureKey(lectureBuffer[lectureBuffer.length - 1]);

  if (lectureKey !== null && lectureKey !== lastLectureKey) {
    lectureBuffer.push(lecture);
    if (lectureBuffer.length > MAX_BUFFER_SIZE) {
      lectureBuffer = lectureBuffer.slice(-MAX_BUFFER_SIZE);
    }
  }
};

export const getLatestLecture = () => latestLecture;

export const getLectureBuffer = (limit = MAX_BUFFER_SIZE) =>
  lectureBuffer.slice(-Math.max(1, Number(limit) || MAX_BUFFER_SIZE));

export const clearLectureBuffer = () => {
  latestLecture = null;
  lectureBuffer = [];
  currentBufferSessionId = null;
};
