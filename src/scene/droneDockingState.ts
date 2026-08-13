import type { DroneFlightPhase } from "./droneFlightTelemetry";

export function droneDockingState(phase: DroneFlightPhase) {
  const lidOpen = ["self-check", "taking-off", "airborne", "returning", "landing"].includes(phase);
  const rotorScale = phase === "ready" || phase === "charging"
    ? 0.08
    : phase === "self-check"
      ? 0.22
      : phase === "landing"
        ? 0.55
        : 1;
  return {
    lidOpen,
    rotorScale,
    status: phase,
  } as const;
}
