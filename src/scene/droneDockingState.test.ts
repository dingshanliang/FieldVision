import { describe, expect, it } from "vitest";
import { droneDockingState } from "./droneDockingState";
import { DRONE_DOCK_WORLD_POSITION } from "./droneFlightTelemetry";

describe("drone docking state", () => {
  it("uses the physical dock's transformed world anchor", () => {
    expect(DRONE_DOCK_WORLD_POSITION.toArray()).toEqual([
      expect.closeTo(-106.206, 2),
      3.35,
      expect.closeTo(124.149, 2),
    ]);
  });
  it("makes self-check and takeoff visibly distinct", () => {
    expect(droneDockingState("self-check")).toEqual({
      lidOpen: true,
      rotorScale: 0.22,
      status: "self-check",
    });
    expect(droneDockingState("taking-off")).toEqual({
      lidOpen: true,
      rotorScale: 1,
      status: "taking-off",
    });
  });

  it("slows for landing then closes the lid for charging", () => {
    expect(droneDockingState("landing")).toEqual({
      lidOpen: true,
      rotorScale: 0.55,
      status: "landing",
    });
    expect(droneDockingState("charging")).toEqual({
      lidOpen: false,
      rotorScale: 0.08,
      status: "charging",
    });
  });
});
