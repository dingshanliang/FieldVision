"""FieldVision 3.0 hero 资产生成 第二批（fv-o6c.9，Blender 自制）。

生成 A02 灌溉/近景章节缺失的三个 hero 资产：
  - 渠口（进水口结构：混凝土翼墙 + 节制闸板 + 消力池），置于东支渠入 A02 处；
  - 涵洞（箱涵：barrel + 两端 headwall/wingwall + apron），置于机耕路过水处；
  - 稻株簇（hero 水稻丛：分蘖茎 + 叶片 + 稻穗），用于 A02 近景。
复用 create_drone.py / create_hero_facilities.py 的范式。

运行：
  /Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup \\
    --python scripts/blender/create_hero_assets_2.py
输出：public/assets/models/fieldvision-canal-inlet.glb
      public/assets/models/fieldvision-culvert.glb
      public/assets/models/fieldvision-rice-cluster.glb
"""
from pathlib import Path
import bpy
import math
import random

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "public" / "assets" / "models"


def material(name, color, metallic=0.0, roughness=0.5, emission=None):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1.0)
    shader.inputs["Metallic"].default_value = metallic
    shader.inputs["Roughness"].default_value = roughness
    if emission:
        shader.inputs["Emission Color"].default_value = (*emission, 1.0)
        shader.inputs["Emission Strength"].default_value = 4.0
    return mat


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


def cylinder(name, loc, radius, depth, mat, rot=(0, 0, 0), vertices=24, bevel=0.03):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc, rotation=rot)
    obj = bpy.context.object
    obj.name = name
    return finish(obj, mat, bevel)


def clear():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)


def apply_and_export(path):
    bpy.ops.object.select_all(action="SELECT")
    for obj in list(bpy.context.selected_objects):
        if obj.type == "MESH":
            bpy.context.view_layer.objects.active = obj
            for mod in list(obj.modifiers):
                bpy.ops.object.modifier_apply(modifier=mod.name)
    path.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=str(path), export_format="GLB", use_selection=False, export_apply=True, export_yup=True, export_materials="EXPORT", export_cameras=False, export_lights=False)
    print(f"FIELDVISION_EXPORTED {path}")


# ============ 渠口（进水口节制闸）============
def build_canal_inlet():
    CONC = material("Inlet concrete", (0.66, 0.63, 0.58), 0.0, 0.93)
    CONC_WET = material("Inlet wet concrete", (0.48, 0.45, 0.40), 0.0, 0.9)
    STEEL = material("Inlet steel", (0.34, 0.37, 0.38), 0.7, 0.34)
    PAINT = material("Inlet paint", (0.55, 0.58, 0.55), 0.4, 0.5)
    RUST = material("Inlet rust", (0.36, 0.19, 0.11), 0.2, 0.8)
    WARN = material("Inlet warning", (0.92, 0.74, 0.10), 0.25, 0.55)

    clear()
    # U 形翼墙 + 底板（水从 +X 方向（渠）流向 -X（田））。
    cube("Apron", (0, 0, 0.10), (3.0, 4.6, 0.20), CONC_WET, bevel=0.03)
    cube("Headwall", (-1.1, 0, 0.9), (0.5, 4.6, 1.6), CONC, bevel=0.04)
    cube("WingwallL", (-1.0, 2.0, 0.85), (0.45, 2.6, 1.4), CONC, rot=(0, 0, math.radians(-22)), bevel=0.04)
    cube("WingwallR", (-1.0, -2.0, 0.85), (0.45, 2.6, 1.4), CONC, rot=(0, 0, math.radians(22)), bevel=0.04)
    cube("Sill", (-0.85, 0, 0.55), (0.5, 3.0, 0.4), CONC_WET, bevel=0.03)
    # 节制闸板（竖直滑动）+ 闸杆 + 手轮/启闭机。
    cube("GateLeaf", (-0.95, 0, 1.5), (0.12, 3.0, 2.0), PAINT, bevel=0.02)
    cube("GateRust", (-1.02, 0.6, 0.9), (0.03, 0.6, 0.5), RUST, bevel=0.01)
    cube("GateFrame", (-0.95, 1.55, 2.55), (0.22, 3.4, 0.35), STEEL, bevel=0.03)
    cube("GateFrameB", (-0.95, -1.55, 2.55), (0.22, 3.4, 0.35), STEEL, bevel=0.03)
    cylinder("Stem", (-0.95, 0, 3.1), 0.10, 1.4, STEEL, bevel=0.02)
    cylinder("Handwheel", (-0.95, 0, 3.85), 0.55, 0.10, PAINT, rot=(math.pi / 2, 0, 0), vertices=20, bevel=0.02)
    cylinder("HandwheelHub", (-0.95, 0, 3.85), 0.12, 0.22, STEEL, rot=(math.pi / 2, 0, 0), bevel=0.01)
    # 水位标尺 + 警示带。
    cube("Gauge", (0.0, 2.05, 1.0), (0.05, 0.05, 1.6), WARN, bevel=0.01)
    cube("WarnStripe", (-0.7, 2.25, 1.7), (0.4, 0.05, 0.10), WARN, bevel=0.005)
    apply_and_export(OUT / "fieldvision-canal-inlet.glb")


# ============ 涵洞（箱涵）============
def build_culvert():
    CONC = material("Culvert concrete", (0.64, 0.61, 0.56), 0.0, 0.93)
    CONC_DARK = material("Culvert shadow", (0.42, 0.40, 0.36), 0.0, 0.9)
    EARTH = material("Culvert earth", (0.40, 0.30, 0.18), 0.0, 0.95)

    clear()
    # 矩形 barrel（过水通道），内部暗色。
    cube("Barrel", (0, 0, 0.7), (5.0, 2.2, 1.4), CONC, bevel=0.04)
    cube("BarrelVoid", (0, 0, 0.85), (5.4, 1.3, 0.85), CONC_DARK, bevel=0.03)  # 开口暗腔读作过水
    # 两端 headwall + 翼墙八字口。
    cube("HeadwallA", (2.3, 0, 0.95), (0.45, 3.6, 1.9), CONC, bevel=0.04)
    cube("HeadwallB", (-2.3, 0, 0.95), (0.45, 3.6, 1.9), CONC, bevel=0.04)
    cube("WingAL", (2.3, 1.7, 0.85), (0.4, 2.0, 1.5), CONC, rot=(0, 0, math.radians(30)), bevel=0.03)
    cube("WingAR", (2.3, -1.7, 0.85), (0.4, 2.0, 1.5), CONC, rot=(0, 0, math.radians(-30)), bevel=0.03)
    cube("WingBL", (-2.3, 1.7, 0.85), (0.4, 2.0, 1.5), CONC, rot=(0, 0, math.radians(30)), bevel=0.03)
    cube("WingBR", (-2.3, -1.7, 0.85), (0.4, 2.0, 1.5), CONC, rot=(0, 0, math.radians(-30)), bevel=0.03)
    cube("ApronA", (2.55, 0, 0.12), (0.7, 3.6, 0.24), CONC_DARK, bevel=0.02)
    cube("ApronB", (-2.55, 0, 0.12), (0.7, 3.6, 0.24), CONC_DARK, bevel=0.02)
    # 顶部覆土（路堤感）。
    cube("Embankment", (0, 0, 1.85), (5.6, 4.4, 0.5), EARTH, bevel=0.08)
    apply_and_export(OUT / "fieldvision-culvert.glb")


# ============ 稻株簇（hero 水稻丛）============
def build_rice_cluster():
    LEAF = material("Rice leaf", (0.36, 0.50, 0.20), 0.0, 0.7)
    LEAF_DARK = material("Rice leaf dark", (0.26, 0.38, 0.15), 0.0, 0.72)
    STALK = material("Rice stalk", (0.30, 0.40, 0.16), 0.0, 0.6)
    GRAIN = material("Rice grain", (0.82, 0.66, 0.24), 0.0, 0.55)

    clear()
    rng = random.Random(20260723)
    # 7 支分蘖，从基部向外散开，每支有茎、几片叶、顶部稻穗。
    for t in range(7):
        ang = (t / 7) * math.pi * 2 + rng.uniform(-0.18, 0.18)
        rx, rz = math.cos(ang) * 0.12, math.sin(ang) * 0.12
        lean = rng.uniform(-0.12, 0.12)
        height = 1.5 + rng.uniform(-0.12, 0.18)
        # 茎。
        cylinder(f"Stalk_{t}", (rx, height / 2, rz), 0.025, height, STALK, vertices=8, bevel=0.004)
        # 3 片叶（细长斜置薄片，沿茎不同高度）。
        for li in range(3):
            ly = height * (0.35 + li * 0.22)
            lang = ang + li * 1.4 + rng.uniform(-0.3, 0.3)
            lx = rx + math.cos(lang) * 0.05
            lz = rz + math.sin(lang) * 0.05
            mat = LEAF if li % 2 == 0 else LEAF_DARK
            cube(f"Leaf_{t}_{li}", (lx + math.cos(lang) * 0.45, ly + 0.25 + lean, lz + math.sin(lang) * 0.45),
                 (0.9, 0.05, 0.12), mat, rot=(lean, lang, math.radians(28 + li * 10)), bevel=0.01)
        # 顶部稻穗（小椭圆球簇 + 细穗轴）。
        gx, gz = rx + lean, rz
        cube(f"PanicleStem_{t}", (gx, height + 0.25, gz), (0.02, 0.5, 0.02), STALK, rot=(lean, 0, 0), bevel=0.002)
        for gi in range(6):
            ga = rng.uniform(0, math.pi * 2)
            gr = rng.uniform(0.04, 0.12)
            gy = height + 0.35 + rng.uniform(-0.05, 0.18)
            cube(f"Grain_{t}_{gi}", (gx + math.cos(ga) * gr, gy, gz + math.sin(ga) * gr), (0.03, 0.12, 0.03), GRAIN, rot=(rng.uniform(-0.3, 0.3), rng.uniform(0, 3.14), 0), bevel=0.004)
    apply_and_export(OUT / "fieldvision-rice-cluster.glb")


build_canal_inlet()
build_culvert()
build_rice_cluster()
