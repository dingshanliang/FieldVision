from pathlib import Path
import bpy
import math


ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "public" / "assets" / "models" / "fieldvision-drone.glb"


def material(name, color, metallic=0.0, roughness=0.5, emission=None):
    value = bpy.data.materials.new(name)
    value.diffuse_color = (*color, 1.0)
    value.use_nodes = True
    shader = value.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1.0)
    shader.inputs["Metallic"].default_value = metallic
    shader.inputs["Roughness"].default_value = roughness
    if emission:
        shader.inputs["Emission Color"].default_value = (*emission, 1.0)
        shader.inputs["Emission Strength"].default_value = 3.0
    return value


BODY = material("Body graphite", (0.055, 0.075, 0.068), 0.42, 0.26)
CARBON = material("Carbon arms", (0.018, 0.026, 0.024), 0.58, 0.24)
METAL = material("Machined metal", (0.24, 0.29, 0.27), 0.76, 0.2)
LENS = material("Camera lens", (0.008, 0.022, 0.026), 0.15, 0.08)
ACCENT = material("FieldVision signal", (0.05, 0.42, 0.29), 0.18, 0.22, (0.08, 0.85, 0.48))
PROPELLER = material("Propeller", (0.032, 0.04, 0.038), 0.12, 0.42)


def finish(obj, mat, bevel=0.08, bevel_segments=3):
    obj.data.materials.append(mat)
    if bevel > 0:
        modifier = obj.modifiers.new("Manufactured edge", "BEVEL")
        modifier.width = bevel
        modifier.segments = bevel_segments
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.shade_smooth_by_angle()
    obj.select_set(False)
    return obj


def cube(name, location, scale, mat, rotation=(0, 0, 0), bevel=0.08):
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(obj, mat, bevel)


def cylinder(name, location, radius, depth, mat, rotation=(0, 0, 0), vertices=32, bevel=0.04):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    return finish(obj, mat, bevel)


def sphere(name, location, scale, mat, segments=32, rings=16):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=location, scale=scale)
    obj = bpy.context.object
    obj.name = name
    return finish(obj, mat, 0)


def build_propeller(name, radius=1.74):
    """Two-blade prop as ONE mesh centred on the spin axis (Blender Z).

    Blades taper (wide root -> narrow tip), twist (high pitch at root -> low at
    tip) and sweep backwards slightly, like a real carbon prop. A spinner dome
    is fused into the same mesh, so the runtime can spin the whole object
    around its local vertical axis with no parenting tricks.
    """
    verts = []
    faces = []
    stations = 10
    root = 0.17
    for i in range(stations):
        t = i / (stations - 1)
        r = root + (radius - root) * t
        chord = 0.30 * (1 - t) ** 0.65 + 0.075
        thick = 0.028 * (1 - t) + 0.009
        pitch = math.radians(17.0 * (1 - t) + 4.5)
        sweep = 0.13 * t * t
        cp, sp = math.cos(pitch), math.sin(pitch)
        for u, v in ((-chord / 2, -thick / 2), (chord / 2, -thick / 2), (chord / 2, thick / 2), (-chord / 2, thick / 2)):
            y = u * cp - v * sp + sweep
            z = u * sp + v * cp
            verts.append((r, y, z))
    for i in range(stations - 1):
        a, b = i * 4, i * 4 + 4
        for j in range(4):
            j2 = (j + 1) % 4
            faces.append((a + j, b + j, b + j2, a + j2))
    tip = (stations - 1) * 4
    faces.append((tip, tip + 1, tip + 2, tip + 3))
    # Second blade: rotate the first 180 degrees around the spin axis.
    n = len(verts)
    verts.extend((-x, -y, z) for x, y, z in verts[:n])
    faces.extend(tuple(n + idx for idx in reversed(face)) for face in faces[: len(faces)])
    # Spinner dome.
    seg = 18
    base = len(verts)
    for i in range(seg):
        a = i / seg * math.pi * 2
        verts.append((0.19 * math.cos(a), 0.19 * math.sin(a), -0.02))
    mid = len(verts)
    for i in range(seg):
        a = i / seg * math.pi * 2
        verts.append((0.13 * math.cos(a), 0.13 * math.sin(a), 0.09))
    apex = len(verts)
    verts.append((0.0, 0.0, 0.17))
    for i in range(seg):
        i2 = (i + 1) % seg
        faces.append((base + i, base + i2, mid + i2, mid + i))
        faces.append((mid + i, mid + i2, apex))
    faces.append(tuple(base + i for i in reversed(range(seg))))

    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    finish(obj, PROPELLER, 0.012, bevel_segments=2)
    return obj


bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)

# Layered aerodynamic body, avionics hump and spray tank.
sphere("Fuselage", (0, 0, 0.12), (1.62, 1.06, 0.44), BODY, segments=48, rings=24)
cube("Battery", (0, -0.12, 0.56), (0.86, 0.62, 0.22), BODY, bevel=0.14)
cube("AvionicsHump", (0, 0.42, 0.46), (0.6, 0.5, 0.16), BODY, bevel=0.12)
cube("SprayTank", (0, 0.05, -0.5), (0.78, 0.66, 0.3), BODY, bevel=0.16)
cube("SignalBar", (0, -1.02, 0.12), (0.72, 0.06, 0.07), ACCENT, bevel=0.05)
# RTK antenna pair.
for x in (-0.52, 0.52):
    cylinder(f"AntennaMast_{x}", (x, -0.55, 0.78), 0.035, 0.3, CARBON, vertices=12, bevel=0.01)
    sphere(f"AntennaDome_{x}", (x, -0.55, 0.95), (0.11, 0.11, 0.08), METAL, segments=20, rings=10)

# Four carbon tube arms, brushless motor bells and twisted propellers.
arm_specs = [
    ("FL", -1, 1),
    ("FR", 1, 1),
    ("RL", -1, -1),
    ("RR", 1, -1),
]
PROP_Z = 0.86
for suffix, sx, sy in arm_specs:
    x0, y0 = sx * 0.95, sy * 0.95
    x1, y1 = sx * 2.85, sy * 2.85
    mx, my = (x0 + x1) / 2, (y0 + y1) / 2
    length = math.hypot(x1 - x0, y1 - y0) + 0.3
    angle = math.atan2(y1 - y0, x1 - x0)
    cylinder(f"Arm_{suffix}", (mx, my, 0.22), 0.13, length, CARBON, rotation=(0, math.pi / 2, angle), vertices=20, bevel=0.02)
    # Brushless motor: base, bell and shaft.
    cylinder(f"MotorBase_{suffix}", (x1, y1, 0.3), 0.34, 0.18, CARBON, bevel=0.03)
    sphere(f"Motor_{suffix}", (x1, y1, 0.5), (0.3, 0.3, 0.24), METAL, segments=24, rings=12)
    cylinder(f"MotorShaft_{suffix}", (x1, y1, 0.72), 0.06, 0.28, METAL, vertices=16, bevel=0.01)
    prop = build_propeller(f"Rotor_{suffix}")
    prop.location = (x1, y1, PROP_Z)
    cylinder(f"Foot_{suffix}", (sx * 1.7, sy * 1.7, -0.85), 0.09, 1.3, CARBON, rotation=(math.radians(12) * sy, math.radians(12) * sx, 0), bevel=0.02)

# Three-axis gimbal and multi-spectral sensor stack.
cylinder("GimbalYaw", (0, 0.42, -0.62), 0.4, 0.22, METAL, bevel=0.04)
cylinder("GimbalPitch", (0, 0.52, -0.94), 0.3, 0.8, BODY, rotation=(math.pi / 2, 0, 0), bevel=0.06)
sphere("SensorGimbal", (0, 0.8, -0.96), (0.5, 0.4, 0.42), BODY)
cylinder("OpticalLens", (0, 1.13, -0.96), 0.2, 0.11, LENS, rotation=(math.pi / 2, 0, 0), bevel=0.02)
for x in (-0.31, 0.31):
    cylinder(f"Multispectral_{x}", (x, 1.06, -0.88), 0.09, 0.08, LENS, rotation=(math.pi / 2, 0, 0), vertices=20, bevel=0.01)

# Compact landing rails.
for x in (-0.92, 0.92):
    cube(f"LandingRail_{x}", (x, 0, -1.42), (0.12, 1.25, 0.1), CARBON, bevel=0.08)

# Apply modifiers and export with deterministic names.
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
print(f"FIELDVISION_DRONE_EXPORTED {OUTPUT}")
