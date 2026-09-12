"""FieldVision 监督式自主智慧农场英雄设备（fv-8zm.12，精致度翻新）。

项目自制三份可动画 GLB：
  - 中型无人拖拉机 + 6 行播种机；
  - 田间巡检机器人；
  - 自主维护割草设备。

坐标约定：Blender +Z 向上，模型原点在轮/履带接地面中心，车头朝 -Y。
关键活动节点保留语义化对象名，供 R3F 在 fv-8zm.13 驱动车轮、机具、云台与割草盘。

精致度翻新（实拍 review 后）：
  - 轮胎全部带环向胎纹凸块（与胎体 join 成单对象，保持 runtime 按名旋转契约），
    轮毂改农机黄并加螺栓头；
  - 配色从薄荷绿玩具风改为深农机绿车漆（clearcoat）+ 农机黄轮圈 + 下部干泥色；
  - 拖拉机补排气管、空滤、A 柱、踏板、后轮挡泥板、三点悬挂拉杆、后视镜、排种管；
  - 巡检机器人履带加静态履带板（runtime 改为旋转内侧负重轮，见
    SmartMachineAssets.WHEEL_NAMES）、RTK 支架、探针铰链、履带挡泥板；
  - 割草机加轮毂螺栓、前防撞杆、排草口、防拖板滚轮。

运行：
  /Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup \
    --python scripts/blender/create_smart_farm_machines.py
"""

from pathlib import Path
import math
import bpy


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "public" / "assets" / "models"


def material(name, color, metallic=0.0, roughness=0.6, emission=None, coat=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1.0)
    shader.inputs["Metallic"].default_value = metallic
    shader.inputs["Roughness"].default_value = roughness
    if coat > 0:
        shader.inputs["Coat Weight"].default_value = coat
        shader.inputs["Coat Roughness"].default_value = 0.18
    if emission:
        shader.inputs["Emission Color"].default_value = (*emission, 1.0)
        shader.inputs["Emission Strength"].default_value = 2.2
    return mat


# 深农机绿车漆（clearcoat 清漆层）+ 农机黄轮圈 + 干泥色下部 —— 实拍 review 后
# 从"薄荷绿玩具"配色改为暖色场景下读作真车漆/干泥的体系。
AGRI_GREEN = material("Agri green", (0.075, 0.215, 0.085), 0.24, 0.42, coat=0.45)
AGRI_DARK = material("Agri dark", (0.045, 0.08, 0.06), 0.3, 0.55)
SAFETY = material("Safety amber", (0.84, 0.46, 0.08), 0.18, 0.5, coat=0.3)
STEEL = material("Machine steel", (0.36, 0.40, 0.38), 0.64, 0.42)
RUBBER = material("Machine rubber", (0.022, 0.026, 0.024), 0.0, 0.94)
GLASS = material("Cab glass", (0.055, 0.10, 0.115), 0.85, 0.1, coat=0.7)
SENSOR = material("Sensor graphite", (0.025, 0.045, 0.045), 0.26, 0.28)
SIGNAL = material("Autonomy signal", (0.08, 0.62, 0.42), 0.12, 0.32, (0.08, 0.78, 0.46))
WHITE = material("Equipment white", (0.60, 0.62, 0.56), 0.2, 0.48, coat=0.3)
RIM = material("Wheel rim yellow", (0.80, 0.56, 0.05), 0.32, 0.44, coat=0.35)
MUD = material("Dried mud", (0.135, 0.10, 0.065), 0.0, 0.98)


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


def join_into(base, parts):
    """Merge detail parts into the base object so the runtime contract (one
    named object per moving part) keeps working and draw calls stay low."""
    bpy.ops.object.select_all(action="DESELECT")
    for part in parts:
        part.select_set(True)
    base.select_set(True)
    bpy.context.view_layer.objects.active = base
    bpy.ops.object.join()
    return base


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


def treaded_wheel(name, x, y, z, radius, width, parent):
    """农业轮胎：胎体 + 环向胎纹凸块 join 成单对象（runtime 按对象名旋转的
    契约不变）。凸块左右交错错开，近景读作人字/块状花纹。"""
    tire = cylinder(name, (x, y, z), radius, width, RUBBER, rot=(0, math.pi / 2, 0), vertices=28, bevel=0.02, parent=parent)
    lug_count = max(10, round(radius * 18))
    lug_radial = max(0.022, radius * 0.06)
    lug_length = (2 * math.pi * radius / lug_count) * 0.62
    parts = []
    for index in range(lug_count):
        angle = index / lug_count * math.pi * 2
        ring = radius + lug_radial * 0.1
        ly = y + ring * math.cos(angle)
        lz = z + ring * math.sin(angle)
        stagger = width * 0.16 if index % 2 else -width * 0.16
        lug = cube(
            f"{name}_Lug{index}",
            (x + stagger, ly, lz),
            (width * 0.44, lug_length / 2, lug_radial / 2),
            RUBBER,
            rot=(angle - math.pi / 2, 0, 0),
            bevel=0,
        )
        parts.append(lug)
    join_into(tire, parts)
    tire.parent = parent
    return tire


def rim_with_bolts(name, x, y, z, rim_radius, depth, parent):
    """农机黄轮毂 + 一圈螺栓头（join 成单对象）。"""
    hub = cylinder(name, (x, y, z), rim_radius, depth, RIM, rot=(0, math.pi / 2, 0), vertices=22, bevel=0.02, parent=parent)
    parts = []
    bolt_ring = rim_radius * 0.58
    for index in range(6):
        angle = index / 6 * math.pi * 2
        bolt = cylinder(
            f"{name}_Bolt{index}",
            (x, y + bolt_ring * math.cos(angle), z + bolt_ring * math.sin(angle)),
            rim_radius * 0.09,
            depth + 0.03,
            STEEL,
            rot=(0, math.pi / 2, 0),
            vertices=10,
            bevel=0.004,
        )
        parts.append(bolt)
    join_into(hub, parts)
    hub.parent = parent
    return hub


def track_pads(name, x, parent):
    """履带板：环绕履带带轮廓一圈的静态垫板（真实履带整体并不自转——
    runtime 改为旋转内侧负重轮）。join 成单对象控制 draw call。"""
    cz = 0.38
    half_z = 0.26
    straight_half_y = 0.66
    end_radius = half_z + 0.018
    pad_thick = 0.035
    parts = []
    # 上/下直段
    for side in (-1, 1):
        z = cz + side * (half_z + pad_thick / 2 + 0.004)
        for step in range(10):
            y = -straight_half_y + step * (2 * straight_half_y / 9)
            pad = cube(f"{name}_run{side}_{step}", (x, y, z), (0.155, 0.062, pad_thick / 2), RUBBER, bevel=0.008)
            parts.append(pad)
    # 两端半圆段
    for end in (-1, 1):
        for step in range(5):
            theta = math.radians(-72 + step * 36)
            y = end * straight_half_y + end * end_radius * math.sin(theta)
            z = cz + end_radius * math.cos(theta)
            pad = cube(
                f"{name}_end{end}_{step}",
                (x, y, z),
                (0.155, 0.062, pad_thick / 2),
                RUBBER,
                rot=(-theta if end > 0 else theta, 0, 0),
                bevel=0.008,
            )
            parts.append(pad)
    base = parts[0]
    join_into(base, parts[1:])
    base.name = name
    base.parent = parent
    return base


def build_tractor_seeder():
    clear()
    root = empty("AutonomousTractorRig")
    tractor = empty("TractorBodyRig", parent=root)

    cube("TractorChassis", (0, -0.25, 0.78), (1.1, 1.8, 0.22), AGRI_DARK, parent=tractor)
    cube("EngineHood", (0, -1.55, 1.35), (0.93, 0.95, 0.58), AGRI_GREEN, bevel=0.09, parent=tractor)
    cube("FrontGrille", (0, -2.5, 1.32), (0.72, 0.07, 0.42), AGRI_DARK, parent=tractor)
    # 格栅横条：近景能读出"散热器"而不是一块黑板
    for row in range(4):
        cube(f"GrilleSlat_{row}", (0, -2.56, 1.12 + row * 0.13), (0.68, 0.02, 0.035), STEEL, bevel=0.008, parent=tractor)
    cube("Cab", (0, 0.35, 1.78), (0.95, 0.9, 1.15), AGRI_GREEN, bevel=0.1, parent=tractor)
    cube("CabGlassFront", (0, -0.56, 2.02), (0.78, 0.035, 0.62), GLASS, rot=(math.radians(8), 0, 0), bevel=0.01, parent=tractor)
    cube("CabGlassRear", (0, 1.26, 1.98), (0.78, 0.035, 0.58), GLASS, bevel=0.01, parent=tractor)
    cube("CabGlassLeft", (0.96, 0.35, 2.02), (0.035, 0.65, 0.62), GLASS, bevel=0.01, parent=tractor)
    cube("CabGlassRight", (-0.96, 0.35, 2.02), (0.035, 0.65, 0.62), GLASS, bevel=0.01, parent=tractor)
    cube("CabRoof", (0, 0.35, 3.0), (1.08, 1.0, 0.12), WHITE, bevel=0.06, parent=tractor)
    # 驾驶室 A/C 柱：玻璃不再像悬浮平板
    for sx in (-0.92, 0.92):
        cube(f"CabPillarFront_{sx}", (sx, -0.5, 2.0), (0.055, 0.07, 0.62), AGRI_GREEN, rot=(math.radians(4), 0, 0), bevel=0.015, parent=tractor)
        cube(f"CabPillarRear_{sx}", (sx, 1.2, 2.0), (0.055, 0.07, 0.58), AGRI_GREEN, bevel=0.015, parent=tractor)
    # 排气管 + 防雨帽 + 空滤罐：拖拉机侧面最容易被读到的中尺度细节
    cylinder("ExhaustStack", (0.55, -1.05, 2.35), 0.05, 0.85, AGRI_DARK, vertices=14, parent=tractor)
    cylinder("ExhaustCap", (0.58, -1.05, 2.8), 0.055, 0.16, STEEL, rot=(0, math.radians(35), 0), vertices=12, bevel=0.01, parent=tractor)
    cylinder("AirFilter", (-0.55, -1.5, 2.0), 0.11, 0.34, AGRI_DARK, vertices=16, parent=tractor)
    # 登车踏板
    cube("StepUpper", (0.95, -0.35, 0.72), (0.22, 0.26, 0.035), STEEL, bevel=0.01, parent=tractor)
    cube("StepLower", (1.02, -0.35, 0.45), (0.2, 0.26, 0.035), STEEL, bevel=0.01, parent=tractor)
    # 后视镜
    for sx in (-1.0, 1.0):
        cube(f"MirrorArm_{sx}", (sx, -0.62, 2.55), (0.03, 0.16, 0.03), STEEL, rot=(0, 0, math.radians(-18 if sx > 0 else 18)), bevel=0.008, parent=tractor)
        cube(f"Mirror_{sx}", (sx * 1.08, -0.72, 2.5), (0.03, 0.1, 0.14), SENSOR, bevel=0.012, parent=tractor)

    treaded_wheel("WheelFrontLeft", 1.05, -1.55, 0.66, 0.62, 0.34, tractor)
    treaded_wheel("WheelFrontRight", -1.05, -1.55, 0.66, 0.62, 0.34, tractor)
    treaded_wheel("WheelRearLeft", 1.18, 0.82, 0.9, 0.84, 0.44, tractor)
    treaded_wheel("WheelRearRight", -1.18, 0.82, 0.9, 0.84, 0.44, tractor)
    for x in (-1.05, 1.05):
        rim_with_bolts(f"WheelHubFront_{x}", x, -1.55, 0.66, 0.23, 0.38, tractor)
    for x in (-1.18, 1.18):
        rim_with_bolts(f"WheelHubRear_{x}", x, 0.82, 0.9, 0.3, 0.48, tractor)
    # 后轮挡泥板 + 轮后挡泥帘（干泥色）
    for sx in (-1.18, 1.18):
        cube(f"RearFender_{sx}", (sx, 0.82, 1.84), (0.3, 0.78, 0.05), AGRI_GREEN, bevel=0.03, parent=tractor)
        cube(f"MudFlap_{sx}", (sx, 1.62, 0.62), (0.28, 0.03, 0.42), MUD, rot=(math.radians(6), 0, 0), bevel=0.01, parent=tractor)
    # 前轮后挡泥帘
    for sx in (-1.05, 1.05):
        cube(f"FrontMudFlap_{sx}", (sx, -1.05, 0.5), (0.26, 0.03, 0.34), MUD, rot=(math.radians(-8), 0, 0), bevel=0.01, parent=tractor)
    # 车身侧面下部泥污带
    cube("MudSkirtLeft", (1.06, -0.2, 0.62), (0.04, 1.25, 0.2), MUD, bevel=0.015, parent=tractor)
    cube("MudSkirtRight", (-1.06, -0.2, 0.62), (0.04, 1.25, 0.2), MUD, bevel=0.015, parent=tractor)

    cylinder("RTKMast", (0, 0.32, 3.35), 0.035, 0.55, STEEL, vertices=12, parent=tractor)
    sphere("RTKAntenna", (0, 0.32, 3.66), (0.18, 0.18, 0.1), WHITE, parent=tractor)
    cube("LidarFront", (0, -2.52, 1.82), (0.24, 0.08, 0.16), SENSOR, bevel=0.03, parent=tractor)
    cylinder("SafetyBeacon", (0.78, 0.34, 3.27), 0.1, 0.18, SIGNAL, vertices=16, parent=tractor)
    cube("RearHitch", (0, 1.72, 0.72), (0.35, 0.42, 0.13), STEEL, parent=tractor)
    # 三点悬挂拉杆：从车尾连到播种机，消除"播种机悬浮"感
    for sx in (-0.32, 0.32):
        cube(f"LowerLink_{sx}", (sx, 2.2, 0.66), (0.05, 0.5, 0.05), STEEL, rot=(math.radians(-6), 0, 0), bevel=0.012, parent=tractor)
    cube("TopLink", (0, 2.15, 1.0), (0.045, 0.45, 0.045), SAFETY, rot=(math.radians(-28), 0, 0), bevel=0.01, parent=tractor)

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
        # 排种管：从肥箱底到开沟器的波纹管（近景补上"种从哪里来"）
        cylinder(f"SeedTube_{row + 1}", (x * 0.97, 0.78, 0.42), 0.035, 0.62, RUBBER, rot=(math.radians(-24), 0, 0), vertices=10, bevel=0.006, parent=lift)
    cube("LeftMarkerArm", (2.9, 0.82, 0.35), (0.72, 0.055, 0.055), SAFETY, rot=(0, math.radians(-10), 0), parent=lift)
    cube("RightMarkerArm", (-2.9, 0.82, 0.35), (0.72, 0.055, 0.055), SAFETY, rot=(0, math.radians(10), 0), parent=lift)
    apply_and_export("fieldvision-autonomous-tractor-seeder.glb")


def build_inspection_robot():
    clear()
    root = empty("InspectionRobotRig")
    cube("RobotBase", (0, 0, 0.42), (0.62, 0.78, 0.28), AGRI_DARK, bevel=0.09, parent=root)
    cube("RobotTop", (0, -0.08, 0.78), (0.5, 0.55, 0.16), WHITE, bevel=0.08, parent=root)
    # 车身下部泥污带
    cube("RobotMudBand", (0, 0, 0.24), (0.6, 0.76, 0.08), MUD, bevel=0.03, parent=root)
    for x in (-0.67, 0.67):
        track = empty("TrackLeft" if x > 0 else "TrackRight", parent=root)
        cube(f"TrackBelt_{x}", (x, 0, 0.38), (0.13, 0.78, 0.26), RUBBER, bevel=0.11, parent=track)
        track_pads(f"TrackPads_{x}", x, track)
        for y in (-0.5, 0, 0.5):
            cylinder(f"TrackWheel_{x}_{y}", (x, y, 0.38), 0.2, 0.16, STEEL, rot=(0, math.pi / 2, 0), vertices=16, parent=track)
        # 履带上方挡泥板
        cube(f"TrackGuard_{x}", (x, 0, 0.7), (0.17, 0.82, 0.04), AGRI_DARK, bevel=0.02, parent=track)
    cylinder("SensorMast", (0, -0.1, 1.25), 0.035, 0.8, STEEL, vertices=12, parent=root)
    gimbal = empty("SensorGimbal", loc=(0, -0.1, 1.68), parent=root)
    cylinder("Lidar", (0, 0, 0), 0.18, 0.12, SENSOR, vertices=20, parent=gimbal)
    cube("StereoCamera", (0, -0.16, -0.12), (0.28, 0.09, 0.11), SENSOR, bevel=0.035, parent=gimbal)
    for x in (-0.14, 0.14):
        cylinder(f"CameraLens_{x}", (x, -0.26, -0.12), 0.045, 0.05, GLASS, rot=(math.pi / 2, 0, 0), vertices=14, parent=gimbal)
    # RTK 支架：白盘不再悬空
    cylinder("RTKBracket", (0, 0.22, 1.2), 0.022, 0.56, STEEL, vertices=10, parent=root)
    cylinder("RTKAntenna", (0, 0.22, 1.48), 0.13, 0.08, WHITE, vertices=18, parent=root)
    # 探针铰链：臂有根
    cylinder("ProbeHinge", (0.45, 0.28, 0.66), 0.06, 0.12, STEEL, rot=(0, math.pi / 2, 0), vertices=14, parent=root)
    cube("ProbeArm", (0.45, 0.45, 0.72), (0.05, 0.4, 0.05), STEEL, rot=(math.radians(20), 0, 0), parent=root)
    cylinder("ProbeTip", (0.45, 0.78, 0.44), 0.022, 0.58, STEEL, vertices=10, parent=root)
    cube("SafetyBumper", (0, -0.84, 0.35), (0.55, 0.06, 0.11), SAFETY, bevel=0.03, parent=root)
    apply_and_export("fieldvision-inspection-robot.glb")


def build_maintenance_vehicle():
    clear()
    root = empty("MaintenanceVehicleRig")
    cube("MaintenanceBase", (0, 0, 0.46), (0.78, 1.02, 0.28), AGRI_GREEN, bevel=0.1, parent=root)
    cube("BatteryCover", (0, 0.18, 0.8), (0.55, 0.58, 0.2), AGRI_DARK, bevel=0.08, parent=root)
    # 车身下部泥污带
    cube("MaintenanceMudBand", (0, 0, 0.28), (0.76, 1.0, 0.1), MUD, bevel=0.04, parent=root)
    for x in (-0.78, 0.78):
        for y in (-0.72, 0.72):
            treaded_wheel(f"MaintenanceWheel_{x}_{y}", x, y, 0.4, 0.34, 0.2, root)
            rim_with_bolts(f"MaintenanceHub_{x}_{y}", x, y, 0.4, 0.13, 0.24, root)
    # 前防撞杆
    cube("FrontBumperBar", (0, -1.12, 0.34), (0.8, 0.05, 0.06), STEEL, bevel=0.015, parent=root)
    for sx in (-0.6, 0.6):
        cube(f"BumperPost_{sx}", (sx, -1.06, 0.42), (0.05, 0.14, 0.05), STEEL, rot=(math.radians(20), 0, 0), bevel=0.012, parent=root)
    deck = empty("MowerDeckRig", loc=(0, -0.95, 0.18), parent=root)
    cylinder("MowerDeck", (0, -0.38, 0), 0.84, 0.13, AGRI_DARK, vertices=28, parent=deck)
    blade = empty("MowerBlade", loc=(0, -0.38, -0.08), parent=deck)
    cube("BladeA", (0, 0, 0), (0.68, 0.055, 0.025), STEEL, parent=blade)
    cube("BladeB", (0, 0, 0), (0.055, 0.68, 0.025), STEEL, parent=blade)
    cube("SafetySkirt", (0, -0.42, 0.03), (0.9, 0.06, 0.13), SAFETY, bevel=0.025, parent=deck)
    # 排草口 + 防拖板滚轮
    cube("DischargeChute", (0.86, -0.3, 0.1), (0.22, 0.3, 0.06), AGRI_DARK, rot=(0, 0, math.radians(-14)), bevel=0.02, parent=deck)
    for sx in (-0.55, 0.55):
        cylinder(f"ScalpRoller_{sx}", (sx, -1.05, 0.02), 0.06, 0.14, RUBBER, rot=(0, math.pi / 2, 0), vertices=14, bevel=0.01, parent=deck)
    cylinder("SensorMast", (0, 0.15, 1.28), 0.035, 0.9, STEEL, vertices=12, parent=root)
    cylinder("Lidar", (0, 0.15, 1.76), 0.16, 0.12, SENSOR, vertices=20, parent=root)
    cube("FrontCamera", (0, -1.03, 0.88), (0.22, 0.06, 0.12), SENSOR, bevel=0.03, parent=root)
    cylinder("SafetyBeacon", (0.48, 0.3, 1.15), 0.09, 0.16, SIGNAL, vertices=16, parent=root)
    cube("RearTowPoint", (0, 1.05, 0.38), (0.18, 0.18, 0.12), STEEL, parent=root)
    apply_and_export("fieldvision-maintenance-vehicle.glb")


build_tractor_seeder()
build_inspection_robot()
build_maintenance_vehicle()
