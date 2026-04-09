const DEFAULT_HISTORY_LIMIT = 1500;

export const STRATEGY_DEFAULTS = {
  trackLengthKm: 3.87,
  minSpeedKph: 13,
  maxSpeedKph: 28,
  candidateStepKph: 0.5,
  historyLimit: DEFAULT_HISTORY_LIMIT,
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const toNumber = (value, fallback = 0) => {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
};

const safeDivide = (numerator, denominator, fallback = 0) => {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || Math.abs(denominator) < 1e-9) {
    return fallback;
  }

  return numerator / denominator;
};

const median = (values) => {
  if (!values.length) {
    return 0;
  }

  const sortedValues = [...values].sort((left, right) => left - right);
  const midpoint = Math.floor(sortedValues.length / 2);
  if (sortedValues.length % 2 === 0) {
    return (sortedValues[midpoint - 1] + sortedValues[midpoint]) / 2;
  }

  return sortedValues[midpoint];
};

const mean = (values) => {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const standardDeviation = (values) => {
  if (values.length <= 1) {
    return 0;
  }

  const average = mean(values);
  const variance =
    values.reduce((sum, value) => sum + (value - average) ** 2, 0) / values.length;
  return Math.sqrt(variance);
};

export const getLectureSampleKey = (lecture) => {
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
    lecture.latitude,
    lecture.longitude,
  ].join("|");
};

const getLectureEventMs = (lecture, fallbackMs) => {
  const serverReceivedAtMs = Number(lecture?.server_received_at_ms);
  if (Number.isFinite(serverReceivedAtMs) && serverReceivedAtMs > 0) {
    return serverReceivedAtMs;
  }

  if (lecture?.timestamp) {
    const parsedTimestampMs = Date.parse(lecture.timestamp);
    if (Number.isFinite(parsedTimestampMs)) {
      return parsedTimestampMs;
    }
  }

  return Number.isFinite(fallbackMs) ? fallbackMs : Date.now();
};

export const mergeLectureIntoBuffer = (
  buffer,
  lecture,
  limit = DEFAULT_HISTORY_LIMIT,
) => {
  const lectureKey = getLectureSampleKey(lecture);
  if (lectureKey === null) {
    return buffer;
  }

  const existingLectureIndex = buffer.findIndex(
    (bufferedLecture) => getLectureSampleKey(bufferedLecture) === lectureKey,
  );

  if (existingLectureIndex !== -1) {
    if (existingLectureIndex === buffer.length - 1) {
      return buffer;
    }

    const nextBuffer = [...buffer];
    nextBuffer[existingLectureIndex] = lecture;
    return nextBuffer.slice(-limit);
  }

  return [...buffer, lecture].slice(-limit);
};

export const mergeLectureCollections = (
  currentBuffer,
  incomingLectures,
  limit = DEFAULT_HISTORY_LIMIT,
) => {
  if (!Array.isArray(incomingLectures) || incomingLectures.length === 0) {
    return currentBuffer;
  }

  let nextBuffer = [...currentBuffer];
  for (const lecture of incomingLectures) {
    nextBuffer = mergeLectureIntoBuffer(nextBuffer, lecture, limit);
  }

  return nextBuffer.slice(-limit);
};

export const computeSpeedKph = (lecture) => {
  const velocityX = toNumber(lecture?.velocity_x);
  const velocityY = toNumber(lecture?.velocity_y);
  return Math.sqrt(velocityX ** 2 + velocityY ** 2);
};

const buildSampleContext = (sample) => ({
  speedKph: sample.speedKph,
  lapProgress: sample.lapProgress,
  accelLongMps2: sample.accelLongMps2,
  slopePct: sample.slopePct,
  airSpeed: sample.airSpeed,
  ambientTemp: sample.ambientTemp,
  altitudeM: sample.altitudeM,
  accelerationX: sample.accelerationX,
  accelerationY: sample.accelerationY,
  accelerationZ: sample.accelerationZ,
  orientationX: sample.orientationX,
  orientationY: sample.orientationY,
  rpmMotor: sample.rpmMotor,
  throttle: sample.throttle,
  voltageBattery: sample.voltageBattery,
  numSats: sample.numSats,
});

export const buildTelemetryHistory = (
  lectures,
  config = STRATEGY_DEFAULTS,
) => {
  if (!Array.isArray(lectures) || lectures.length === 0) {
    return [];
  }

  const trackLengthKm = Math.max(0.1, toNumber(config.trackLengthKm, STRATEGY_DEFAULTS.trackLengthKm));
  const history = [];

  for (let index = 0; index < lectures.length; index += 1) {
    const lecture = lectures[index];
    const previousSample = history[history.length - 1];
    const eventMs = getLectureEventMs(lecture, previousSample?.eventMs);
    const previousEventMs = previousSample?.eventMs ?? eventMs - 1000;
    const dtSecondsRaw = (eventMs - previousEventMs) / 1000;
    const dtSeconds = clamp(Number.isFinite(dtSecondsRaw) && dtSecondsRaw > 0 ? dtSecondsRaw : 1, 0.25, 5);
    const speedKph = computeSpeedKph(lecture);
    const voltageBattery = toNumber(lecture?.voltage_battery);
    const currentA = toNumber(lecture?.current);
    const powerW = voltageBattery * currentA;
    const distanceKm =
      (previousSample?.distanceKm ?? 0) + (speedKph * dtSeconds) / 3600;
    const energyWh =
      (previousSample?.energyWh ?? 0) + (powerW * dtSeconds) / 3600;
    const lapNumber = Math.max(
      1,
      Math.trunc(toNumber(lecture?.lap_number, previousSample?.lapNumber ?? 1)),
    );

    let lapStartDistanceKm = previousSample?.lapStartDistanceKm ?? 0;
    if (!previousSample) {
      lapStartDistanceKm = 0;
    } else if (lapNumber !== previousSample.lapNumber) {
      lapStartDistanceKm = previousSample.distanceKm;
    }

    const altitudeM = toNumber(lecture?.altitude_m);
    const distanceStepMeters = (speedKph * dtSeconds * 1000) / 3600;
    const altitudeDeltaMeters = altitudeM - (previousSample?.altitudeM ?? altitudeM);
    const slopePct =
      distanceStepMeters > 0.25 ? (altitudeDeltaMeters / distanceStepMeters) * 100 : 0;
    const accelLongMps2 =
      previousSample
        ? ((speedKph - previousSample.speedKph) / 3.6) / Math.max(dtSeconds, 0.25)
        : 0;
    const accelerationX = toNumber(lecture?.acceleration_x);
    const accelerationY = toNumber(lecture?.acceleration_y);
    const accelerationZ = toNumber(lecture?.acceleration_z);
    const orientationX = toNumber(lecture?.orientation_x);
    const orientationY = toNumber(lecture?.orientation_y);
    const orientationZ = toNumber(lecture?.orientation_z);
    const rpmMotor = toNumber(lecture?.rpm_motor);
    const throttle = toNumber(lecture?.throttle ?? lecture?.accelPct);
    const airSpeed = toNumber(lecture?.air_speed);
    const ambientTemp = toNumber(lecture?.ambient_temp);
    const numSats = toNumber(lecture?.num_sats);

    const lapDistanceKm = Math.max(0, distanceKm - lapStartDistanceKm);
    const lapProgress = clamp(lapDistanceKm / trackLengthKm, 0, 0.999);
    const powerPerKm = speedKph > 0.1 ? powerW / speedKph : 0;
    const efficiencyKmPerKWh = powerW > 15 ? clamp((speedKph * 1000) / powerW, 0, 300) : 0;

    history.push({
      key: getLectureSampleKey(lecture),
      lecture,
      eventMs,
      dtSeconds,
      speedKph,
      powerW,
      distanceKm,
      energyWh,
      lapNumber,
      lapStartDistanceKm,
      lapDistanceKm,
      lapProgress,
      powerPerKm,
      accelLongMps2,
      slopePct,
      altitudeM,
      accelerationX,
      accelerationY,
      accelerationZ,
      orientationX,
      orientationY,
      orientationZ,
      rpmMotor,
      throttle,
      airSpeed,
      ambientTemp,
      numSats,
      voltageBattery,
      efficiencyKmPerKWh,
      runningTime:
        lecture?.running_time !== undefined && lecture?.running_time !== null
          ? toNumber(lecture.running_time)
          : null,
    });
  }

  return history;
};

const getContextRows = (history, candidateSpeedKph, lapProgress) => {
  const tiers = [
    { speedWindow: 2, progressWindow: 0.1, minRows: 8 },
    { speedWindow: 3.5, progressWindow: 0.16, minRows: 14 },
    { speedWindow: 5.5, progressWindow: 0.24, minRows: 24 },
    { speedWindow: 7.5, progressWindow: 0.32, minRows: 36 },
  ];

  for (const tier of tiers) {
    const rows = history.filter(
      (sample) =>
        sample.efficiencyKmPerKWh > 0 &&
        Math.abs(sample.speedKph - candidateSpeedKph) <= tier.speedWindow &&
        Math.abs(sample.lapProgress - lapProgress) <= tier.progressWindow,
    );

    if (rows.length >= tier.minRows) {
      return rows;
    }
  }

  return history.filter((sample) => sample.efficiencyKmPerKWh > 0).slice(-80);
};

const weightedMean = (rows, selector, weightSelector) => {
  let weightedValue = 0;
  let totalWeight = 0;

  for (const row of rows) {
    const value = selector(row);
    const weight = Math.max(0, weightSelector(row));
    if (!Number.isFinite(value) || weight <= 0) {
      continue;
    }

    weightedValue += value * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? weightedValue / totalWeight : 0;
};

const buildFeatureVector = (context) => {
  const speedKph = toNumber(context.speedKph);
  const lapProgress = clamp(toNumber(context.lapProgress), 0, 1);
  const throttle = clamp(toNumber(context.throttle), 0, 1.2);
  const airSpeed = toNumber(context.airSpeed);
  const rpmMotor = toNumber(context.rpmMotor);

  return [
    speedKph,
    speedKph ** 2,
    lapProgress,
    lapProgress ** 2,
    toNumber(context.accelLongMps2),
    toNumber(context.slopePct),
    airSpeed,
    airSpeed * speedKph,
    toNumber(context.ambientTemp),
    toNumber(context.altitudeM),
    toNumber(context.accelerationX),
    toNumber(context.accelerationY),
    toNumber(context.accelerationZ),
    toNumber(context.orientationX),
    toNumber(context.orientationY),
    rpmMotor,
    throttle,
    toNumber(context.voltageBattery),
    toNumber(context.numSats),
    throttle * speedKph,
    safeDivide(rpmMotor, Math.max(speedKph, 1), 0),
  ];
};

const solveLinearSystem = (matrix, vector) => {
  const size = matrix.length;
  if (!size) {
    return null;
  }

  const augmented = matrix.map((row, rowIndex) => [...row, vector[rowIndex]]);

  for (let pivot = 0; pivot < size; pivot += 1) {
    let pivotRow = pivot;
    for (let rowIndex = pivot + 1; rowIndex < size; rowIndex += 1) {
      if (Math.abs(augmented[rowIndex][pivot]) > Math.abs(augmented[pivotRow][pivot])) {
        pivotRow = rowIndex;
      }
    }

    if (Math.abs(augmented[pivotRow][pivot]) < 1e-9) {
      return null;
    }

    if (pivotRow !== pivot) {
      [augmented[pivot], augmented[pivotRow]] = [augmented[pivotRow], augmented[pivot]];
    }

    const pivotValue = augmented[pivot][pivot];
    for (let column = pivot; column <= size; column += 1) {
      augmented[pivot][column] /= pivotValue;
    }

    for (let rowIndex = 0; rowIndex < size; rowIndex += 1) {
      if (rowIndex === pivot) {
        continue;
      }

      const factor = augmented[rowIndex][pivot];
      if (Math.abs(factor) < 1e-12) {
        continue;
      }

      for (let column = pivot; column <= size; column += 1) {
        augmented[rowIndex][column] -= factor * augmented[pivot][column];
      }
    }
  }

  return augmented.map((row) => row[size]);
};

const buildTrainingRows = (history, config) =>
  history
    .filter((sample) => {
      const lowerBound = Math.max(6, toNumber(config.minSpeedKph, STRATEGY_DEFAULTS.minSpeedKph) - 3);
      const upperBound = toNumber(config.maxSpeedKph, STRATEGY_DEFAULTS.maxSpeedKph) + 5;
      return (
        sample.powerW > 20 &&
        sample.speedKph >= lowerBound &&
        sample.speedKph <= upperBound &&
        sample.efficiencyKmPerKWh >= 1 &&
        sample.efficiencyKmPerKWh <= 300
      );
    })
    .map((sample) => ({
      context: buildSampleContext(sample),
      target: sample.efficiencyKmPerKWh,
    }));

const fitEfficiencyModel = (trainingRows, lambda = 1.2) => {
  if (trainingRows.length < 24) {
    return null;
  }

  const featureCount = buildFeatureVector(trainingRows[0].context).length;
  const means = Array(featureCount).fill(0);
  const stds = Array(featureCount).fill(0);
  const featureRows = trainingRows.map((row) => buildFeatureVector(row.context));

  for (const features of featureRows) {
    for (let index = 0; index < featureCount; index += 1) {
      means[index] += features[index];
    }
  }

  for (let index = 0; index < featureCount; index += 1) {
    means[index] /= featureRows.length;
  }

  for (const features of featureRows) {
    for (let index = 0; index < featureCount; index += 1) {
      stds[index] += (features[index] - means[index]) ** 2;
    }
  }

  for (let index = 0; index < featureCount; index += 1) {
    stds[index] = Math.sqrt(stds[index] / featureRows.length) || 1;
  }

  const size = featureCount + 1;
  const matrix = Array.from({ length: size }, () => Array(size).fill(0));
  const vector = Array(size).fill(0);

  for (let rowIndex = 0; rowIndex < trainingRows.length; rowIndex += 1) {
    const standardized = featureRows[rowIndex].map(
      (value, featureIndex) => (value - means[featureIndex]) / stds[featureIndex],
    );
    const designRow = [1, ...standardized];
    const target = trainingRows[rowIndex].target;

    for (let leftIndex = 0; leftIndex < size; leftIndex += 1) {
      vector[leftIndex] += designRow[leftIndex] * target;
      for (let rightIndex = 0; rightIndex < size; rightIndex += 1) {
        matrix[leftIndex][rightIndex] += designRow[leftIndex] * designRow[rightIndex];
      }
    }
  }

  for (let diagonalIndex = 1; diagonalIndex < size; diagonalIndex += 1) {
    matrix[diagonalIndex][diagonalIndex] += lambda;
  }

  const coefficients = solveLinearSystem(matrix, vector);
  if (!coefficients) {
    return null;
  }

  return {
    coefficients,
    means,
    stds,
  };
};

const predictEfficiencyKmPerKWh = (model, context) => {
  const features = buildFeatureVector(context);
  const standardized = features.map(
    (value, featureIndex) => (value - model.means[featureIndex]) / model.stds[featureIndex],
  );
  const designRow = [1, ...standardized];
  const prediction = designRow.reduce(
    (sum, value, coefficientIndex) => sum + value * model.coefficients[coefficientIndex],
    0,
  );

  return clamp(prediction, 1, 300);
};

const evaluateModel = (model, rows) => {
  if (!rows.length) {
    return { maeKmPerKWh: 999, relativeMae: 1 };
  }

  const absoluteErrors = rows.map((row) =>
    Math.abs(predictEfficiencyKmPerKWh(model, row.context) - row.target),
  );
  const maeKmPerKWh = mean(absoluteErrors);
  const targetMean = Math.max(mean(rows.map((row) => row.target)), 1);

  return {
    maeKmPerKWh,
    relativeMae: maeKmPerKWh / targetMean,
  };
};

const trainEfficiencyModel = (history, config) => {
  const modelRows = buildTrainingRows(history, config);
  if (modelRows.length < 30) {
    return null;
  }

  const splitIndex = Math.max(24, Math.floor(modelRows.length * 0.8));
  const trainRows = modelRows.slice(0, splitIndex);
  const testRows = modelRows.slice(splitIndex);
  const model = fitEfficiencyModel(trainRows);

  if (!model) {
    return null;
  }

  return {
    model,
    rows: modelRows,
    metrics: evaluateModel(model, testRows.length ? testRows : trainRows.slice(-10)),
  };
};

const estimateCandidateContext = (history, currentSample, candidateSpeedKph) => {
  const supportRows = getContextRows(history, candidateSpeedKph, currentSample.lapProgress);
  const latestEventMs = currentSample.eventMs;

  const weightSelector = (sample) => {
    const speedGap = Math.abs(sample.speedKph - candidateSpeedKph);
    const progressGap = Math.abs(sample.lapProgress - currentSample.lapProgress);
    const ageSeconds = Math.max(0, (latestEventMs - sample.eventMs) / 1000);
    const speedWeight = Math.exp(-speedGap / 2.2);
    const progressWeight = Math.exp(-progressGap / 0.12);
    const freshnessWeight = Math.max(0.3, Math.exp(-ageSeconds / 240));
    return speedWeight * progressWeight * freshnessWeight;
  };

  const recentRows = history.filter((sample) => sample.speedKph > 0.5).slice(-80);
  const rpmPerKphBaseline = median(
    recentRows
      .map((sample) => safeDivide(sample.rpmMotor, sample.speedKph, 0))
      .filter((value) => value > 0),
  );
  const throttlePerKphBaseline = median(
    recentRows
      .map((sample) => safeDivide(sample.throttle, sample.speedKph, 0))
      .filter((value) => value > 0),
  );
  const observedThrottleMax = Math.max(
    0.2,
    ...history.map((sample) => toNumber(sample.throttle, 0)),
  );

  const estimatedRpmMotor = weightedMean(
    supportRows,
    (sample) => sample.rpmMotor,
    weightSelector,
  ) || candidateSpeedKph * rpmPerKphBaseline;

  const estimatedThrottle = clamp(
    weightedMean(
      supportRows,
      (sample) => sample.throttle,
      weightSelector,
    ) || candidateSpeedKph * throttlePerKphBaseline,
    0,
    observedThrottleMax,
  );

  return {
    speedKph: candidateSpeedKph,
    lapProgress: currentSample.lapProgress,
    accelLongMps2: 0,
    slopePct: currentSample.slopePct,
    airSpeed: currentSample.airSpeed,
    ambientTemp: currentSample.ambientTemp,
    altitudeM: currentSample.altitudeM,
    accelerationX: 0,
    accelerationY: currentSample.accelerationY,
    accelerationZ: currentSample.accelerationZ,
    orientationX: currentSample.orientationX,
    orientationY: currentSample.orientationY,
    rpmMotor: estimatedRpmMotor,
    throttle: estimatedThrottle,
    voltageBattery: currentSample.voltageBattery,
    numSats: currentSample.numSats,
  };
};

const buildConfidenceScore = ({
  modelBundle,
  supportRows,
  history,
  currentSample,
}) => {
  const supportCount = supportRows.length;
  const coverage = Math.min(1, supportCount / 25);
  const recentRows = history.filter(
    (sample) => Math.max(0, (currentSample.eventMs - sample.eventMs) / 1000) <= 60,
  );
  const freshness = Math.min(1, recentRows.length / 45);
  const trainingCoverage = Math.min(1, modelBundle.rows.length / 180);
  const localTargets = supportRows
    .map((sample) => sample.efficiencyKmPerKWh)
    .filter((value) => value > 0);
  const targetVariation = standardDeviation(localTargets);
  const meanTarget = Math.max(mean(localTargets), 1);
  const stability = clamp(1 - targetVariation / meanTarget, 0.25, 1);
  const errorFactor = clamp(1 - modelBundle.metrics.relativeMae, 0.2, 1);
  const confidenceScore = clamp(
    0.1 + coverage * 0.25 + freshness * 0.15 + trainingCoverage * 0.2 + stability * 0.15 + errorFactor * 0.15,
    0.15,
    0.98,
  );

  return {
    confidenceScore: Number(confidenceScore.toFixed(3)),
    supportRows: supportCount,
  };
};

const buildDriverMessage = ({
  impossible,
  currentSpeedKph,
  targetSpeedKph,
  minimumFeasibleSpeedKph,
  confidenceScore,
}) => {
  if (impossible) {
    return "Pace limit too low to finish on time";
  }

  if (confidenceScore < 0.4) {
    return "Recommendation is provisional while data stabilizes";
  }

  if (currentSpeedKph + 0.5 < minimumFeasibleSpeedKph) {
    return "Push smoothly to recover schedule";
  }

  if (currentSpeedKph > targetSpeedKph + 1) {
    return "Lift slightly and save efficiency";
  }

  if (currentSpeedKph < targetSpeedKph - 1) {
    return "Build speed gradually toward target";
  }

  return "Hold this rhythm";
};

const buildPaceStatus = ({
  impossible,
  currentSpeedKph,
  targetSpeedKph,
  minimumFeasibleSpeedKph,
}) => {
  if (impossible) {
    return "pace_limit_exceeded";
  }

  if (currentSpeedKph + 0.5 < minimumFeasibleSpeedKph) {
    return "below_required_pace";
  }

  if (currentSpeedKph > targetSpeedKph + 1) {
    return "faster_than_needed";
  }

  if (currentSpeedKph < targetSpeedKph - 1) {
    return "below_target";
  }

  return "on_target";
};

export const buildRaceStrategy = ({
  history,
  remainingTimeSeconds,
  currentLap,
  maxLaps,
  config = STRATEGY_DEFAULTS,
}) => {
  if (!Array.isArray(history) || history.length < 24) {
    return null;
  }

  const currentSample = history[history.length - 1];
  const minSpeedKph = Math.max(1, toNumber(config.minSpeedKph, STRATEGY_DEFAULTS.minSpeedKph));
  const maxSpeedKph = Math.max(minSpeedKph, toNumber(config.maxSpeedKph, STRATEGY_DEFAULTS.maxSpeedKph));
  const trackLengthKm = Math.max(0.1, toNumber(config.trackLengthKm, STRATEGY_DEFAULTS.trackLengthKm));
  const totalRaceDistanceKm = Math.max(1, maxLaps) * trackLengthKm;
  const lapNumber = Math.max(1, Math.trunc(toNumber(currentLap, currentSample.lapNumber)));
  const currentLapDistanceKm = currentSample.lapDistanceKm;
  const coveredDistanceKm = clamp(
    (lapNumber - 1) * trackLengthKm + currentLapDistanceKm,
    0,
    totalRaceDistanceKm,
  );
  const remainingDistanceKm = Math.max(0, totalRaceDistanceKm - coveredDistanceKm);
  const minimumFeasibleSpeedKph =
    remainingTimeSeconds > 0 ? remainingDistanceKm / (remainingTimeSeconds / 3600) : maxSpeedKph;
  const candidateStartKph = Math.max(minSpeedKph, minimumFeasibleSpeedKph);
  const modelBundle = trainEfficiencyModel(history, config);

  if (!modelBundle) {
    return null;
  }

  const candidates = [];

  for (
    let candidateSpeedKph = candidateStartKph;
    candidateSpeedKph <= maxSpeedKph + config.candidateStepKph / 2;
    candidateSpeedKph += config.candidateStepKph
  ) {
    const normalizedCandidate = Number(candidateSpeedKph.toFixed(2));
    const candidateContext = estimateCandidateContext(history, currentSample, normalizedCandidate);
    const predictedKmPerKWh = predictEfficiencyKmPerKWh(
      modelBundle.model,
      candidateContext,
    );
    const predictedPowerW = safeDivide(
      normalizedCandidate * 1000,
      predictedKmPerKWh,
      0,
    );
    const predictedWhPerKm = safeDivide(1000, predictedKmPerKWh, 0);

    candidates.push({
      speedKph: normalizedCandidate,
      predictedPowerW: Number(predictedPowerW.toFixed(2)),
      predictedKmPerKWh: Number(predictedKmPerKWh.toFixed(2)),
      predictedWhPerKm: Number(predictedWhPerKm.toFixed(2)),
    });
  }

  const impossible = candidates.length === 0;
  const fallbackPrediction = predictEfficiencyKmPerKWh(
    modelBundle.model,
    estimateCandidateContext(history, currentSample, maxSpeedKph),
  );
  const scenarioSet = impossible
    ? [
        {
          speedKph: maxSpeedKph,
          predictedPowerW: Number(
            safeDivide(maxSpeedKph * 1000, fallbackPrediction, 0).toFixed(2),
          ),
          predictedKmPerKWh: Number(fallbackPrediction.toFixed(2)),
          predictedWhPerKm: Number(safeDivide(1000, fallbackPrediction, 0).toFixed(2)),
        },
      ]
    : candidates;

  const bestScenario = [...scenarioSet].sort(
    (left, right) =>
      right.predictedKmPerKWh - left.predictedKmPerKWh || left.speedKph - right.speedKph,
  )[0];

  const supportRows = getContextRows(history, bestScenario.speedKph, currentSample.lapProgress);
  const { confidenceScore, supportRows: supportRowsCount } = buildConfidenceScore({
    modelBundle,
    supportRows,
    history,
    currentSample,
  });

  const currentSpeedKph = Number(currentSample.speedKph.toFixed(2));
  const deltaSpeedKph = Number((bestScenario.speedKph - currentSpeedKph).toFixed(2));
  const paceStatus = buildPaceStatus({
    impossible,
    currentSpeedKph,
    targetSpeedKph: bestScenario.speedKph,
    minimumFeasibleSpeedKph,
  });

  return {
    currentSpeedKph,
    targetSpeedKph: bestScenario.speedKph,
    deltaSpeedKph,
    predictedPowerAtTargetW: bestScenario.predictedPowerW,
    predictedEfficiencyKmPerKWh: bestScenario.predictedKmPerKWh,
    predictedEfficiencyWhPerKm: bestScenario.predictedWhPerKm,
    minimumFeasibleSpeedKph: Number(minimumFeasibleSpeedKph.toFixed(2)),
    remainingDistanceKm: Number(remainingDistanceKm.toFixed(3)),
    remainingTimeSeconds,
    energyUsedWh: Number(currentSample.energyWh.toFixed(2)),
    lapProgressPct: Number((currentSample.lapProgress * 100).toFixed(1)),
    confidenceScore,
    supportRows: supportRowsCount,
    paceStatus,
    driverMessage: buildDriverMessage({
      impossible,
      currentSpeedKph,
      targetSpeedKph: bestScenario.speedKph,
      minimumFeasibleSpeedKph,
      confidenceScore,
    }),
    modelType: "ridge_regression_live",
    modelMetrics: {
      maeKmPerKWh: Number(modelBundle.metrics.maeKmPerKWh.toFixed(2)),
      relativeMae: Number(modelBundle.metrics.relativeMae.toFixed(3)),
      trainingRows: modelBundle.rows.length,
    },
    configSnapshot: {
      trackLengthKm,
      minSpeedKph,
      maxSpeedKph,
    },
  };
};
