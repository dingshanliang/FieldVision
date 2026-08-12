"""FieldVision hero asset: field worker inspecting the A02 root zone.

The worker is authored at real-world scale, with feet on Z=0 and a forward
inspection stoop along +Y.  The silhouette combines bent limbs, a field tablet,
and a soil probe so the character reads as agronomic inspection rather than a
generic standing mannequin.

Run:
  /Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup \
    --python scripts/blender/create_field_worker.py

Output:
  public/assets/models/fieldvision-field-worker.glb
"""
from pathlib import Path
import math

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "public" / "assets" / "models" / "fieldvision-field-worker.glb"


def material(name, color, metallic=0.0, roughness=0.7, emission=None, emission_strength=1.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1.0)
    shader.inputs["Metallic"].default_value = metallic
    shader.inputs["Roughness"].default_value = roughness
    if emission:
        shader.inputs["Emission Color"].default_value = (*emission, 1.0)
        shader.inputs["Emission Strength"].default_value = emission_strength
    return mat


SHIRT = material("Worker overshirt", (0.18, 0.27, 0.22), roughness=0.88)
SHIRT_LIGHT = material("Worker rolled sleeves", (0.28, 0.38, 0.29), roughness=0.86)
TROUSERS = material("Worker field trousers", (0.12, 0.15, 0.13), roughness=0.94)
BOOTS = material("Worker rubber boots", (0.055, 0.065, 0.055), roughness=0.96)
SKIN = material("Worker skin", (0.46, 0.27, 0.17), roughness=0.82)
HAT = material("Worker straw hat", (0.48, 0.39, 0.19), roughness=0.96)
HAT_BAND = material("Worker hat band", (0.16, 0.20, 0.15), roughness=0.9)
TABLET = material("Rugged field tablet", (0.055, 0.075, 0.068), metallic=0.18, roughness=0.54)
SCREEN = material("Tablet screen", (0.08, 0.22, 0.19), metallic=0.05, roughness=0.28, emission=(0.06, 0.22, 0.17), emission_strength=0.32)
STEEL = material("Soil probe steel", (0.38, 0.40, 0.38), metallic=0.76, roughness=0.36)
PROBE_GRIP = material("Soil probe grip", (0.30, 0.33, 0.16), roughness=0.76)


def finish(obj, mat, bevel=0.0, segments=2):
    obj.data.materials.append(mat)
    if bevel > 0:
        mod = obj.modifiers.new("Soft edge", "BEVEL")
        mod.width = bevel
        mod.segments = segments
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.shade_smooth_by_angle()
    obj.select_set(False)
    return obj


def cube(name, loc, scale, mat, rot=(0.0, 0.0, 0.0), bevel=0.025):
    bpy.ops.mesh.primitive_cube_add(location=loc, rotation=rot)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(obj, mat, bevel)


def sphere(name, loc, scale, mat, segments=24, rings=16):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(obj, mat)


def cylinder(name, loc, radius, depth, mat, rot=(0.0, 0.0, 0.0), vertices=24, bevel=0.01):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc, rotation=rot)
    obj = bpy.context.object
    obj.name = name
    return finish(obj, mat, bevel)


def limb(name, start, end, radius, mat):
    """Create a rounded cylinder between two anatomical joint positions."""
    start_v = Vector(start)
    end_v = Vector(end)
    direction = end_v - start_v
    midpoint = (start_v + end_v) * 0.5
    bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=radius, depth=direction.length, location=midpoint)
    obj = bpy.context.object
    obj.name = name
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = Vector((0.0, 0.0, 1.0)).rotation_difference(direction.normalized())
    obj.rotation_mode = "XYZ"
    return finish(obj, mat, bevel=radius * 0.34, segments=3)


bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)

# Bent lower body. The asymmetry keeps the silhouette natural from the inlet camera.
for side, x in (("L", -0.17), ("R", 0.17)):
    hip = (x, 0.00, 0.91)
    knee = (x * 1.12, 0.17 if side == "L" else 0.11, 0.53)
    ankle = (x * 1.08, -0.01 if side == "L" else -0.06, 0.18)
    limb(f"Thigh_{side}", hip, knee, 0.115, TROUSERS)
    limb(f"Shin_{side}", knee, ankle, 0.095, TROUSERS)
    sphere(f"Knee_{side}", knee, (0.12, 0.12, 0.12), TROUSERS, 18, 12)
    cube(f"Boot_{side}", (ankle[0], ankle[1] + 0.065, 0.105), (0.13, 0.22, 0.105), BOOTS, bevel=0.035)

# Pelvis, forward-leaning torso, collar, and back yoke create a clothed rather than capsule form.
cube("Pelvis", (0.0, 0.015, 0.91), (0.25, 0.16, 0.16), TROUSERS, rot=(-0.08, 0, 0), bevel=0.065)
cube("Torso", (0.0, 0.17, 1.24), (0.31, 0.18, 0.38), SHIRT, rot=(-0.32, 0, 0), bevel=0.095)
cube("BackYoke", (0.0, 0.025, 1.36), (0.265, 0.035, 0.12), SHIRT_LIGHT, rot=(-0.32, 0, 0), bevel=0.025)
cylinder("Collar", (0.0, 0.315, 1.56), 0.13, 0.10, SHIRT_LIGHT, rot=(-0.32, 0, 0), vertices=24, bevel=0.018)

# Head follows the stoop; ears/nose avoid the featureless sphere read at hero distance.
sphere("Head", (0.0, 0.405, 1.69), (0.145, 0.135, 0.18), SKIN)
sphere("Nose", (0.0, 0.535, 1.68), (0.035, 0.052, 0.040), SKIN, 16, 10)
for side, x in (("L", -0.145), ("R", 0.145)):
    sphere(f"Ear_{side}", (x, 0.405, 1.69), (0.025, 0.018, 0.040), SKIN, 14, 8)

# Broad woven field hat with a pinched crown and contrasting band.
cylinder("HatBrim", (0.0, 0.39, 1.865), 0.285, 0.028, HAT, rot=(-0.10, 0, 0), vertices=40, bevel=0.012)
cylinder("HatCrown", (0.0, 0.375, 1.925), 0.145, 0.125, HAT, rot=(-0.10, 0, 0), vertices=28, bevel=0.025)
cylinder("HatBand", (0.0, 0.382, 1.885), 0.151, 0.035, HAT_BAND, rot=(-0.10, 0, 0), vertices=28, bevel=0.006)

# Arms reach into the inspection task. Sleeves stop above exposed hands.
shoulders = {"L": (-0.29, 0.22, 1.46), "R": (0.29, 0.22, 1.46)}
elbows = {"L": (-0.34, 0.50, 1.22), "R": (0.36, 0.48, 1.20)}
wrists = {"L": (-0.19, 0.67, 1.04), "R": (0.27, 0.66, 0.98)}
for side in ("L", "R"):
    limb(f"UpperArm_{side}", shoulders[side], elbows[side], 0.082, SHIRT)
    sphere(f"Elbow_{side}", elbows[side], (0.085, 0.085, 0.085), SHIRT_LIGHT, 18, 12)
    limb(f"Forearm_{side}", elbows[side], wrists[side], 0.065, SKIN)
    sphere(f"Hand_{side}", wrists[side], (0.074, 0.060, 0.078), SKIN, 18, 12)

# Rugged tablet tilted toward the worker; screen catches a restrained teal glow.
cube("FieldTablet", (-0.06, 0.705, 1.02), (0.205, 0.035, 0.145), TABLET, rot=(0.12, 0.0, -0.08), bevel=0.026)
cube("FieldTabletScreen", (-0.06, 0.742, 1.02), (0.166, 0.007, 0.105), SCREEN, rot=(0.12, 0.0, -0.08), bevel=0.012)

# Soil probe runs from the right hand into the root zone, tying the prop to evidence semantics.
probe_top = (0.31, 0.66, 1.01)
probe_tip = (0.47, 0.73, 0.035)
limb("RootZoneProbe", probe_top, probe_tip, 0.018, STEEL)
limb("ProbeGrip", (0.29, 0.65, 1.08), (0.34, 0.67, 0.84), 0.038, PROBE_GRIP)
cylinder("ProbeTHandle", (0.31, 0.66, 1.08), 0.035, 0.26, PROBE_GRIP, rot=(0.0, math.pi / 2, 0.0), vertices=20, bevel=0.012)
cylinder("ProbeFootCollar", (0.46, 0.725, 0.12), 0.040, 0.055, STEEL, rot=(-0.16, 0.0, 0.0), vertices=18, bevel=0.006)

# Apply authoring modifiers so the browser receives stable geometry only.
bpy.ops.object.select_all(action="SELECT")
for obj in list(bpy.context.selected_objects):
    if obj.type == "MESH":
        bpy.context.view_layer.objects.active = obj
        for modifier in list(obj.modifiers):
            bpy.ops.object.modifier_apply(modifier=modifier.name)

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
print(f"FIELDVISION_FIELD_WORKER_EXPORTED {OUTPUT}")
