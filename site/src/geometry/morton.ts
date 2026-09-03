export function sortByMorton(input: Float32Array): Float32Array {
  if (input.length % 3 !== 0) {
    throw new Error("Position buffers must contain complete XYZ triplets.");
  }

  const count = input.length / 3;
  if (count < 2) {
    return input.slice();
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;

  for (let offset = 0; offset < input.length; offset += 3) {
    const x = input[offset];
    const y = input[offset + 1];
    const z = input[offset + 2];
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    minZ = Math.min(minZ, z);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    maxZ = Math.max(maxZ, z);
  }

  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const rangeZ = maxZ - minZ || 1;
  const keys = new Uint32Array(count);
  const order = new Array<number>(count);

  for (let index = 0; index < count; index += 1) {
    const offset = index * 3;
    const x = Math.min(1023, Math.floor((input[offset] - minX) / rangeX * 1023));
    const y = Math.min(1023, Math.floor((input[offset + 1] - minY) / rangeY * 1023));
    const z = Math.min(1023, Math.floor((input[offset + 2] - minZ) / rangeZ * 1023));
    keys[index] = morton3d(x, y, z);
    order[index] = index;
  }

  order.sort((left, right) => keys[left] - keys[right] || left - right);

  const output = new Float32Array(input.length);
  for (let index = 0; index < count; index += 1) {
    const sourceOffset = order[index] * 3;
    const targetOffset = index * 3;
    output[targetOffset] = input[sourceOffset];
    output[targetOffset + 1] = input[sourceOffset + 1];
    output[targetOffset + 2] = input[sourceOffset + 2];
  }

  return output;
}

function morton3d(x: number, y: number, z: number): number {
  return (
    splitBy3(x) |
    splitBy3(y) << 1 |
    splitBy3(z) << 2
  ) >>> 0;
}

function splitBy3(value: number): number {
  let result = value & 0x3ff;
  result = (result | result << 16) & 0x030000ff;
  result = (result | result << 8) & 0x0300f00f;
  result = (result | result << 4) & 0x030c30c3;
  result = (result | result << 2) & 0x09249249;
  return result;
}

