let totalConsumptionWh = 0;

export const resetTotalConsumption = () => {
  totalConsumptionWh = 0;
};

export const addConsumptionSample = ({ voltage, current, dtSeconds = 1 }) => {
  const numericVoltage = Number(voltage);
  const numericCurrent = Number(current);
  const numericDt = Number(dtSeconds);

  if (!Number.isFinite(numericVoltage) || !Number.isFinite(numericCurrent) || !Number.isFinite(numericDt) || numericDt <= 0) {
    return totalConsumptionWh;
  }

  totalConsumptionWh += (numericVoltage * numericCurrent * numericDt) / 3600;
  return totalConsumptionWh;
};

export const getTotalConsumption = () => totalConsumptionWh;
