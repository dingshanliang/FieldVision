import type { FieldParcel } from "../types/farm";

export const fields: FieldParcel[] = [
  {
    id: "A01", name: "西区一号田", cropType: "rice", cropLabel: "水稻", growthStage: "分蘖期", areaMu: 220,
    status: "normal", polygon: [[-125,-88],[-52,-96],[-40,-34],[-118,-26],[-138,-58]], elevation: 0.8,
    moisture: 27, moistureTarget: 28, growthIndex: 0.68, color: "#527d38",
    cameraPresets: { aerial: { position: [-85,56,-8], target: [-85,0,-58], duration: 2.2 }, ground: { position: [-108,3.3,-45], target: [-72,2,-62], duration: 2.5 } },
  },
  {
    id: "A02", name: "东区二号田", cropType: "rice", cropLabel: "水稻", growthStage: "分蘖期", areaMu: 180,
    status: "risk", polygon: [[-29,-98],[53,-90],[64,-31],[-24,-28],[-44,-60]], elevation: 1.2,
    moisture: 18, moistureTarget: 27, growthIndex: 0.54, color: "#658a3d",
    cameraPresets: {
      aerial: { position: [38,48,2], target: [8,0,-61], duration: 2.1 },
      ground: { position: [48,2.8,-38], target: [-8,1.8,-76], duration: 2.6 },
      irrigationInlet: { position: [99,17,18], target: [65,1,-30], duration: 2.2 },
    },
    riskZones: [{ id: "A02-R1", center: [23,1.6,-66], radius: 18, severity: "high" }],
  },
  {
    id: "A03", name: "北区三号田", cropType: "corn", cropLabel: "玉米", growthStage: "拔节期", areaMu: 260,
    status: "normal", polygon: [[74,-88],[137,-74],[145,-18],[70,-25],[61,-58]], elevation: 1.8,
    moisture: 25, moistureTarget: 26, growthIndex: 0.72, color: "#3f6e31",
    cameraPresets: { aerial: { position: [105,52,3], target: [105,1,-52], duration: 2.2 }, ground: { position: [75,4,-43], target: [124,3,-55], duration: 2.5 } },
  },
  {
    id: "B01", name: "西南一号田", cropType: "rice", cropLabel: "水稻", growthStage: "分蘖期", areaMu: 190,
    status: "normal", polygon: [[-140,3],[-63,-13],[-45,55],[-119,79],[-151,42]], elevation: 0.3,
    moisture: 29, moistureTarget: 28, growthIndex: 0.66, color: "#5d843d",
    cameraPresets: { aerial: { position: [-95,50,88], target: [-95,0,28], duration: 2.2 }, ground: { position: [-126,3,30], target: [-72,2,38], duration: 2.5 } },
  },
  {
    id: "B02", name: "中区二号田", cropType: "vegetable", cropLabel: "叶菜", growthStage: "生长期", areaMu: 160,
    status: "processing", polygon: [[-38,-11],[51,-17],[60,55],[-26,66],[-51,34]], elevation: 0.9,
    moisture: 23, moistureTarget: 26, growthIndex: 0.63, color: "#42774d",
    cameraPresets: { aerial: { position: [10,48,75], target: [5,0,24], duration: 2.2 }, ground: { position: [-27,3,33], target: [35,2,28], duration: 2.5 } },
  },
  {
    id: "B03", name: "东南三号田", cropType: "rapeseed", cropLabel: "油菜", growthStage: "苗期", areaMu: 270,
    status: "attention", polygon: [[73,-10],[148,-5],[153,70],[72,77],[57,43]], elevation: 1.1,
    moisture: 20, moistureTarget: 25, growthIndex: 0.58, color: "#6e8a39",
    cameraPresets: { aerial: { position: [112,51,89], target: [108,0,31], duration: 2.2 }, ground: { position: [72,3,32], target: [131,2,40], duration: 2.5 } },
  },
  {
    id: "C01", name: "品种试验田", cropType: "rice", cropLabel: "水稻", growthStage: "对比试验", areaMu: 85,
    status: "normal", polygon: [[-71,83],[26,75],[36,112],[-58,119],[-80,102]], elevation: 0.5,
    moisture: 26, moistureTarget: 27, growthIndex: 0.65, color: "#78934b",
    cameraPresets: { aerial: { position: [-16,43,138], target: [-18,0,98], duration: 2.2 }, ground: { position: [-54,3,100], target: [19,2,96], duration: 2.5 } },
  },
];

export const fieldById = Object.fromEntries(fields.map((field) => [field.id, field])) as Record<string, FieldParcel>;

/** Where canal water enters A02 (east edge, beside the branch canal) and how far
 * the wetting front must travel to reach the farthest corner. Shared by the
 * water-front shader (FieldParcel) and the crop recovery sweep (CropInstances). */
export const heroIrrigationInlet = { x: 57, z: -34, frontMax: 112 } as const;
