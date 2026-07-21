export type ViewMode = "overview" | "field-aerial" | "field-ground" | "drone-follow" | "irrigation";
export type LayerMode = "natural" | "growth" | "moisture" | "facility";
export type DemoStep = "intro" | "overview" | "select-field" | "inspect-risk" | "drone-scan" | "irrigation" | "recovered";
export type FieldStatus = "normal" | "attention" | "risk" | "processing" | "recovered";
export type Vec3Tuple = [number, number, number];

export interface CameraPreset {
  position: Vec3Tuple;
  target: Vec3Tuple;
  duration: number;
}

export interface RiskZone {
  id: string;
  center: Vec3Tuple;
  radius: number;
  severity: "low" | "medium" | "high";
}

export interface FieldParcel {
  id: string;
  name: string;
  cropType: "rice" | "corn" | "vegetable" | "rapeseed";
  cropLabel: string;
  growthStage: string;
  areaMu: number;
  status: FieldStatus;
  polygon: Array<[number, number]>;
  elevation: number;
  moisture: number;
  moistureTarget: number;
  growthIndex: number;
  color: string;
  cameraPresets: {
    aerial: CameraPreset;
    ground: CameraPreset;
    irrigationInlet?: CameraPreset;
  };
  riskZones?: RiskZone[];
}

export interface Facility {
  id: string;
  name: string;
  type: "pump" | "gate" | "weather-station" | "warehouse";
  position: Vec3Tuple;
  rotation?: Vec3Tuple;
  status: "online" | "warning" | "working";
}
