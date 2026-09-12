"""FieldVision 比例锚点：农用 utility truck（fv-66y.12，方向：Blender 自制 GLB）。

复用 create_hero_facilities.py 的范式（bpy 原语 + 倒角 + Principled BSDF +
GLB 导出），替换 GroundDetails 里的 box 装配。模型原点在轮地接触面中心、
+Z 向上（Blender），导出 Yup，长度沿 Y、宽度沿 X，比例与原 box 装配一致
（~4.7m 长、2.0m 宽、轮中心 z≈0.55），便于在场景原点位直接替换。

精致度翻新（实拍 review 后）：
  - 轮胎加环向胎纹凸块（join 单对象），轮毂改钢色 + 螺栓头；
  - 车漆改深橄榄绿 + clearcoat（原浅灰绿在暖光下被洗白）；
  - 货斗栏板外侧加竖向加强筋、斗内加工具箱与油桶、轮拱加挡泥板。

运行（桌面版 Blender）：
  /Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup \\
    --python scripts/blender/create_utility_vehicle.py
输出：public/assets/models/fieldvision-utility-vehicle.glb
"""
from pathlib import Path
import bpy
import math

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "public" / "assets" / "models" / "fieldvision-utility-vehicle.glb"


def material(name, color, metallic=0.0, roughness=0.5, emission=None, emission_strength=4.0, coat=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1.0)
    shader.inputs["Metallic"].default_value = metallic
    shader.inputs["Roughness"].default_value = roughness
    if coat > 0:
        shader.inputs["Coat Weight"].default_value = coat
        shader.inputs["Coat Roughness"].default_value = 0.2
    if emission:
        shader.inputs["Emission Color"].default_value = (*emission, 1.0)
        shader.inputs["Emission Strength"].default_value = emission_strength
    return mat


# Subdued agro palette, consistent with the scene's golden-hour light.
BODY = material("Truck body", (0.20, 0.26, 0.13), 0.18, 0.5, coat=0.4)        # deep olive
BODY_DARK = material("Truck body dark", (0.13, 0.17, 0.10), 0.16, 0.62)      # fenders / grille
STEEL = material("Truck steel", (0.50, 0.52, 0.53), 0.62, 0.40)              # bumper, roll bar, hubs
RUBBER = material("Truck rubber", (0.04, 0.04, 0.04), 0.0, 0.96)             # tires
GLASS = material("Truck glass", (0.10, 0.15, 0.17), 0.7, 0.12, coat=0.6)     # dark glass
HEAD = material("Truck headlight", (0.95, 0.86, 0.62), 0.1, 0.3, (0.95, 0.84, 0.58), 3.0)
TAIL = material("Truck taillight", (0.55, 0.10, 0.07), 0.1, 0.4, (0.6, 0.10, 0.08), 1.5)
MUD = material("Dried mud", (0.135, 0.10, 0.065), 0.0, 0.98)


def finish(obj, mat, bevel=0.05, segments=3):
    obj.data.materials.append(mat)
    if bevel > 0:
        mod = obj.modifiers.new("Edge", "BEVEL")
        mod.width = bevel
        mod.segments = segments
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.shade_smooth_by_angle()
    obj.select_set(False)
    return obj


def cube(name, loc, scale, mat, rot=(0, 0, 0), bevel=0.05):
    bpy.ops.mesh.primitive_cube_add(location=loc, rotation=rot)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(obj, mat, bevel)


def cylinder(name, loc, radius, depth, mat, rot=(0, 0, 0), vertices=32, bevel=0.03):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc, rotation=rot)
    obj = bpy.context.object
    obj.name = name
    return finish(obj, mat, bevel)


def join_into(base, parts):
    bpy.ops.object.select_all(action="DESELECT")
    for part in parts:
        part.select_set(True)
    base.select_set(True)
    bpy.context.view_layer.objects.active = base
    bpy.ops.object.join()
    return base


def treaded_wheel(name, x, y, z, radius, width):
    """胎体 + 环向胎纹凸块 join 成单对象，与农机三件套同一工艺。"""
    tire = cylinder(name, (x, y, z), radius, width, RUBBER, rot=(0, math.pi / 2, 0), vertices=36, bevel=0.02)
    lug_count = max(12, round(radius * 20))
    lug_radial = max(0.02, radius * 0.055)
    lug_length = (2 * math.pi * radius / lug_count) * 0.62
    parts = []
    for index in range(lug_count):
        angle = index / lug_count * math.pi * 2
        ring = radius + lug_radial * 0.1
        ly = y + ring * math.cos(angle)
        lz = z + ring * math.sin(angle)
        stagger = width * 0.16 if index % 2 else -width * 0.16
        lug = cube(f"{name}_Lug{index}", (x + stagger, ly, lz), (width * 0.44, lug_length / 2, lug_radial / 2), RUBBER, rot=(angle - math.pi / 2, 0, 0), bevel=0)
        parts.append(lug)
    join_into(tire, parts)
    return tire


bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)

# 1. Chassis frame (dark) + cargo bed floor.
cube("Chassis", (0, 0, 0.45), (1.9, 4.0, 0.16), BODY_DARK, bevel=0.04)
cube("BedFloor", (0, 0.95, 0.80), (1.9, 2.15, 0.10), BODY, bevel=0.03)

# 2. Cargo bed low side rails (flatbed with side boards).
cube("BedRailL", (0.94, 0.95, 1.08), (0.08, 2.15, 0.55), BODY, bevel=0.02)
cube("BedRailR", (-0.94, 0.95, 1.08), (0.08, 2.15, 0.55), BODY, bevel=0.02)
cube("BedRailTail", (0, 2.0, 1.08), (1.88, 0.08, 0.55), BODY, bevel=0.02)
cube("BedRailFront", (0, -0.12, 1.08), (1.88, 0.08, 0.55), BODY, bevel=0.02)
# 栏板外侧竖向加强筋：近景不再是一整块平板
for index, sy in enumerate((-0.55, 0.35, 1.25, 1.95)):
    cube(f"RailStakeL_{index}", (1.0, sy, 1.08), (0.05, 0.09, 0.58), BODY_DARK, bevel=0.015)
    cube(f"RailStakeR_{index}", (-1.0, sy, 1.08), (0.05, 0.09, 0.58), BODY_DARK, bevel=0.015)
for index, sx in enumerate((-0.6, 0.0, 0.6)):
    cube(f"TailStake_{index}", (sx, 2.06, 1.08), (0.09, 0.05, 0.58), BODY_DARK, bevel=0.015)
# 货斗内道具：工具箱 + 油桶，给比例锚点加点"在用"感
cube("BedToolbox", (-0.45, -0.05, 1.0), (0.7, 0.35, 0.28), BODY_DARK, bevel=0.03)
cylinder("BedFuelCan", (0.55, 0.35, 1.05), 0.16, 0.42, STEEL, vertices=18, bevel=0.02)

# 3. Cab + roof + hood (olive, beveled masses — the focal silhouettes).
cube("Cab", (0, -1.30, 1.28), (1.85, 1.45, 1.25), BODY, bevel=0.09)
cube("CabRoof", (0, -1.30, 1.96), (1.82, 1.40, 0.10), BODY, bevel=0.03)
cube("Hood", (0, -2.25, 1.02), (1.80, 0.62, 0.72), BODY, bevel=0.05)

# 4. Glass: windshield (angled) + two side windows.
cube("Windshield", (0, -2.06, 1.50), (1.55, 0.05, 0.78), GLASS, rot=(0.18, 0, 0), bevel=0.01)
cube("CabGlassL", (0.92, -1.30, 1.42), (0.04, 1.05, 0.62), GLASS, bevel=0.01)
cube("CabGlassR", (-0.92, -1.30, 1.42), (0.04, 1.05, 0.62), GLASS, bevel=0.01)

# 5. Wheels: treaded tires + steel hubs with bolt heads.
for sx in (-1.0, 1.0):
    for sy in (-1.45, 1.45):
        treaded_wheel(f"Tire_{sx}_{sy}", sx, sy, 0.58, 0.48, 0.30)
        hub = cylinder(f"Hub_{sx}_{sy}", (sx, sy, 0.58), 0.19, 0.34, STEEL, rot=(0, math.pi / 2, 0), vertices=22, bevel=0.02)
        bolts = []
        for index in range(6):
            angle = index / 6 * math.pi * 2
            bolts.append(cylinder(
                f"HubBolt_{sx}_{sy}_{index}",
                (sx, sy + 0.11 * math.cos(angle), 0.58 + 0.11 * math.sin(angle)),
                0.018, 0.37, BODY_DARK, rot=(0, math.pi / 2, 0), vertices=10, bevel=0.004,
            ))
        join_into(hub, bolts)
# 轮拱挡泥板
for sx in (-1.0, 1.0):
    for sy in (-1.45, 1.45):
        cube(f"Mudguard_{sx}_{sy}", (sx, sy, 1.12), (0.36, 0.62, 0.045), BODY_DARK, bevel=0.03)
        cube(f"TruckMudFlap_{sx}_{sy}", (sx, sy + 0.55, 0.35), (0.3, 0.03, 0.3), MUD, bevel=0.01)

# 6. Front bumper + grille; headlights (warm emission); tail lights (red).
cube("Bumper", (0, -2.52, 0.72), (1.85, 0.16, 0.34), STEEL, bevel=0.03)
cube("Grille", (0, -2.55, 1.04), (1.20, 0.05, 0.42), BODY_DARK, bevel=0.01)
for row in range(3):
    cube(f"GrilleSlat_{row}", (0, -2.58, 0.9 + row * 0.14), (1.14, 0.02, 0.035), STEEL, bevel=0.008)
cylinder("HeadL", (0.66, -2.56, 0.96), 0.12, 0.07, HEAD, rot=(math.pi / 2, 0, 0), vertices=20, bevel=0.01)
cylinder("HeadR", (-0.66, -2.56, 0.96), 0.12, 0.07, HEAD, rot=(math.pi / 2, 0, 0), vertices=20, bevel=0.01)
cube("TailL", (0.80, 2.02, 0.92), (0.18, 0.05, 0.22), TAIL, bevel=0.01)
cube("TailR", (-0.80, 2.02, 0.92), (0.18, 0.05, 0.22), TAIL, bevel=0.01)

# 7. Roll bar behind the cab (two uprights + top bar) — reads as a working farm truck.
cube("RollUprightL", (0.86, -0.10, 1.45), (0.07, 0.07, 1.25), STEEL, bevel=0.015)
cube("RollUprightR", (-0.86, -0.10, 1.45), (0.07, 0.07, 1.25), STEEL, bevel=0.015)
cube("RollTop", (0, -0.10, 2.08), (1.75, 0.07, 0.07), STEEL, bevel=0.015)

# 8. Side mirrors (small, steel) for a touch of scale realism.
cube("MirrorL", (1.00, -1.85, 1.50), (0.04, 0.18, 0.14), STEEL, bevel=0.01)
cube("MirrorR", (-1.00, -1.85, 1.50), (0.04, 0.18, 0.14), STEEL, bevel=0.01)

# Apply bevel modifiers, then export.
bpy.ops.object.select_all(action="SELECT")
for obj in list(bpy.context.selected_objects):
    if obj.type == "MESH":
        bpy.context.view_layer.objects.active = obj
        for mod in list(obj.modifiers):
            bpy.ops.object.modifier_apply(modifier=mod.name)

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=str(OUTPUT),
    export_format="GLB",
    use_selection=False,
    export_apply=True,
    export_yup=True,
    export_materials="EXPORT",
    export_cameras=False,
    export_lights=False,
)
print(f"FIELDVISION_VEHICLE_EXPORTED {OUTPUT}")
