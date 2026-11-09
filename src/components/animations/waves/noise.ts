/**
 * @file Perlin noise implementation used by the waves animation — a 2D
 * gradient noise generator with a seeded permutation table. Composition of
 * the small `Grad` value object with the `Noise` generator replaces any
 * need for inheritance.
 */

/** Element count of the seeded permutation table lookup. */
const PERMUTATION_SIZE = 256;

/** Lookup size of the doubled permutation/gradient tables. */
const DOUBLED_TABLE_SIZE = 512;

/** Number of base gradient vectors. */
const GRADIENT_COUNT = 12;

/** Seed scaling factor for fractional seeds. */
const SEED_SCALE = 65536;

/**
 * Gradient vectors used to compute Perlin noise at a grid point.
 * Kept as a small compositional value object rather than shared state.
 */
export class Grad {
  /**
   * Create a gradient vector.
   * @param x - X component of the gradient.
   * @param y - Y component of the gradient.
   * @param z - Z component of the gradient (unused in 2D mode).
   */
  public constructor(
    public readonly x: number,
    public readonly y: number,
    public readonly z: number
  ) {}

  /**
   * Dot the gradient with the given 2D displacement vector.
   * @param x - Displacement X.
   * @param y - Displacement Y.
   * @returns The dot product in 2D.
   */
  public dot2(x: number, y: number): number {
    return this.x * x + this.y * y;
  }
}

/**
 * Seeded 2D Perlin noise generator. All lookup state is private; callers
 * construct with a seed and sample via {@link perlin2}.
 */
export class Noise {
  private static readonly GRADIENTS: readonly Grad[] = [
    new Grad(1, 1, 0),
    new Grad(-1, 1, 0),
    new Grad(1, -1, 0),
    new Grad(-1, -1, 0),
    new Grad(1, 0, 1),
    new Grad(-1, 0, 1),
    new Grad(1, 0, -1),
    new Grad(-1, 0, -1),
    new Grad(0, 1, 1),
    new Grad(0, -1, 1),
    new Grad(0, 1, -1),
    new Grad(0, -1, -1),
  ];

  private static readonly BASE_PERMUTATION: readonly number[] = [
    151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140,
    36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148, 247, 120,
    234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32, 57, 177, 33,
    88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175, 74, 165, 71,
    134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122, 60, 211, 133,
    230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54, 65, 25, 63, 161,
    1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169, 200, 196, 135, 130,
    116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64, 52, 217, 226, 250,
    124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85, 212, 207, 206, 59, 227,
    47, 16, 58, 17, 182, 189, 28, 42, 223, 183, 170, 213, 119, 248, 152, 2, 44,
    154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9, 129, 22, 39, 253, 19, 98,
    108, 110, 79, 113, 224, 232, 178, 185, 112, 104, 218, 246, 97, 228, 251, 34,
    242, 193, 238, 210, 144, 12, 191, 179, 162, 241, 81, 51, 145, 235, 249, 14,
    239, 107, 49, 192, 214, 31, 181, 199, 106, 157, 184, 84, 204, 176, 115, 121,
    50, 45, 127, 4, 150, 254, 138, 236, 205, 93, 222, 114, 67, 29, 24, 72, 243,
    141, 128, 195, 78, 66, 215, 61, 156, 180,
  ];

  private readonly permutation: number[] = new Array(DOUBLED_TABLE_SIZE).fill(
    0
  );

  private readonly gradients: Grad[] = new Array<Grad>(DOUBLED_TABLE_SIZE).fill(
    Noise.GRADIENTS[0]
  );

  /**
   * Create a noise generator and seed its permutation table.
   * @param seed - Seed for the permutation table (default 0).
   */
  public constructor(seed = 0) {
    this.seed(seed);
  }

  /**
   * Reseed the permutation table.
   * @param seedValue - The seed to reseed with.
   */
  public seed(seedValue: number): void {
    let seed = seedValue;
    if (seed > 0 && seed < 1) {
      seed *= SEED_SCALE;
    }
    seed = Math.floor(seed);
    if (seed < PERMUTATION_SIZE) {
      seed |= seed << 8;
    }
    for (let i = 0; i < PERMUTATION_SIZE; i++) {
      const value =
        i & 1
          ? Noise.BASE_PERMUTATION[i] ^ (seed & 255)
          : Noise.BASE_PERMUTATION[i] ^ ((seed >> 8) & 255);
      this.permutation[i] = this.permutation[i + PERMUTATION_SIZE] = value;
      this.gradients[i] = this.gradients[i + PERMUTATION_SIZE] =
        Noise.GRADIENTS[value % GRADIENT_COUNT];
    }
  }

  /**
   * Sample 2D Perlin noise.
   * @param x - Input X coordinate.
   * @param y - Input Y coordinate.
   * @returns The noise value at the given point.
   */
  public perlin2(x: number, y: number): number {
    let xi = Math.floor(x);
    let yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    xi &= 255;
    yi &= 255;
    const n00 = this.gradients[xi + this.permutation[yi]].dot2(xf, yf);
    const n01 = this.gradients[xi + this.permutation[yi + 1]].dot2(xf, yf - 1);
    const n10 = this.gradients[xi + 1 + this.permutation[yi]].dot2(xf - 1, yf);
    const n11 = this.gradients[xi + 1 + this.permutation[yi + 1]].dot2(
      xf - 1,
      yf - 1
    );
    const u = this.fade(xf);
    return this.lerp(
      this.lerp(n00, n10, u),
      this.lerp(n01, n11, u),
      this.fade(yf)
    );
  }

  /**
   * Quintic fade curve for Perlin interpolation.
   * @param t - Input in [0, 1].
   * @returns The faded value.
   */
  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  /**
   * Linear interpolation.
   * @param a - Start value.
   * @param b - End value.
   * @param t - Interpolation factor.
   * @returns The interpolated value.
   */
  private lerp(a: number, b: number, t: number): number {
    return (1 - t) * a + t * b;
  }
}
