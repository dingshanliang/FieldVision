import type { Facility } from "../types/farm";

export const facilities: Facility[] = [
  { id: "PUMP-01", name: "一号智慧泵站", type: "pump", position: [82, 2, 105], status: "online" },
  { id: "GATE-E", name: "东支渠闸门", type: "gate", position: [69, 1.5, -18], rotation: [0, 0.18, 0], status: "warning" },
  { id: "METEO-01", name: "微气象站", type: "weather-station", position: [-12, 1.2, 132], status: "online" },
  { id: "STORE-01", name: "农事管理站", type: "warehouse", position: [-122, 2, 112], rotation: [0, -0.35, 0], status: "online" },
];
