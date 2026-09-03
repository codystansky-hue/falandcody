/**
 * Tests for Captain's pose state machine.
 *
 *   npm run test:captain
 *
 * The roll behaviour shipped broken twice because it was only ever verified by
 * reading the code and staring at a browser. These drive the real state machine
 * with a fake clock instead.
 */

import {
  createPoseState,
  stepPose,
  WALK_THRESHOLD,
  ALERT_THRESHOLD,
} from '../src/lib/captain-brain.mjs';

let failures = 0;
function check(name, condition, detail = '') {
  if (condition) {
    console.log(`  PASS  ${name}`);
  } else {
    failures++;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

/** Deterministic rand so failures are reproducible. */
const seeded = (seed) => () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
};

/** Run `seconds` of frames at 60fps holding a fixed distance. */
function simulate(distance, seconds, rand = seeded(1)) {
  const s = createPoseState(rand);
  const seen = new Set([s.pose]);
  const dt = 1 / 60;
  let rolls = 0;
  let wasRolling = false;
  for (let t = 0; t < seconds; t += dt) {
    stepPose(s, dt, distance, rand);
    seen.add(s.pose);
    if (s.pose === 'roll' && !wasRolling) rolls++;
    wasRolling = s.pose === 'roll';
  }
  return { state: s, seen, rolls };
}

console.log('\ncaptain-brain\n');

// The regression that shipped: he stops walking at 46px but only sat inside
// 24px, and the roll was gated on sitting. Anywhere in that band he stood
// forever. This is the exact distance the bug lived at.
const deadBand = (WALK_THRESHOLD + ALERT_THRESHOLD) / 2; // 35
const band = simulate(deadBand, 30);
check(
  `rolls when idle at ${deadBand}px — the old 24-46px dead band`,
  band.rolls > 0,
  `saw poses: ${[...band.seen].join(', ')}`,
);

// And it should still roll at the distances that always worked.
check('rolls when idle right on top of the target', simulate(0, 30).rolls > 0);
check('rolls when idle just inside the walk threshold', simulate(45, 30).rolls > 0);

// Far away he should be walking, never rolling.
const far = simulate(400, 30);
check('never rolls while the target is far away', far.rolls === 0);
check('walks when the target is far away', far.state.pose === 'walk');

// Rolls should end, not latch.
const many = simulate(0, 120);
check('rolls repeatedly rather than sticking', many.rolls >= 3, `rolls=${many.rolls}`);
check('does not end the run stuck in a roll', many.state.pose !== 'roll' || many.state.rollFor > 0);

// A roll lasts 3.4-5.6s.
{
  const rand = seeded(7);
  const s = createPoseState(rand);
  const dt = 1 / 60;
  let t = 0;
  while (s.pose !== 'roll' && t < 30) {
    stepPose(s, dt, 0, rand);
    t += dt;
  }
  const startedAt = t;
  while (s.pose === 'roll' && t < 60) {
    stepPose(s, dt, 0, rand);
    t += dt;
  }
  const held = t - startedAt;
  check('roll lasts 3.4-5.6s', held >= 3.3 && held <= 5.7, `held ${held.toFixed(2)}s`);
  check('first roll arrives within 7s', startedAt <= 7.1, `at ${startedAt.toFixed(2)}s`);
}

// A target moving far away mid-roll should get him up.
{
  const rand = seeded(3);
  const s = createPoseState(rand);
  const dt = 1 / 60;
  for (let t = 0; t < 30 && s.pose !== 'roll'; t += dt) stepPose(s, dt, 0, rand);
  check('reached a roll before the interrupt test', s.pose === 'roll');
  stepPose(s, dt, 400, rand);
  check('a distant target interrupts the roll', s.pose !== 'roll');
}

console.log(failures === 0 ? '\nall passing\n' : `\n${failures} failing\n`);
process.exit(failures === 0 ? 0 : 1);
