import { Box } from '@chakra-ui/react';
import { Canvas, useThree } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import * as THREE from 'three';

/**
 * @file ImageDither.tsx — WebGL image dithering effect built on
 * react-three-fiber.
 * @module components/animations/ImageDither
 *
 * Renders a supplied image with ordered (Bayer 2x2/4x4/8x8) or random
 * dithering and optional color quantization against a foreground/background
 * palette. Consumed by `BackgroundSwitcher` for the `imagedither` background
 * type. The shader runs on a demand-mode canvas and only re-renders when
 * settings change.
 */

/** Settings describing how the dithered image should be rendered. */
export interface ImageDitherSettings {
  readonly image?: string | HTMLImageElement;
  readonly type?: 'random' | '2x2' | '4x4' | '8x8';
  readonly pxSize?: number;
  readonly colorSteps?: number;
  readonly originalColors?: boolean;
  readonly colorFront?: string;
  readonly colorBack?: string;
  readonly colorHighlight?: string;
  readonly scale?: number;
  readonly rotation?: number;
  readonly offsetX?: number;
  readonly offsetY?: number;
  readonly fit?: 'contain' | 'cover' | 'fill';
}

const VERTEX_SHADER = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAGMENT_SHADER = `
precision highp float;

uniform vec2 u_resolution;
uniform float u_pixelRatio;
uniform float u_originX;
uniform float u_originY;
uniform float u_worldWidth;
uniform float u_worldHeight;
uniform float u_fit;

uniform float u_scale;
uniform float u_rotation;
uniform float u_offsetX;
uniform float u_offsetY;

uniform vec4 u_colorFront;
uniform vec4 u_colorBack;
uniform vec4 u_colorHighlight;

uniform sampler2D u_image;
uniform float u_imageAspectRatio;

uniform float u_type;
uniform float u_pxSize;
uniform bool u_originalColors;
uniform float u_colorSteps;

varying vec2 vUv;

vec2 hash21_vec2(vec2 p) {
  p = fract(p * vec2(233.34, 851.73));
  p += dot(p, p + 23.45);
  return fract(p);
}

float hash21(vec2 p) {
  vec2 h = hash21_vec2(p);
  return h.x;
}

const int bayer2x2[4] = int[4](0, 2, 3, 1);
const int bayer4x4[16] = int[16](
  0,  8,  2, 10,
 12,  4, 14,  6,
  3, 11,  1,  9,
 15,  7, 13,  5
);

const int bayer8x8[64] = int[64](
   0, 32,  8, 40,  2, 34, 10, 42,
  48, 16, 56, 24, 50, 18, 58, 26,
  12, 44,  4, 36, 14, 46,  6, 38,
  60, 28, 52, 20, 62, 30, 54, 22,
   3, 35, 11, 43,  1, 33,  9, 41,
  51, 19, 59, 27, 49, 17, 57, 25,
  15, 47,  7, 39, 13, 45,  5, 37,
  63, 31, 55, 23, 61, 29, 53, 21
);

float getBayerValue(vec2 uv, int size) {
  ivec2 pos = ivec2(fract(uv / float(size)) * float(size));
  int index = pos.y * size + pos.x;

  if (size == 2) {
    return float(bayer2x2[index]) / 4.0;
  } else if (size == 4) {
    return float(bayer4x4[index]) / 16.0;
  } else if (size == 8) {
    return float(bayer8x8[index]) / 64.0;
  }
  return 0.0;
}

vec2 sizingUV(vec2 uv, vec2 resolution, float imageAspectRatio, float fit) {
  vec2 worldSize = vec2(u_worldWidth, u_worldHeight);
  vec2 worldAspect = worldSize / max(worldSize.x, worldSize.y);
  vec2 imageAspect = vec2(imageAspectRatio, 1.0);

  vec2 scale = vec2(1.0);
  if (fit < 0.5) {
    // contain
    scale = min(worldAspect / imageAspect, 1.0);
  } else if (fit < 1.5) {
    // cover
    scale = max(worldAspect / imageAspect, 1.0);
  } else {
    // fill
    scale = worldAspect / imageAspect;
  }

  vec2 scaledSize = imageAspect * scale;
  vec2 offset = (worldAspect - scaledSize) * 0.5;

  vec2 imageUV = (uv - offset) / scaledSize;
  return imageUV;
}

void main() {
  vec2 uv = vUv;

  // Calculate image UV with sizing
  float fitValue = u_fit < 0.5 ? 0.0 : (u_fit < 1.5 ? 1.0 : 2.0);
  vec2 imageUV = sizingUV(uv, u_resolution, u_imageAspectRatio, fitValue);

  // Apply transformations
  vec2 center = vec2(0.5, 0.5);
  imageUV -= center;
  imageUV *= u_scale;

  float angle = u_rotation;
  float c = cos(angle);
  float s = sin(angle);
  mat2 rot = mat2(c, -s, s, c);
  imageUV = rot * imageUV;

  imageUV += center;
  imageUV += vec2(u_offsetX, u_offsetY);

  // Pixelization
  vec2 pxSize = vec2(u_pxSize) / u_resolution;
  vec2 pxSizeUv = floor(imageUV / pxSize) * pxSize;

  // Sample image
  vec4 image = texture2D(u_image, imageUV);

  // Calculate luminance
  float lum = dot(vec3(0.2126, 0.7152, 0.0722), image.rgb);

  // Dithering
  int type = int(floor(u_type));
  float dithering = 0.0;
  vec2 dithering_uv = pxSizeUv;
  vec2 ditheringNoise_uv = u_resolution * uv;

  if (type == 1) {
    // random
    dithering = step(hash21(ditheringNoise_uv), lum);
  } else if (type == 2) {
    // 2x2 Bayer
    dithering = getBayerValue(dithering_uv, 2);
  } else if (type == 3) {
    // 4x4 Bayer
    dithering = getBayerValue(dithering_uv, 4);
  } else {
    // 8x8 Bayer
    dithering = getBayerValue(dithering_uv, 8);
  }

  // Color quantization
  float steps = max(floor(u_colorSteps), 1.0);
  float ditherAmount = 1.0 / steps;

  dithering -= 0.5;
  float brightness = clamp(lum + dithering * ditherAmount, 0.0, 1.0);
  float quantLum = floor(brightness * steps + 0.5) / steps;

  vec3 color = vec3(0.0);
  float opacity = 1.0;

  if (u_originalColors) {
    // Use original image colors
    vec3 normColor = image.rgb / max(lum, 0.001);
    color = normColor * quantLum;
    float quantAlpha = floor(image.a * steps + 0.5) / steps;
    opacity = mix(quantLum, 1.0, quantAlpha);
  } else {
    // Use color palette
    vec3 fgColor = u_colorFront.rgb * u_colorFront.a;
    float fgOpacity = u_colorFront.a;
    vec3 bgColor = u_colorBack.rgb * u_colorBack.a;
    float bgOpacity = u_colorBack.a;
    vec3 hlColor = u_colorHighlight.rgb * u_colorHighlight.a;
    float hlOpacity = u_colorHighlight.a;

    fgColor = mix(fgColor, hlColor, step(1.02 - 0.02 * u_colorSteps, brightness));
    fgOpacity = mix(fgOpacity, hlOpacity, step(1.02 - 0.02 * u_colorSteps, brightness));

    color = fgColor * quantLum;
    opacity = fgOpacity * quantLum;
    color += bgColor * (1.0 - opacity);
    opacity += bgOpacity * (1.0 - opacity);
  }

  gl_FragColor = vec4(color, opacity);
}
`;

interface ImageDitherSceneProps {
  readonly settings: ImageDitherSettings;
}

/**
 * Render the dithered image inside a react-three-fiber canvas scene.
 * @param props - Scene props carrying the dither settings.
 * @returns The WebGL mesh, or null while the source image is loading.
 */
function ImageDitherScene({
  settings,
}: ImageDitherSceneProps): ReactElement | null {
  const meshRef = useRef<THREE.Mesh>(null);
  const textureRef = useRef<THREE.Texture | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const { viewport, size, gl, invalidate } = useThree();

  // Load image texture
  useEffect(() => {
    if (!settings.image) {
      setImageLoaded(false);
      return;
    }

    const loader = new THREE.TextureLoader();
    let imageUrl: string;

    if (typeof settings.image === 'string') {
      imageUrl = settings.image;
    } else {
      const canvas = document.createElement('canvas');
      canvas.width = settings.image.width;
      canvas.height = settings.image.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(settings.image, 0, 0);
        imageUrl = canvas.toDataURL();
      } else {
        return;
      }
    }

    loader.load(
      imageUrl,
      (texture) => {
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        textureRef.current = texture;
        setImageLoaded(true);
      },
      undefined,
      () => {
        setImageLoaded(false);
      }
    );

    return () => {
      if (textureRef.current) {
        textureRef.current.dispose();
      }
    };
  }, [settings.image]);

  const uniformsRef = useRef({
    u_resolution: new THREE.Uniform(new THREE.Vector2(size.width, size.height)),
    u_pixelRatio: new THREE.Uniform(gl.getPixelRatio()),
    u_originX: new THREE.Uniform(0),
    u_originY: new THREE.Uniform(0),
    u_worldWidth: new THREE.Uniform(viewport.width),
    u_worldHeight: new THREE.Uniform(viewport.height),
    u_fit: new THREE.Uniform(
      settings.fit === 'contain' ? 0 : settings.fit === 'cover' ? 1 : 2
    ),
    u_scale: new THREE.Uniform(settings.scale ?? 1),
    u_rotation: new THREE.Uniform((settings.rotation ?? 0) * (Math.PI / 180)),
    u_offsetX: new THREE.Uniform(settings.offsetX ?? 0),
    u_offsetY: new THREE.Uniform(settings.offsetY ?? 0),
    u_colorFront: new THREE.Uniform(
      new THREE.Vector4(...hexToRgba(settings.colorFront ?? '#ffffff'))
    ),
    u_colorBack: new THREE.Uniform(
      new THREE.Vector4(...hexToRgba(settings.colorBack ?? '#000000'))
    ),
    u_colorHighlight: new THREE.Uniform(
      new THREE.Vector4(...hexToRgba(settings.colorHighlight ?? '#ffffff'))
    ),
    u_image: new THREE.Uniform(null as THREE.Texture | null),
    u_imageAspectRatio: new THREE.Uniform(1),
    u_type: new THREE.Uniform(
      settings.type === 'random'
        ? 1
        : settings.type === '2x2'
          ? 2
          : settings.type === '4x4'
            ? 3
            : 4
    ),
    u_pxSize: new THREE.Uniform(settings.pxSize ?? 4),
    u_originalColors: new THREE.Uniform(settings.originalColors ?? false),
    u_colorSteps: new THREE.Uniform(settings.colorSteps ?? 4),
  });

  useEffect(() => {
    const dpr = gl.getPixelRatio();
    uniformsRef.current.u_resolution.value.set(
      size.width * dpr,
      size.height * dpr
    );
    uniformsRef.current.u_pixelRatio.value = dpr;
    uniformsRef.current.u_worldWidth.value = viewport.width;
    uniformsRef.current.u_worldHeight.value = viewport.height;
  }, [size, viewport, gl]);

  useEffect(() => {
    const texture = textureRef.current;
    if (texture && imageLoaded) {
      uniformsRef.current.u_image.value = texture;
      const image = texture.image;
      // Narrow the `unknown` image payload to a sized image element/data source.
      const aspect = isSizedImage(image) ? image.width / image.height : 1;
      uniformsRef.current.u_imageAspectRatio.value = aspect;
      invalidate();
    }
  }, [imageLoaded, invalidate]);

  // Static image: sync uniforms on settings change only (not per frame),
  // then request a single demand-mode render.
  useEffect(() => {
    const u = uniformsRef.current;
    u.u_scale.value = settings.scale ?? 1;
    u.u_rotation.value = ((settings.rotation ?? 0) * Math.PI) / 180;
    u.u_offsetX.value = settings.offsetX ?? 0;
    u.u_offsetY.value = settings.offsetY ?? 0;
    u.u_pxSize.value = settings.pxSize ?? 4;
    u.u_colorSteps.value = settings.colorSteps ?? 4;
    u.u_originalColors.value = settings.originalColors ?? false;
    u.u_fit.value =
      settings.fit === 'contain' ? 0 : settings.fit === 'cover' ? 1 : 2;

    u.u_type.value =
      settings.type === 'random'
        ? 1
        : settings.type === '2x2'
          ? 2
          : settings.type === '4x4'
            ? 3
            : 4;

    const frontColor = hexToRgba(settings.colorFront ?? '#ffffff');
    u.u_colorFront.value.set(
      frontColor[0],
      frontColor[1],
      frontColor[2],
      frontColor[3]
    );

    const backColor = hexToRgba(settings.colorBack ?? '#000000');
    u.u_colorBack.value.set(
      backColor[0],
      backColor[1],
      backColor[2],
      backColor[3]
    );

    const highlightColor = hexToRgba(settings.colorHighlight ?? '#ffffff');
    u.u_colorHighlight.value.set(
      highlightColor[0],
      highlightColor[1],
      highlightColor[2],
      highlightColor[3]
    );
    invalidate();
  }, [
    settings.scale,
    settings.rotation,
    settings.offsetX,
    settings.offsetY,
    settings.pxSize,
    settings.colorSteps,
    settings.originalColors,
    settings.fit,
    settings.type,
    settings.colorFront,
    settings.colorBack,
    settings.colorHighlight,
    invalidate,
  ]);

  if (!imageLoaded || !textureRef.current) {
    return null;
  }

  return (
    <mesh ref={meshRef} scale={[viewport.width, viewport.height, 1]}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        vertexShader={VERTEX_SHADER}
        fragmentShader={FRAGMENT_SHADER}
        uniforms={uniformsRef.current}
        transparent
      />
    </mesh>
  );
}

/**
 * Narrow an `unknown` texture image payload to an object with numeric
 * width/height (e.g. `HTMLImageElement` or `HTMLCanvasElement`).
 * @param image - The raw texture image value to narrow.
 * @returns True when the value has numeric width and height.
 */
function isSizedImage(
  image: unknown
): image is { readonly width: number; readonly height: number } {
  return (
    typeof image === 'object' &&
    image !== null &&
    'width' in image &&
    'height' in image &&
    typeof (image as { width: unknown }).width === 'number' &&
    typeof (image as { height: unknown }).height === 'number'
  );
}

function hexToRgba(hex: string): [number, number, number, number] {
  const normalizedHex = hex.startsWith('#') ? hex.slice(1) : hex;
  const r = parseInt(normalizedHex.slice(0, 2), 16) / 255;
  const g = parseInt(normalizedHex.slice(2, 4), 16) / 255;
  const b = parseInt(normalizedHex.slice(4, 6), 16) / 255;
  const a =
    normalizedHex.length >= 8
      ? parseInt(normalizedHex.slice(6, 8), 16) / 255
      : 1;
  return [r, g, b, a];
}

/** Props for the top-level image dither component. */
interface ImageDitherProps {
  readonly settings?: ImageDitherSettings;
}

/**
 * Render a dithered image with configurable palette and pixelization settings.
 * @param props - Component props carrying the dither settings.
 * @returns The image dither canvas element.
 */
export default function ImageDither({
  settings = {},
}: ImageDitherProps): ReactElement {
  return (
    <Box
      as="div"
      position="absolute"
      top={0}
      left={0}
      width="100vw"
      height="100dvh"
      maxWidth="100%"
      maxHeight="100%"
      minWidth={0}
      minHeight={0}
      overflow="hidden"
      display="flex"
      alignItems="center"
      justifyContent="center"
      boxSizing="border-box"
      style={{ touchAction: 'none' }}
    >
      <Canvas
        className="image-dither-container"
        camera={{ position: [0, 0, 1] }}
        dpr={1}
        frameloop="demand"
        gl={{ antialias: false, preserveDrawingBuffer: true }}
        style={{
          width: '100%',
          height: '100%',
          maxWidth: '100%',
          maxHeight: '100%',
          display: 'block',
          touchAction: 'none',
        }}
      >
        <ImageDitherScene settings={settings} />
      </Canvas>
    </Box>
  );
}
