export const visualConfig = {
  cropDensity: 1,
  windStrength: 0.3,
  sunIntensity: 2.15,
  sunColor: "#fff0dc",
  /** Direction TOWARD the sun: low side-light, never directly behind the hero field. */
  sunDirection: [-1.0, 0.38, 0.15] as const,
  // Aligned to the procedural sky's horizon vec3(0.67,0.72,0.72) so the fog
  // meets the skyline without a visible seam (was #aeb8b3, cooler/mismatched).
  fogColor: "#abb8b8",
  fogDensity: 0.00072,
  bloomIntensity: 0.16,
  bloomThreshold: 1.18,
  cameraTransitionSeconds: 2.4,
  introDurationSeconds: 8,
  irrigationDurationSeconds: 15,
  droneSpeed: 0.035,
  riskPulseSpeed: 1.2,
} as const;
