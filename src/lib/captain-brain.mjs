/**
 * Captain's pose state machine, kept pure and separate from the DOM so it can
 * be exercised without a browser. `scripts/test-captain-brain.mjs` drives it.
 *
 * Everything here is a function of elapsed time and how far he is from where he
 * wants to be. No rendering, no refs, no timers.
 */

/** Beyond this he walks. */
export const WALK_THRESHOLD = 46;
/** Between ALERT and WALK he stands rather than sits — an alert stance. */
export const ALERT_THRESHOLD = 24;
/** While rolling, a target this far away gets him back on his feet. */
export const ROLL_INTERRUPT = 140;

/**
 * @typedef {'stand' | 'walk' | 'sit' | 'roll'} Pose
 * @typedef {{ pose: Pose, idleFor: number, rollFor: number, settleFor: number, nextRollAt: number }} PoseState
 */

/**
 * First roll comes early so a visitor discovers the behaviour exists; later
 * ones space out so he isn't constantly flopping about.
 * @returns {PoseState}
 */
export function createPoseState(rand = Math.random) {
  return {
    pose: 'sit',
    idleFor: 0,
    rollFor: 0,
    settleFor: 0,
    nextRollAt: 4 + rand() * 3,
  };
}

/**
 * Advance one frame. Mutates and returns `s`.
 *
 * @param {PoseState} s
 * @param {number} dt seconds since the last frame
 * @param {number} distance px between him and his target
 * @param {() => number} rand
 */
export function stepPose(s, dt, distance, rand = Math.random) {
  if (s.pose === 'roll') {
    s.rollFor -= dt;
    if (s.rollFor <= 0 || distance > ROLL_INTERRUPT) {
      s.pose = 'sit';
      s.nextRollAt = 10 + rand() * 8;
      s.idleFor = 0;
    }
    return s;
  }

  if (distance > WALK_THRESHOLD) {
    s.pose = 'walk';
    s.settleFor = 0;
    s.idleFor = 0;
    return s;
  }

  if (s.pose === 'walk') {
    // Just arrived — hold a beat before settling, so he doesn't snap to a sit.
    s.pose = 'stand';
    s.settleFor = 0.9;
    return s;
  }

  if (s.settleFor > 0) {
    s.settleFor -= dt;
    if (s.settleFor <= 0) s.pose = 'sit';
    return s;
  }

  s.idleFor += dt;

  // The roll is gated on being idle, NOT on being in the 'sit' pose. He stops
  // walking at 46px but only sits inside 24px, so gating on 'sit' left a dead
  // band at 24-46px — where he'd stand forever and never roll. That band is
  // where he lands most of the time, which is why it looked like the roll was
  // simply broken.
  if (s.idleFor > s.nextRollAt) {
    s.pose = 'roll';
    s.rollFor = 3.4 + rand() * 2.2;
    s.idleFor = 0;
    return s;
  }

  s.pose = distance > ALERT_THRESHOLD ? 'stand' : 'sit';
  return s;
}
