'use client';

import { useEffect, useRef } from 'react';
import { createPoseState, stepPose } from '@/lib/captain-brain.mjs';

/**
 * Captain — the pixel-art husky who walks along the bottom of the hero.
 *
 * The engine is deliberately art-agnostic: it decides WHICH frame to show and
 * WHERE, and nothing else. Any sprite sheet matching the contract below works.
 *
 * Behaviour: walks toward the cursor, flips to face it, settles into a sit when
 * you stop, flops onto his back if left alone, hops when clicked. Honours
 * prefers-reduced-motion, wanders on its own on touch devices, and stops the
 * rAF loop when the tab is hidden or the hero scrolls out of view.
 */

/** Sprite sheet contract: one row, frames left-to-right in this order. */
const SHEET = '/captain/captain.png';
const FRAMES = ['stand', 'walk1', 'walk2', 'sit', 'roll'] as const;
/**
 * Frame box, not dog: every pose is centred in a box wide enough for the widest
 * of them, which is the roll — flopped on his back he is half again as long as
 * he is standing. Standing poses therefore carry transparent padding either
 * side, and `bounds()` below keeps that padding on the track rather than
 * letting the roll's tail run off the edge.
 */
const FRAME_W = 180;
const FRAME_H = 102;
/** On-screen size. Mobile is held smaller so he isn't half a phone screen. */
const DESKTOP_SCALE = 1.15;
const MOBILE_SCALE = 0.71;
/**
 * Pixels of travel per walk-frame swap. Tied to distance rather than time so
 * the legs can never moonwalk. At the 210px/s top speed this is ~2.6 full leg
 * cycles a second — a trot. Much below ~30 and it reads as vibrating.
 */
const STRIDE = 40;

type Frame = (typeof FRAMES)[number];
const frameIndex = (f: Frame) => FRAMES.indexOf(f);

export default function CaptainAvatar() {
  const trackRef = useRef<HTMLDivElement>(null);
  const moverRef = useRef<HTMLDivElement>(null);
  const spriteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    const mover = moverRef.current;
    const sprite = spriteRef.current;
    if (!track || !mover || !sprite) return;

    // Reduced motion damps him rather than switching him off, and the line is
    // drawn at *smooth movement*, not at "anything that changes":
    //   - walking  -> continuous translation, so it slows to ~half speed
    //   - hop      -> smooth vertical travel, so it's dropped
    //   - roll     -> a discrete sprite swap with no movement at all, so it stays
    // Windows maps "show animations off" to this preference, so a large share of
    // visitors land here; gating the roll would hide it from most of them for no
    // accessibility gain.
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const maxSpeed = reduceMotion ? 110 : 210;

    const scale = window.matchMedia('(min-width: 640px)').matches ? DESKTOP_SCALE : MOBILE_SCALE;
    const dogWidth = FRAME_W * scale;
    const bounds = () => Math.max(0, track.clientWidth - dogWidth);

    let x = bounds() * 0.18;
    let targetX = x;
    let facing = 1;
    let walkDistance = 0;
    let hopFor = 0;
    // Pose/idle/roll bookkeeping lives in a pure, tested module.
    // See scripts/test-captain-brain.mjs.
    const brain = createPoseState();
    // Must stay longer than brain.nextRollAt, or wandering restarts the idle
    // timer before it can ever fire and he'd never roll without a mouse.
    let nextWanderAt = 9 + Math.random() * 8;
    let pointerX: number | null = null;
    /** Until a real pointer shows up he entertains himself. Detected rather
     *  than inferred from media queries, which misreport on hybrid machines. */
    let sawPointer = false;
    let shownFrame: Frame | null = null;

    const draw = (frame: Frame, lift: number) => {
      if (frame !== shownFrame) {
        sprite.style.backgroundPosition = `${-frameIndex(frame) * FRAME_W}px 0`;
        shownFrame = frame;
      }
      // Scale lives on the mover so `dogWidth` above matches what's on screen.
      mover.style.transform = `translate3d(${x}px, ${-lift}px, 0) scale(${scale})`;
      sprite.style.transform = `scaleX(${facing})`;
    };

    const onPointerMove = (event: PointerEvent) => {
      sawPointer = true;
      const rect = track.getBoundingClientRect();
      pointerX = event.clientX - rect.left;
      if (Math.abs(pointerX - (x + dogWidth / 2)) > 8) brain.idleFor = 0;
    };

    const onClick = () => {
      if (!reduceMotion) hopFor = 0.45;
      brain.idleFor = 0;
      if (brain.pose === 'roll') {
        brain.rollFor = 0;
        brain.pose = 'sit';
      }
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    mover.addEventListener('click', onClick);

    draw('sit', 0); // paint a first frame before rAF gets going

    // Dev-only readout: call __captain() in the console to see live state.
    // Stripped from production builds.
    type DebugWindow = Window & { __captain?: () => Record<string, unknown> };
    if (process.env.NODE_ENV !== 'production') {
      (window as DebugWindow).__captain = () => ({
        pose: brain.pose,
        idleFor: Number(brain.idleFor.toFixed(1)),
        rollsIn: Number(Math.max(0, brain.nextRollAt - brain.idleFor).toFixed(1)),
        rollFor: Number(brain.rollFor.toFixed(1)),
        distanceToCursor: Math.round(Math.abs(targetX - x)),
        sawPointer,
        reduceMotion,
        frame: shownFrame,
      });
    }

    let last = performance.now();
    let frame = 0;
    let running = true;

    const tick = (now: number) => {
      if (!running) return;
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (hopFor > 0) hopFor = Math.max(0, hopFor - dt);

      const limit = bounds();
      const centre = x + dogWidth / 2;

      if (!sawPointer) {
        nextWanderAt -= dt;
        if (nextWanderAt <= 0) {
          targetX = Math.random() * limit;
          nextWanderAt = 9 + Math.random() * 8;
          // idleFor is deliberately NOT reset here — walking resets it anyway,
          // and clearing it twice starved the roll timer entirely.
        }
      } else if (pointerX !== null) {
        targetX = Math.min(Math.max(pointerX - dogWidth / 2, 0), limit);
      }

      const delta = targetX - x;
      const distance = Math.abs(delta);

      stepPose(brain, dt, distance);

      if (brain.pose === 'walk') {
        const speed = Math.min(distance * 2.6, maxSpeed); // px/s, eases in near the target
        const step = Math.sign(delta) * Math.min(speed * dt, distance);
        x += step;
        facing = delta >= 0 ? 1 : -1;
        walkDistance += Math.abs(step);
      } else {
        walkDistance = 0;
        // Face the cursor while parked, so he never sits with his back to you.
        if (pointerX !== null && brain.pose !== 'roll' && Math.abs(pointerX - centre) > 18) {
          facing = pointerX > centre ? 1 : -1;
        }
      }

      // Step the walk cycle off distance travelled, so it never moonwalks.
      const walkFrame: Frame = Math.floor(walkDistance / STRIDE) % 2 === 0 ? 'walk1' : 'walk2';
      const current: Frame = brain.pose === 'walk' ? walkFrame : brain.pose;
      draw(current, hopFor > 0 ? Math.sin((1 - hopFor / 0.45) * Math.PI) * 9 : 0);

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);

    const resume = () => {
      if (running || document.hidden) return;
      running = true;
      last = performance.now();
      frame = requestAnimationFrame(tick);
    };
    const pause = () => {
      running = false;
      cancelAnimationFrame(frame);
    };

    const onVisibility = () => (document.hidden ? pause() : resume());
    document.addEventListener('visibilitychange', onVisibility);

    const observer = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? resume() : pause()),
      { threshold: 0 },
    );
    observer.observe(track);

    return () => {
      pause();
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pointermove', onPointerMove);
      mover.removeEventListener('click', onClick);
      if (process.env.NODE_ENV !== 'production') delete (window as DebugWindow).__captain;
    };
  }, []);

  return (
    <div
      ref={trackRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-2 z-20 select-none sm:bottom-6"
      style={{ height: Math.ceil(FRAME_H * DESKTOP_SCALE) }}
    >
      <div
        ref={moverRef}
        className="pointer-events-auto absolute bottom-0 left-0 cursor-pointer"
        style={{ width: FRAME_W, height: FRAME_H, transformOrigin: 'bottom left' }}
        title="Captain"
      >
        <div
          ref={spriteRef}
          className="h-full w-full"
          style={{
            backgroundImage: `url(${SHEET})`,
            backgroundSize: `${FRAME_W * FRAMES.length}px ${FRAME_H}px`,
            backgroundRepeat: 'no-repeat',
            // Keeps the sprite crisp rather than smoothing the pixels.
            imageRendering: 'pixelated',
          }}
        />
      </div>
    </div>
  );
}
