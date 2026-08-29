export type ScoutStats = {
  entries: number; autoMaxScored: number; autoMaxFerried: number; autoAvgScored: number; autoAvgFerried: number;
  teleopMaxScored: number; teleopMaxFerried: number; teleopAvgScored: number; teleopAvgFerried: number;
  avgFouls: number; defense: number; brokenPercent: number; totalFuel: number; autoFuel: number; teleopFuel: number;
};
export const SCOUT_STAT_LABELS: Record<keyof Omit<ScoutStats, "entries">, string> = {
  totalFuel: "Total fuel", autoFuel: "Auto fuel", teleopFuel: "Teleop fuel", autoMaxScored: "Auto max scored", autoMaxFerried: "Auto max ferried", autoAvgScored: "Auto avg scored", autoAvgFerried: "Auto avg ferried", teleopMaxScored: "Teleop max scored", teleopMaxFerried: "Teleop max ferried", teleopAvgScored: "Teleop avg scored", teleopAvgFerried: "Teleop avg ferried", avgFouls: "Avg fouls", defense: "Defense", brokenPercent: "% broken",
};
const number = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0;
const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
const maximum = (values: number[]) => values.length ? Math.max(...values) : 0;
export function calculateScoutStats(entries: any[]): ScoutStats {
  const autoScored = entries.map((entry) => number(entry.payload?.auto?.shoot));
  const autoFerried = entries.map((entry) => number(entry.payload?.auto?.ferry));
  const teleopScored = entries.map((entry) => Array.isArray(entry.payload?.shifts) ? entry.payload.shifts.reduce((sum: number, shift: any) => sum + number(shift?.shoot), 0) : number(entry.payload?.teleop_fuel));
  const teleopFerried = entries.map((entry) => Array.isArray(entry.payload?.shifts) ? entry.payload.shifts.reduce((sum: number, shift: any) => sum + number(shift?.ferry), 0) : 0);
  const autoFuel = entries.map((entry, index) => autoScored[index] + autoFerried[index] || number(entry.payload?.auto_fuel));
  const teleopFuel = entries.map((entry, index) => teleopScored[index] + teleopFerried[index] || number(entry.payload?.teleop_fuel));
  return { entries: entries.length, autoMaxScored: maximum(autoScored), autoMaxFerried: maximum(autoFerried), autoAvgScored: average(autoScored), autoAvgFerried: average(autoFerried), teleopMaxScored: maximum(teleopScored), teleopMaxFerried: maximum(teleopFerried), teleopAvgScored: average(teleopScored), teleopAvgFerried: average(teleopFerried), avgFouls: average(entries.map((entry) => number(entry.payload?.fouls))), defense: average(entries.map((entry) => number(entry.payload?.defense_level))), brokenPercent: entries.length ? entries.filter((entry) => entry.payload?.robot_broke).length / entries.length * 100 : 0, totalFuel: average(autoFuel) + average(teleopFuel), autoFuel: average(autoFuel), teleopFuel: average(teleopFuel) };
}
export const formatStat = (value: number) => value.toFixed(2);
