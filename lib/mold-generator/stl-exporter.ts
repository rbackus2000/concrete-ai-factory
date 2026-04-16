"use client";

import * as THREE from "three";

/**
 * Exports a THREE.js Group to binary STL format.
 * Collects all mesh geometries from the group hierarchy
 * and writes them as a single binary STL file.
 */
export function exportGroupToSTL(group: THREE.Group): ArrayBuffer {
  const triangles: { normal: THREE.Vector3; vertices: THREE.Vector3[] }[] = [];

  group.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      collectTrianglesFromMesh(child, triangles);
    }
  });

  return writeBinarySTL(triangles);
}

/**
 * Exports geometry as a downloadable .stl file.
 */
export function downloadSTL(group: THREE.Group, filename: string) {
  const buffer = exportGroupToSTL(group);
  const blob = new Blob([buffer], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function collectTrianglesFromMesh(
  mesh: THREE.Mesh,
  triangles: { normal: THREE.Vector3; vertices: THREE.Vector3[] }[],
) {
  const geometry = mesh.geometry;
  const posAttr = geometry.getAttribute("position");
  const normalAttr = geometry.getAttribute("normal");
  const indexAttr = geometry.getIndex();

  if (!posAttr) return;

  // Apply world transform
  mesh.updateMatrixWorld(true);
  const matrix = mesh.matrixWorld;
  const normalMatrix = new THREE.Matrix3().getNormalMatrix(matrix);

  if (indexAttr) {
    for (let i = 0; i < indexAttr.count; i += 3) {
      const a = indexAttr.getX(i);
      const b = indexAttr.getX(i + 1);
      const c = indexAttr.getX(i + 2);

      const vA = new THREE.Vector3().fromBufferAttribute(posAttr, a).applyMatrix4(matrix);
      const vB = new THREE.Vector3().fromBufferAttribute(posAttr, b).applyMatrix4(matrix);
      const vC = new THREE.Vector3().fromBufferAttribute(posAttr, c).applyMatrix4(matrix);

      let normal: THREE.Vector3;
      if (normalAttr) {
        normal = new THREE.Vector3().fromBufferAttribute(normalAttr, a).applyMatrix3(normalMatrix).normalize();
      } else {
        const edge1 = new THREE.Vector3().subVectors(vB, vA);
        const edge2 = new THREE.Vector3().subVectors(vC, vA);
        normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();
      }

      triangles.push({ normal, vertices: [vA, vB, vC] });
    }
  } else {
    for (let i = 0; i < posAttr.count; i += 3) {
      const vA = new THREE.Vector3().fromBufferAttribute(posAttr, i).applyMatrix4(matrix);
      const vB = new THREE.Vector3().fromBufferAttribute(posAttr, i + 1).applyMatrix4(matrix);
      const vC = new THREE.Vector3().fromBufferAttribute(posAttr, i + 2).applyMatrix4(matrix);

      let normal: THREE.Vector3;
      if (normalAttr) {
        normal = new THREE.Vector3().fromBufferAttribute(normalAttr, i).applyMatrix3(normalMatrix).normalize();
      } else {
        const edge1 = new THREE.Vector3().subVectors(vB, vA);
        const edge2 = new THREE.Vector3().subVectors(vC, vA);
        normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();
      }

      triangles.push({ normal, vertices: [vA, vB, vC] });
    }
  }
}

function writeBinarySTL(triangles: { normal: THREE.Vector3; vertices: THREE.Vector3[] }[]): ArrayBuffer {
  const HEADER_SIZE = 80;
  const TRIANGLE_SIZE = 50; // 12 normal + 36 vertices + 2 attribute
  const bufferSize = HEADER_SIZE + 4 + triangles.length * TRIANGLE_SIZE;
  const buffer = new ArrayBuffer(bufferSize);
  const view = new DataView(buffer);

  // Header (80 bytes) — "RB Studio Mold Generator"
  const header = "RB Studio Mold Generator - Binary STL";
  for (let i = 0; i < Math.min(header.length, 80); i++) {
    view.setUint8(i, header.charCodeAt(i));
  }

  // Triangle count
  view.setUint32(HEADER_SIZE, triangles.length, true);

  let offset = HEADER_SIZE + 4;
  for (const tri of triangles) {
    // Normal
    view.setFloat32(offset, tri.normal.x, true); offset += 4;
    view.setFloat32(offset, tri.normal.y, true); offset += 4;
    view.setFloat32(offset, tri.normal.z, true); offset += 4;

    // Vertices
    for (const v of tri.vertices) {
      view.setFloat32(offset, v.x, true); offset += 4;
      view.setFloat32(offset, v.y, true); offset += 4;
      view.setFloat32(offset, v.z, true); offset += 4;
    }

    // Attribute byte count
    view.setUint16(offset, 0, true); offset += 2;
  }

  return buffer;
}
