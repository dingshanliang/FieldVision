"""FieldVision 3.0 hero 设施资产生成（fv-o6c.9，方向：Blender 自制 GLB）。

复用 create_drone.py 的范式（bpy 原语 + 倒角 + Principled BSDF + GLB 导出），
生成 A02 灌溉章节最显眼的 hero 设施——泵站。模型原点在底座中心、+Y 向上，
导出 Yup，便于在场景中按设施点位缩放放置。

运行（需要桌面版 Blender）：
  /Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup \\
    --python scripts/blender/create_hero_facilities.py
输出：public/assets/models/fieldvision-pump-station.glb
"""
from pathlib import Path
import bpy
import math

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "public" / "assets" / "models" / "fieldvision-pump-station.glb"


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


CONCRETE = material("Pump concrete", (0.62, 0.60, 0.55), 0.0, 0.92)
STEEL = material("Pump steel", (0.50, 0.54, 0.55), 0.55, 0.42)
PAINT = material("Pump paint", (0.74, 0.46, 0.20), 0.35, 0.5)  # 暖橘漆面
MACHINED = material("Pump machined", (0.30, 0.32, 0.33), 0.85, 0.22)
RUST = material("Pump rust", (0.34, 0.18, 0.10), 0.2, 0.8)
WARN = material("Pump warning", (0.92, 0.74, 0.10), 0.25, 0.55)
LIGHT = material("Pump status", (0.10, 0.78, 0.55), 0.1, 0.3, (0.2, 0.95, 0.6))
DARK = material("Pump dark", (0.08, 0.09, 0.09), 0.4, 0.4)


def finish(obj, mat, bevel=0.06, segments=3):
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


def cube(name, loc, scale, mat, rot=(0, 0, 0), bevel=0.06):
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


bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)

# 1. 混凝土基础（底盘 + 矮台），带轻微磨损色差。
cube("Foundation", (0, 0, 0.12), (1.5, 1.9, 0.24), CONCRETE, bevel=0.05)
cube("Plinth", (0, 0.05, 0.42), (1.15, 1.45, 0.30), CONCRETE, bevel=0.04)

# 2. 泵房箱体（橘漆钢板），顶略收。
cube("HouseBody", (0, 0.05, 1.20), (1.0, 1.30, 1.05), PAINT, bevel=0.06)
cube("HouseRoof", (0, 0.05, 1.78), (1.06, 1.36, 0.10), STEEL, bevel=0.03)
# 顶面单坡（一侧略低，做排水感）——用斜置薄板近似。
cube("RoofSlope", (-0.18, 0.05, 1.84), (0.7, 1.30, 0.04), STEEL, rot=(0, math.radians(4), 0), bevel=0.01)

# 3. 百叶通风口 + 控制箱。
cube("Louver", (0, 0.72, 1.30), (0.62, 0.04, 0.42), DARK, bevel=0.02)
for i in range(4):
    cube(f"LouverSlats_{i}", (0, 0.745, 1.12 + i * 0.12), (0.58, 0.015, 0.05), STEEL, bevel=0.005)
cube("ControlBox", (0.52, 0.30, 1.30), (0.18, 0.42, 0.55), MACHINED, bevel=0.03)
cube("ControlPanel", (0.615, 0.30, 1.32), (0.02, 0.30, 0.34), DARK, bevel=0.01)

# 4. 状态指示灯（运行绿，运行时由场景点亮）。
cylinder("StatusLight", (0.615, 0.30, 1.72), 0.06, 0.06, LIGHT, vertices=18, bevel=0.01)

# 5. 泵机组：电机筒 + 散热翅片 + 联轴器 + 泵蜗壳（外露在侧面）。
cylinder("Motor", (-0.30, -0.55, 0.92), 0.26, 0.78, MACHINED, rot=(0, math.pi / 2, 0), bevel=0.03)
for i in range(8):
    a = i / 8 * math.pi * 2
    cube(f"Fin_{i}", (-0.30 + math.cos(a) * 0.27, -0.55 + math.sin(a) * 0.27, 0.92), (0.02, 0.02, 0.7), MACHINED, rot=(0, 0, a), bevel=0.004)
cylinder("Coupling", (0.06, -0.55, 0.92), 0.12, 0.18, STEEL, rot=(0, math.pi / 2, 0), bevel=0.02)
cylinder("Volute", (0.26, -0.55, 0.92), 0.30, 0.34, PAINT, rot=(0, math.pi / 2, 0), bevel=0.03)
cylinder("SuctionPort", (0.50, -0.55, 0.92), 0.14, 0.22, STEEL, rot=(0, math.pi / 2, 0), bevel=0.02)

# 6. 进/出水管（沿基础走向），带锈渍段。
cylinder("PipeIn", (-0.70, -0.55, 0.55), 0.10, 0.9, STEEL, rot=(0, math.pi / 2, 0), bevel=0.015)
cube("RustBloom", (-0.55, -0.50, 0.50), (0.16, 0.10, 0.18), RUST, bevel=0.01)
cylinder("PipeOut", (0.55, 0.55, 1.05), 0.11, 1.0, STEEL, rot=(math.pi / 2, 0, 0), bevel=0.015)

# 7. 黄黑警示带（基座边缘）+ 接地检修痕迹。
cube("WarnStripeA", (0, 0.94, 0.30), (1.02, 0.02, 0.10), WARN, bevel=0.005)
cube("WarnStripeB", (0, -0.94, 0.30), (1.02, 0.02, 0.10), WARN, bevel=0.005)

# 应用 modifier 并导出。
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
print(f"FIELDVISION_PUMP_EXPORTED {OUTPUT}")
