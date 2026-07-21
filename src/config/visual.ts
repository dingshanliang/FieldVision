export const visualConfig = {
  cropDensity: 1,
  windStrength: 0.32,
  sunIntensity: 2.7,
  sunColor: "#ffd2a0",
  /** Direction TOWARD the sun (low golden-hour sun, west-northwest). */
  sunDirection: [-1.0, 0.22, -1.1] as const,
  fogColor: "#cfa887",
  fogDensity: 0.001,
  bloomIntensity: 0.32,
  bloomThreshold: 1.0,
  cameraTransitionSeconds: 2.4,
  introDurationSeconds: 8,
  irrigationDurationSeconds: 15,
  droneSpeed: 0.035,
  riskPulseSpeed: 1.2,
} as const;
