// @ts-nocheck
/* eslint-disable react/no-unknown-property */
/**
 * Vendored from React Bits (https://reactbits.dev) — Lanyard, TS + Tailwind
 * variant. Kept as close to the upstream source as possible; the only
 * changes are the relative asset imports below. `frontImage`/`backImage`
 * are fed the student's QR code PNG (see `useStudentQr`) so the physical
 * card model displays the QR texture instead of the default card art.
 *
 * @ts-nocheck is intentional: this file is vendored third-party code that
 * leans on @react-three/fiber's dynamic JSX intrinsics (meshLineGeometry,
 * meshLineMaterial, etc.) and untyped rapier refs. See global.d.ts for the
 * minimal ambient declarations this still needs.
 */
'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, extend, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, useTexture, Environment, Lightformer } from '@react-three/drei';
import { BallCollider, CuboidCollider, Physics, RigidBody, useRopeJoint, useSphericalJoint } from '@react-three/rapier';
import { MeshLineGeometry, MeshLineMaterial } from 'meshline';

import cardGLB from '@/assets/lanyard/card.glb';
import lanyard from '@/assets/lanyard/lanyard.png';
import occLogo from '@/assets/occ-logo.png';

import * as THREE from 'three';

extend({ MeshLineGeometry, MeshLineMaterial });

// 1x1 transparent pixel — lets useTexture be called unconditionally when a
// front/back image isn't supplied.
const BLANK_PIXEL =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

// The card model's front face is UV-mapped to the LEFT half of the texture
// atlas and the back face to the RIGHT half (measured from card.glb). Each
// custom image is composited into its own half so the two faces render
// independently, aspect-preserving (no stretching).
const FRONT_UV_RECT = { x: 0, y: 0, w: 0.5, h: 0.755 };
const BACK_UV_RECT = { x: 0.5, y: 0, w: 0.5, h: 0.757 };

interface LanyardProps {
    position?: [number, number, number];
    gravity?: [number, number, number];
    fov?: number;
    transparent?: boolean;
    frontImage?: string | null;
    backImage?: string | null;
    imageFit?: 'cover' | 'contain';
    lanyardImage?: string | null;
    lanyardWidth?: number;
    /** Printed on the card's front face, under the QR code. */
    studentName?: string | null;
    studentNumber?: string | null;
}

export default function Lanyard({
    position = [0, 0, 30],
    gravity = [0, -40, 0],
    fov = 20,
    transparent = true,
    frontImage = null,
    backImage = occLogo,
    imageFit = 'cover',
    lanyardImage = null,
    lanyardWidth = 1,
    studentName = null,
    studentNumber = null,
}: LanyardProps) {
    const [isMobile, setIsMobile] = useState<boolean>(() => typeof window !== 'undefined' && window.innerWidth < 768);
    // Tracked so the camera framing (below) can react to the viewport's
    // actual aspect ratio — a fixed fov/position only keeps the card
    // centered and consistently sized on one screen shape.
    const [aspect, setAspect] = useState<number>(() =>
        typeof window !== 'undefined' ? window.innerWidth / window.innerHeight : 1,
    );

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
            setAspect(window.innerWidth / window.innerHeight);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Widen the FOV on short/wide viewports (landscape phones, tablets)
    // where a tall card would otherwise get cropped top/bottom, and pull
    // the camera in slightly on tall/narrow ones so the card reads bigger
    // without leaving the frame. `position`/`fov` from props are treated
    // as the tuned "reference" (portrait phone) values.
    const referenceAspect = 0.5;
    const aspectDelta = Math.max(0, aspect - referenceAspect);
    // Aspect ratio alone doesn't distinguish a short landscape phone from
    // a plain wide desktop window — both can have aspect > 0.5. Widening
    // the FOV for desktop too zooms the whole scene out further than the
    // lanyard band's geometry was tuned for, so the strap reads oversized
    // relative to the card and hook. Gate this to real mobile devices,
    // same as the camera-position pull-in below.
    const cameraFov = isMobile ? Math.min(45, fov + aspectDelta * 22) : fov;
    const cameraPosition: [number, number, number] = [
        position[0],
        position[1],
        // The "pull closer on wide aspect" correction below is tuned for
        // landscape phones/tablets, which are wide AND short. A desktop
        // browser window can have the same wide aspect ratio while still
        // being tall, so applying this on desktop over-zooms and crops the
        // lanyard's top — gate it to real mobile devices only.
        isMobile ? Math.max(position[2] - 2.5, position[2] - aspectDelta * 3) : position[2],
    ];

    return (
                        <div
            className="relative z-0 w-full h-screen flex justify-center items-center origin-center"
            // A plain pixel-space shift of the whole rendered scene — lace,
            // hook, and card together — up the screen. Deliberately not done
            // via camera/anchor position: those interact with the physics
            // sim's resting state in ways that aren't predictable without
            // running it, whereas this CSS transform moves exactly what you
            // see, by exactly this many pixels, no matter what the rig is
            // doing underneath. Increase the magnitude to move it up more.
            style={{ transform: 'translateY(-80px)' }}
        >
            <Canvas
                camera={{ position: cameraPosition, fov: cameraFov }}
                dpr={[1, isMobile ? 1.5 : 2]}
                gl={{ alpha: transparent }}
                onCreated={({ gl }) => gl.setClearColor(new THREE.Color(0x000000), transparent ? 0 : 1)}
            >
                <ambientLight intensity={Math.PI} />
                {/* A coarser mobile timestep (previously 1/30) under-corrects
                    this 4-segment rope-joint chain during fast swinging —
                    the joints visibly stretch and the card can look
                    detached from the cord mid-motion. Keeping 1/60 on all
                    devices trades a little mobile perf for a stable chain;
                    it's also what upstream reactbits uses unconditionally. */}
                <Physics gravity={gravity} timeStep={1 / 60}>
                    <Band
                        isMobile={isMobile}
                        frontImage={frontImage}
                        backImage={backImage}
                        imageFit={imageFit}
                        lanyardImage={lanyardImage}
                        lanyardWidth={lanyardWidth}
                        studentName={studentName}
                        studentNumber={studentNumber}
                    />
                </Physics>
                <Environment blur={0.75}>
                    <Lightformer
                        intensity={2}
                        color="white"
                        position={[0, -1, 5]}
                        rotation={[0, 0, Math.PI / 3]}
                        scale={[100, 0.1, 1]}
                    />
                    <Lightformer
                        intensity={3}
                        color="white"
                        position={[-1, -1, 1]}
                        rotation={[0, 0, Math.PI / 3]}
                        scale={[100, 0.1, 1]}
                    />
                    <Lightformer
                        intensity={3}
                        color="white"
                        position={[1, 1, 1]}
                        rotation={[0, 0, Math.PI / 3]}
                        scale={[100, 0.1, 1]}
                    />
                    <Lightformer
                        intensity={10}
                        color="white"
                        position={[-10, 0, 14]}
                        rotation={[0, Math.PI / 2, Math.PI / 3]}
                        scale={[100, 10, 1]}
                    />
                </Environment>
            </Canvas>
        </div>
    );
}

interface BandProps {
    maxSpeed?: number;
    minSpeed?: number;
    isMobile?: boolean;
    frontImage?: string | null;
    backImage?: string | null;
    imageFit?: 'cover' | 'contain';
    lanyardImage?: string | null;
    lanyardWidth?: number;
    studentName?: string | null;
    studentNumber?: string | null;
}

function Band({
    maxSpeed = 50,
    minSpeed = 0,
    isMobile = false,
    frontImage = null,
    backImage = occLogo,
    imageFit = 'cover',
    lanyardImage = null,
    lanyardWidth = 1,
    studentName = null,
    studentNumber = null,
}: BandProps) {
    const band = useRef(),
        fixed = useRef(),
        j1 = useRef(),
        j2 = useRef(),
        j3 = useRef(),
        card = useRef();
    const vec = new THREE.Vector3(),
        ang = new THREE.Vector3(),
        rot = new THREE.Vector3(),
        dir = new THREE.Vector3();
    const segmentProps = { type: 'dynamic', canSleep: true, colliders: false, angularDamping: 4, linearDamping: 4 };
    const { nodes, materials } = useGLTF(cardGLB);
    const texture = useTexture(lanyardImage || lanyard);
    // useTexture must be called unconditionally; use a blank pixel when an
    // image isn't supplied for a given face, then skip compositing it below.
    const frontTex = useTexture(frontImage || BLANK_PIXEL);
    const backTex = useTexture(backImage || BLANK_PIXEL);

    // Composite the front/back images into the card's texture atlas (front =
    // left half, back = right half). Each image is drawn aspect-preserving
    // (no stretch).
    const cardMap = useMemo(() => {
        const baseMap = materials.base.map;
        if (!frontImage && !backImage) return baseMap;

        const baseImg = baseMap.image;
        // Render well above the atlas's native texel density AND at an
        // actual power-of-two size. Non-POT textures are the classic cause
        // of a GPU silently resampling (softening) a texture it otherwise
        // can't mipmap cleanly — which reintroduces exactly the kind of
        // moiré/static look a plain "draw it sharp" pass doesn't fix on its
        // own, especially on stricter WebGL stacks like iOS Safari's.
        const nextPow2 = (n) => Math.pow(2, Math.ceil(Math.log2(n)));
        const W = Math.min(4096, nextPow2(baseImg.width * 2));
        const H = Math.min(4096, nextPow2(baseImg.height * 2));
        const canvas = document.createElement('canvas');
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d');
        if (!ctx) return baseMap;
        // Keep the original baked atlas for the card edges and any untouched
        // face. Smoothing is fine here — it's just the printed card art.
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(baseImg, 0, 0, W, H);

        const drawFitted = (img, rect, { crisp = false, padding = 0 } = {}) => {
            const rx = rect.x * W;
            const ry = rect.y * H;
            const rw = rect.w * W;
            const rh = rect.h * H;
            const pick = imageFit === 'contain' ? Math.min : Math.max;
            // `padding` shrinks the target area the image is fit into
            // (0.1 = fit within 90% of the face), independent of imageFit.
            const scale = pick((rw * (1 - padding)) / img.width, (rh * (1 - padding)) / img.height);
            const dw = img.width * scale;
            const dh = img.height * scale;
            const dx = rx + (rw - dw) / 2;
            const dy = ry + (rh - dh) / 2;
            ctx.save();
            ctx.beginPath();
            ctx.rect(rx, ry, rw, rh);
            ctx.clip();
            // Paint over whatever the baked-in card.glb art has here first.
            // "contain" fit doesn't fill the whole face — it letterboxes to
            // preserve the custom image's aspect ratio — so without this,
            // the original demo artwork (reactbits.dev branding, checker
            // pattern, etc.) shows through the letterboxed margins.
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(rx, ry, rw, rh);
            // Bilinear resampling (the canvas default) is what turns a QR
            // code's flat black/white modules into a noisy blur when it's
            // scaled up — mirrors the `imageRendering: pixelated` trick the
            // old DOM overlay used. Nearest-neighbor keeps every module a
            // clean hard-edged square, which is both sharper to look at and
            // more reliably scannable.
            ctx.imageSmoothingEnabled = !crisp;
            ctx.drawImage(img, dx, dy, dw, dh);
            ctx.restore();
        };

        // Wipe the whole front face to white first, so the QR code and the
        // printed name/ID below it both sit on a clean background instead
        // of whatever the original baked card art had there.
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(FRONT_UV_RECT.x * W, FRONT_UV_RECT.y * H, FRONT_UV_RECT.w * W, FRONT_UV_RECT.h * H);

        // QR sits in the top portion of the front face, nudged down a touch
        // from the very top edge. The rect's height is set to exactly match
        // its width in actual rendered pixels (not just a fraction of the
        // face) — the QR image is square, so a taller-than-wide rect makes
        // `drawFitted`'s "contain" sizing shrink it to fit the width and
        // leave blank letterboxed space below it, which is what was
        // reading as a big gap before the text even started.
        const qrTopMargin = FRONT_UV_RECT.h * 0.035;
        const qrSideNormH = (FRONT_UV_RECT.w * W) / H;
        const qrRect = {
            x: FRONT_UV_RECT.x,
            y: FRONT_UV_RECT.y + qrTopMargin,
            w: FRONT_UV_RECT.w,
            h: qrSideNormH * 1.15,
        };
        if (frontImage && frontTex.image) drawFitted(frontTex.image, qrRect, { crisp: true, padding: 0 });
        if (backImage && backTex.image) drawFitted(backTex.image, BACK_UV_RECT, { crisp: true, padding: 0.15 });

        // Printed name + student number, in real vector text drawn straight
        // onto the high-resolution atlas (not a scaled-up bitmap), so it
        // stays sharp at any distance/zoom the physical card is viewed at.
        if (studentName || studentNumber) {
            // The system font stack — this renders as San Francisco on
            // iOS/macOS, Segoe UI on Windows, Roboto on Android — rather
            // than "Inter", which isn't actually loaded as a web font here
            // and was silently falling back to plain Arial/Helvetica.
            const fontStack = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
            const textCenterX = (FRONT_UV_RECT.x + FRONT_UV_RECT.w / 2) * W;
            const blockTop = (qrRect.y + qrRect.h) * H;
            const blockH = (FRONT_UV_RECT.y + FRONT_UV_RECT.h - (qrRect.y + qrRect.h)) * H;
            // Leave a margin on both sides so text never touches — let alone
            // crosses — the card's rounded edge, and shrink the font until
            // the longest line actually fits that width instead of just
            // sizing off the block's height.
            const maxTextWidth = FRONT_UV_RECT.w * W * 0.86;
            const fitFontSize = (text, startPx, weight) => {
                let size = startPx;
                ctx.font = `${weight} ${size}px ${fontStack}`;
                while (size > 8 && ctx.measureText(text).width > maxTextWidth) {
                    size -= 1;
                    ctx.font = `${weight} ${size}px ${fontStack}`;
                }
                return size;
            };
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'alphabetic';
            if (studentName) {
                // Wrap onto a second line at the nearest space instead of
                // shrinking indefinitely — a long name stays legible rather
                // than collapsing toward the 8px floor.
                const words = studentName.split(' ');
                let nameLines = [studentName];
                if (words.length > 1) {
                    const mid = Math.ceil(words.length / 2);
                    nameLines = [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
                }
                const longestLine = nameLines.reduce((a, b) => (a.length > b.length ? a : b));
                const size = fitFontSize(longestLine, blockH * 0.28, 700);
                ctx.fillStyle = '#111111';
                ctx.font = `700 ${size}px ${fontStack}`;
                const lineGap = size * 1.15;
                const startY = blockTop + blockH * 0.10 - (nameLines.length - 1) * (lineGap / 2);
                nameLines.forEach((line, i) => ctx.fillText(line, textCenterX, startY + i * lineGap));
            }
            if (studentNumber) {
                const size = fitFontSize(studentNumber, blockH * 0.24, 500);
                ctx.fillStyle = '#5b5b5b';
                ctx.font = `500 ${size}px ${fontStack}`;
                ctx.fillText(studentNumber, textCenterX, blockTop + blockH * 0.60);
            }
            ctx.restore();
        }

        const composite = new THREE.CanvasTexture(canvas);
        composite.colorSpace = THREE.SRGBColorSpace;
        composite.flipY = baseMap.flipY;
        // No mipmaps, no linear filtering — sample exactly the pixels we
        // drew, with zero GPU-side smoothing in between. Mipmapping trades
        // a little anti-aliasing at a distance for guaranteed crispness up
        // close, which is what actually matters for a QR someone scans.
        composite.generateMipmaps = false;
        composite.minFilter = THREE.NearestFilter;
        composite.magFilter = THREE.NearestFilter;
        composite.needsUpdate = true;
        return composite;
    }, [frontImage, backImage, studentName, studentNumber, imageFit, frontTex, backTex, materials.base.map]);

    const [curve] = useState(
        () =>
            new THREE.CatmullRomCurve3([new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]),
    );
    const [dragged, drag] = useState(false);
    const [hovered, hover] = useState(false);

    useRopeJoint(fixed, j1, [[0, 0, 0], [0, 0, 0], 1]);
    useRopeJoint(j1, j2, [[0, 0, 0], [0, 0, 0], 1]);
    useRopeJoint(j2, j3, [[0, 0, 0], [0, 0, 0], 1]);
    useSphericalJoint(j3, card, [
        [0, 0, 0],
        [0, 1.5, 0],
    ]);

    useEffect(() => {
        if (hovered) {
            document.body.style.cursor = dragged ? 'grabbing' : 'grab';
            return () => void (document.body.style.cursor = 'auto');
        }
    }, [hovered, dragged]);

    useFrame((state, delta) => {
        if (dragged) {
            vec.set(state.pointer.x, state.pointer.y, 0.5).unproject(state.camera);
            dir.copy(vec).sub(state.camera.position).normalize();
            vec.add(dir.multiplyScalar(state.camera.position.length()));
            [card, j1, j2, j3, fixed].forEach((ref) => ref.current?.wakeUp());
            card.current?.setNextKinematicTranslation({ x: vec.x - dragged.x, y: vec.y - dragged.y, z: vec.z - dragged.z });
        }
        if (fixed.current) {
            [j1, j2].forEach((ref) => {
                if (!ref.current.lerped) ref.current.lerped = new THREE.Vector3().copy(ref.current.translation());
                const clampedDistance = Math.max(0.1, Math.min(1, ref.current.lerped.distanceTo(ref.current.translation())));
                ref.current.lerped.lerp(
                    ref.current.translation(),
                    delta * (minSpeed + clampedDistance * (maxSpeed - minSpeed)),
                );
            });
            curve.points[0].copy(j3.current.translation());
            curve.points[1].copy(j2.current.lerped);
            curve.points[2].copy(j1.current.lerped);
            curve.points[3].copy(fixed.current.translation());
            band.current.geometry.setPoints(curve.getPoints(isMobile ? 16 : 32));
            ang.copy(card.current.angvel());
            rot.copy(card.current.rotation());
            card.current.setAngvel({ x: ang.x, y: ang.y - rot.y * 0.25, z: ang.z });
        }
    });

    curve.curveType = 'chordal';
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;

    return (
        <>
            <group position={[0, 4, 0]}>
                <RigidBody ref={fixed} {...segmentProps} type="fixed" />
                <RigidBody position={[0.5, 0, 0]} ref={j1} {...segmentProps}>
                    <BallCollider args={[0.1]} />
                </RigidBody>
                <RigidBody position={[1, 0, 0]} ref={j2} {...segmentProps}>
                    <BallCollider args={[0.1]} />
                </RigidBody>
                <RigidBody position={[1.5, 0, 0]} ref={j3} {...segmentProps}>
                    <BallCollider args={[0.1]} />
                </RigidBody>
                <RigidBody position={[2, 0, 0]} ref={card} {...segmentProps} type={dragged ? 'kinematicPosition' : 'dynamic'}>
                    <CuboidCollider args={[0.8, 1.125, 0.01]} />
                    <group
                        // Keep this at the model's tuned 2.25 — the rope's
                        // physical attachment point is computed in the card's
                        // unscaled physics-body frame, so scaling this visual
                        // group any further moves the clip/hook hardware away
                        // from where the lace actually terminates. Make the
                        // card read bigger via the camera instead (see
                        // cameraFov/cameraPosition above), not by scaling this.
                        scale={2.25}
                        position={[0, -1.2, -0.05]}
                        onPointerOver={() => hover(true)}
                        onPointerOut={() => hover(false)}
                        onPointerUp={(e) => (e.target.releasePointerCapture(e.pointerId), drag(false))}
                        onPointerDown={(e) => (
                            e.target.setPointerCapture(e.pointerId),
                            drag(new THREE.Vector3().copy(e.point).sub(vec.copy(card.current.translation())))
                        )}
                    >
                        <mesh geometry={nodes.card.geometry}>
                            <meshPhysicalMaterial
                                map={cardMap}
                                map-anisotropy={16}
                                clearcoat={0}
                                roughness={1}
                                metalness={0.4}
                            />
                        </mesh>
                        <mesh geometry={nodes.clip.geometry} material={materials.metal} material-roughness={0.3} />
                        <mesh geometry={nodes.clamp.geometry} material={materials.metal} />
                    </group>
                </RigidBody>
            </group>
            <mesh ref={band}>
                <meshLineGeometry />
                <meshLineMaterial
                    color="white"
                    depthTest={false}
                    resolution={isMobile ? [1000, 2000] : [1000, 1000]}
                    useMap
                    map={texture}
                    repeat={[-4, 1]}
                    lineWidth={lanyardWidth}
                />
            </mesh>
        </>
    );
}
