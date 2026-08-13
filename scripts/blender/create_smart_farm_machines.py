"""FieldVision 监督式自主智慧农场英雄设备（fv-8zm.12）。

项目自制三份可动画 GLB：
  - 中型无人拖拉机 + 6 行播种机；
  - 田间巡检机器人；
  - 自主维护割草设备。

坐标约定：Blender +Z 向上，模型原点在轮/履带接地面中心，车头朝 -Y。
关键活动节点保留语义化对象名，供 R3F 在 fv-8zm.13 驱动车轮、机具、云台与割草盘。

运行：
  /Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup \
    --python scripts/blender/create_smart_farm_machines.py
"""

from pathlib import Path
import math
import bpy


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "public" / "assets" / "models"


def material(name, color, metallic=0.0, roughness=0.6, emission=None):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1.0)
    shader.inputs["Metallic"].default_value = metallic
    shader.inputs["Roughness"].default_value = roughness
    if emission:
        shader.inputs["Emission Color"].default_value = (*emission, 1.0)
        shader.inputs["Emission Strength"].default_value = 2.2
    return mat


AGRI_GREEN = material("Agri green", (0.20, 0.34, 0.20), 0.12, 0.72)
AGRI_DARK = material("Agri dark", (0.075, 0.12, 0.09), 0.28, 0.62)
SAFETY = material("Safety amber", (0.84, 0.46, 0.08), 0.18, 0.55)
STEEL = material("Machine steel", (0.36, 0.40, 0.38), 0.64, 0.42)
RUBBER = material("Machine rubber", (0.025, 0.03, 0.028), 0.0, 0.96)
GLASS = material("Cab glass", (0.09, 0.17, 0.19), 0.12, 0.2)
SENSOR = material("Sensor graphite", (0.025, 0.045, 0.045), 0.26, 0.28)
SIGNAL = material("Autonomy signal", (0.08, 0.62, 0.42), 0.12, 0.32, (0.08, 0.78, 0.46))
WHITE = material("Equipment white", (0.70, 0.74, 0.70), 0.28, 0.55)


def clear():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)


def finish(obj, mat, bevel=0.035, segments=1):
    obj.data.materials.append(mat)
    if bevel > 0:
        modifier = obj.modifiers.new("Manufactured edge", "BEVEL")
        modifier.width = bevel
        modifier.segments = segments
    return obj


def cube(name, loc, scale, mat, rot=(0, 0, 0), bevel=0.035, parent=None):
    bpy.ops.mesh.primitive_cube_add(location=loc, rotation=rot)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    finish(obj, mat, bevel)
    obj.parent = parent
    return obj


def cylinder(name, loc, radius, depth, mat, rot=(0, 0, 0), vertices=20, bevel=0.025, parent=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc, rotation=rot)
    obj = bpy.context.object
    obj.name = name
    finish(obj, mat, bevel)
    obj.parent = parent
    return obj


def sphere(name, loc, scale, mat, segments=20, rings=10, parent=None):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=loc, scale=scale)
    obj = bpy.context.object
    obj.name = name
    finish(obj, mat, 0)
    obj.parent = parent
    return obj


def empty(name, loc=(0, 0, 0), parent=None):
    obj = bpy.data.objects.new(name, None)
    obj.location = loc
    obj.parent = parent
    bpy.context.collection.objects.link(obj)
    return obj


def apply_and_export(filename):
    bpy.ops.object.select_all(action="SELECT")
    for obj in list(bpy.context.selected_objects):
        if obj.type != "MESH":
            continue
        bpy.context.view_layer.objects.active = obj
        for modifier in list(obj.modifiers):
            bpy.ops.object.modifier_apply(modifier=modifier.name)
    # Repeated wheels, hubs and six row-unit parts keep separate named objects
    # for runtime animation, but share identical mesh data in the GLB. This
    # lowers browser geometry uploads without flattening the activity nodes.
    shared_meshes = {}
    for obj in [item for item in bpy.context.selected_objects if item.type == "MESH"]:
        mesh = obj.data
        signature = (
            tuple(material.name if material else "" for material in mesh.materials),
            tuple((round(vertex.co.x, 5), round(vertex.co.y, 5), round(vertex.co.z, 5)) for vertex in mesh.vertices),
            tuple(tuple(polygon.vertices) for polygon in mesh.polygons),
        )
        existing = shared_meshes.get(signature)
        if existing is None:
            shared_meshes[signature] = mesh
        else:
            obj.data = existing
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / filename
    bpy.ops.export_scene.gltf(
        filepath=str(path),
        export_format="GLB",
        use_selection=False,
        export_apply=True,
        export_yup=True,
        export_materials="EXPORT",
        export_cameras=False,
        export_lights=False,
    )
    print(f"FIELDVISION_SMART_MACHINE_EXPORTED {path}")


def wheel(name, x, y, z, radius, width, parent):
    return cylinder(name, (x, y, z), radius, width, RUBBER, rot=(0, math.pi / 2, 0), vertices=24, parent=parent)


def build_tractor_seeder():
    clear()
    root = empty("AutonomousTractorRig")
    tractor = empty("TractorBodyRig", parent=root)

    cube("TractorChassis", (0, -0.25, 0.78), (1.1, 1.8, 0.22), AGRI_DARK, parent=tractor)
    cube("EngineHood", (0, -1.55, 1.35), (0.93, 0.95, 0.58), AGRI_GREEN, bevel=0.09, parent=tractor)
    cube("FrontGrille", (0, -2.5, 1.32), (0.72, 0.07, 0.42), AGRI_DARK, parent=tractor)
    cube("Cab", (0, 0.35, 1.78), (0.95, 0.9, 1.15), AGRI_GREEN, bevel=0.1, parent=tractor)
    cube("CabGlassFront", (0, -0.56, 2.02), (0.78, 0.035, 0.62), GLASS, rot=(math.radians(8), 0, 0), bevel=0.01, parent=tractor)
    cube("CabGlassRear", (0, 1.26, 1.98), (0.78, 0.035, 0.58), GLASS, bevel=0.01, parent=tractor)
    cube("CabGlassLeft", (0.96, 0.35, 2.02), (0.035, 0.65, 0.62), GLASS, bevel=0.01, parent=tractor)
    cube("CabGlassRight", (-0.96, 0.35, 2.02), (0.035, 0.65, 0.62), GLASS, bevel=0.01, parent=tractor)
    cube("CabRoof", (0, 0.35, 3.0), (1.08, 1.0, 0.12), WHITE, bevel=0.06, parent=tractor)

    wheel("WheelFrontLeft", 1.05, -1.55, 0.65, 0.62, 0.32, tractor)
    wheel("WheelFrontRight", -1.05, -1.55, 0.65, 0.62, 0.32, tractor)
    wheel("WheelRearLeft", 1.18, 0.82, 0.85, 0.84, 0.42, tractor)
    wheel("WheelRearRight", -1.18, 0.82, 0.85, 0.84, 0.42, tractor)
    for x in (-1.05, 1.05):
        cylinder(f"WheelHubFront_{x}", (x, -1.55, 0.65), 0.22, 0.36, STEEL, rot=(0, math.pi / 2, 0), vertices=18, parent=tractor)
    for x in (-1.18, 1.18):
        cylinder(f"WheelHubRear_{x}", (x, 0.82, 0.85), 0.28, 0.46, STEEL, rot=(0, math.pi / 2, 0), vertices=18, parent=tractor)

    cylinder("RTKMast", (0, 0.32, 3.35), 0.035, 0.55, STEEL, vertices=12, parent=tractor)
    sphere("RTKAntenna", (0, 0.32, 3.66), (0.18, 0.18, 0.1), WHITE, parent=tractor)
    cube("LidarFront", (0, -2.52, 1.82), (0.24, 0.08, 0.16), SENSOR, bevel=0.03, parent=tractor)
    cylinder("SafetyBeacon", (0.78, 0.34, 3.27), 0.1, 0.18, SIGNAL, vertices=16, parent=tractor)
    cube("RearHitch", (0, 1.72, 0.72), (0.35, 0.42, 0.13), STEEL, parent=tractor)

    lift = empty("SeederLift", loc=(0, 1.95, 0.68), parent=root)
    cube("SeederToolbar", (0, 0.86, 0.16), (2.55, 0.12, 0.12), STEEL, parent=lift)
    cube("SeedHopper", (0, 0.62, 0.74), (2.25, 0.5, 0.52), AGRI_GREEN, bevel=0.07, parent=lift)
    cube("SeedHopperLid", (0, 0.62, 1.28), (2.3, 0.53, 0.07), WHITE, bevel=0.025, parent=lift)
    for row in range(6):
        x = -2.05 + row * 0.82
        row_rig = empty(f"RowUnit_{row + 1}", loc=(x, 1.05, 0.05), parent=lift)
        cube(f"RowArm_{row + 1}", (0, -0.18, 0.24), (0.06, 0.42, 0.06), STEEL, rot=(math.radians(-18), 0, 0), parent=row_rig)
        cylinder(f"OpenerDisc_{row + 1}", (0, 0.22, 0.0), 0.24, 0.055, AGRI_DARK, rot=(0, math.pi / 2, 0), vertices=18, parent=row_rig)
        wheel(f"PressWheel_{row + 1}", 0, 0.66, 0.13, 0.19, 0.09, row_rig)
    cube("LeftMarkerArm", (2.9, 0.82, 0.35), (0.72, 0.055, 0.055), SAFETY, rot=(0, math.radians(-10), 0), parent=lift)
    cube("RightMarkerArm", (-2.9, 0.82, 0.35), (0.72, 0.055, 0.055), SAFETY, rot=(0, math.radians(10), 0), parent=lift)
    apply_and_export("fieldvision-autonomous-tractor-seeder.glb")


def build_inspection_robot():
    clear()
    root = empty("InspectionRobotRig")
    cube("RobotBase", (0, 0, 0.42), (0.62, 0.78, 0.28), AGRI_DARK, bevel=0.09, parent=root)
    cube("RobotTop", (0, -0.08, 0.78), (0.5, 0.55, 0.16), WHITE, bevel=0.08, parent=root)
    for x in (-0.67, 0.67):
        track = empty("TrackLeft" if x > 0 else "TrackRight", parent=root)
        cube(f"TrackBelt_{x}", (x, 0, 0.38), (0.13, 0.78, 0.26), RUBBER, bevel=0.11, parent=track)
        for y in (-0.5, 0, 0.5):
            cylinder(f"TrackWheel_{x}_{y}", (x, y, 0.38), 0.2, 0.16, STEEL, rot=(0, math.pi / 2, 0), vertices=16, parent=track)
    cylinder("SensorMast", (0, -0.1, 1.25), 0.035, 0.8, STEEL, vertices=12, parent=root)
    gimbal = empty("SensorGimbal", loc=(0, -0.1, 1.68), parent=root)
    cylinder("Lidar", (0, 0, 0), 0.18, 0.12, SENSOR, vertices=20, parent=gimbal)
    cube("StereoCamera", (0, -0.16, -0.12), (0.28, 0.09, 0.11), SENSOR, bevel=0.035, parent=gimbal)
    for x in (-0.14, 0.14):
        cylinder(f"CameraLens_{x}", (x, -0.26, -0.12), 0.045, 0.05, GLASS, rot=(math.pi / 2, 0, 0), vertices=14, parent=gimbal)
    cylinder("RTKAntenna", (0, 0.22, 1.48), 0.13, 0.08, WHITE, vertices=18, parent=root)
    cube("ProbeArm", (0.45, 0.45, 0.72), (0.05, 0.4, 0.05), STEEL, rot=(math.radians(20), 0, 0), parent=root)
    cylinder("ProbeTip", (0.45, 0.78, 0.44), 0.022, 0.58, STEEL, vertices=10, parent=root)
    cube("SafetyBumper", (0, -0.84, 0.35), (0.55, 0.06, 0.11), SAFETY, bevel=0.03, parent=root)
    apply_and_export("fieldvision-inspection-robot.glb")


def build_maintenance_vehicle():
    clear()
    root = empty("MaintenanceVehicleRig")
    cube("MaintenanceBase", (0, 0, 0.46), (0.78, 1.02, 0.28), AGRI_GREEN, bevel=0.1, parent=root)
    cube("BatteryCover", (0, 0.18, 0.8), (0.55, 0.58, 0.2), AGRI_DARK, bevel=0.08, parent=root)
    for x in (-0.78, 0.78):
        for y in (-0.72, 0.72):
            wheel(f"MaintenanceWheel_{x}_{y}", x, y, 0.38, 0.34, 0.2, root)
    deck = empty("MowerDeckRig", loc=(0, -0.95, 0.18), parent=root)
    cylinder("MowerDeck", (0, -0.38, 0), 0.84, 0.13, AGRI_DARK, vertices=28, parent=deck)
    blade = empty("MowerBlade", loc=(0, -0.38, -0.08), parent=deck)
    cube("BladeA", (0, 0, 0), (0.68, 0.055, 0.025), STEEL, parent=blade)
    cube("BladeB", (0, 0, 0), (0.055, 0.68, 0.025), STEEL, parent=blade)
    cube("SafetySkirt", (0, -0.42, 0.03), (0.9, 0.06, 0.13), SAFETY, bevel=0.025, parent=deck)
    cylinder("SensorMast", (0, 0.15, 1.28), 0.035, 0.9, STEEL, vertices=12, parent=root)
    cylinder("Lidar", (0, 0.15, 1.76), 0.16, 0.12, SENSOR, vertices=20, parent=root)
    cube("FrontCamera", (0, -1.03, 0.88), (0.22, 0.06, 0.12), SENSOR, bevel=0.03, parent=root)
    cylinder("SafetyBeacon", (0.48, 0.3, 1.15), 0.09, 0.16, SIGNAL, vertices=16, parent=root)
    cube("RearTowPoint", (0, 1.05, 0.38), (0.18, 0.18, 0.12), STEEL, parent=root)
    apply_and_export("fieldvision-maintenance-vehicle.glb")


build_tractor_seeder()
build_inspection_robot()
build_maintenance_vehicle()
