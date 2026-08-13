import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Matrix4, Mesh, type Material, type Object3D } from "three";

function visibleInHierarchy(object: Object3D, root: Object3D) {
  let current: Object3D | null = object;
  while (current) {
    if (!current.visible) return false;
    if (current === root) return true;
    current = current.parent;
  }
  return false;
}

function insidePreservedNode(object: Object3D, root: Object3D, preservedNames: ReadonlySet<string>) {
  let current: Object3D | null = object;
  while (current && current !== root) {
    if (preservedNames.has(current.name)) return true;
    current = current.parent;
  }
  return false;
}

/**
 * Builds a real-model LOD by baking static GLB meshes into one grouped
 * geometry. Materials and silhouette stay authored; selected moving rigs stay
 * separate so low-tier hero animation remains readable.
 */
export function bakeMachineLod(root: Object3D, preservedNodeNames: readonly string[] = []) {
  root.updateMatrixWorld(true);
  const preservedNames = new Set(preservedNodeNames);
  const rootInverse = new Matrix4().copy(root.matrixWorld).invert();
  const geometries: import("three").BufferGeometry[] = [];
  const materials: Material[] = [];
  const mergedSources: Mesh[] = [];

  root.traverse((object) => {
    if (!(object instanceof Mesh)
      || !visibleInHierarchy(object, root)
      || insidePreservedNode(object, root, preservedNames)) return;
    if (Array.isArray(object.material)) return;
    const geometry = object.geometry.clone();
    geometry.applyMatrix4(new Matrix4().multiplyMatrices(rootInverse, object.matrixWorld));
    geometries.push(geometry);
    materials.push(object.material);
    mergedSources.push(object);
  });

  if (geometries.length < 2) {
    geometries.forEach((geometry) => geometry.dispose());
    return root;
  }
  const mergedGeometry = mergeGeometries(geometries, true);
  geometries.forEach((geometry) => geometry.dispose());
  if (!mergedGeometry) return root;
  mergedGeometry.computeBoundingBox();
  mergedGeometry.computeBoundingSphere();
  mergedSources.forEach((mesh) => { mesh.visible = false; });
  const baked = new Mesh(mergedGeometry, materials);
  baked.name = "RuntimeAuthoredLod";
  baked.receiveShadow = true;
  root.add(baked);
  return root;
}
