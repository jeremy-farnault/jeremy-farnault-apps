/**
 * Every number the game logic uses, as plain data. Tune here, never in logic.
 * Tuned in ticket 12 against the spec's targets and locked by the week
 * simulation (src/logic/week.test.ts): a player who checks in at 08:00,
 * 12:30, 18:00 and 21:30 makes no care mistakes, and the yen holds over a
 * month. Change a number, run the tests.
 *
 * The daily routine the numbers are built around: a 2 h Cook at breakfast
 * and dinner, an Onigiri for lunch with a 2 h Nap or Sento, and a 30-min one
 * before bed. Checking in more often frees slots for Hustle and growth.
 */
export const balance = {
  /** A new furyo's stats (the POC's). */
  start: {
    stamina: 80,
    belly: 50,
    style: 100,
    yen: 1000,
    smarts: 20,
    rep: 10,
    guts: 80,
    power: 40,
  },

  /**
   * Vital points lost per hour, awake. Belly is the clock, on the spec's
   * target: full → 25% in 5 h 15, → 0 in 7 h. Stamina and style are slower
   * (full → 0 in 25 h and 20 h): with one stance per check-in, three vitals
   * at belly's speed can't be kept up (the simulation ended in game over by
   * day 4 at the POC's rates). Stamina mostly comes back with sleep. Each
   * vital keeps its own rate. Growth stats and yen never decay in v1.
   */
  decayPerHour: {
    stamina: 4,
    belly: 100 / 7,
    style: 5,
  },

  /**
   * Instant boosts, sold at the konbini. From the POC: its five items, plus
   * its Cram Burst and Rounds as the cram book and the arcade round. The
   * three vital items give a quarter of a vital for ¥100, about an hour of
   * Hustle pay (the spec's target). Growth items keep the POC's prices: they
   * are what spare yen is for.
   */
  items: {
    wetWipes: { stat: 'style', amount: 25, price: 100 },
    onigiri: { stat: 'belly', amount: 25, price: 100 },
    energyDrink: { stat: 'stamina', amount: 25, price: 100 },
    manga: { stat: 'guts', amount: 20, price: 300 },
    proteinShake: { stat: 'power', amount: 10, price: 500 },
    cramBook: { stat: 'smarts', amount: 10, price: 800 },
    arcadeRound: { stat: 'rep', amount: 10, price: 1000 },
  },

  /**
   * One of each vital item, so a new furyo has a quick fix before the
   * welcome gift on day 3. The growth items are no longer given: buying
   * them is what spare yen is for.
   */
  starterInventory: {
    wetWipes: 1,
    onigiri: 1,
    energyDrink: 1,
    manga: 0,
    proteinShake: 0,
    cramBook: 0,
    arcadeRound: 0,
  },

  /**
   * Stances: one at a time, each gains one stat and pays another, at a named
   * spot in one of the rooms (`spot`), or off-screen (`spot: null`). Only these
   * two stats move while it runs (neither decays). Totals per duration, from
   * the 30-min ones: 15 min gives 60% and 2 h gives 200%, so longer stances
   * give more in total but less per minute, and a 2 h vital stance fills an
   * empty vital exactly (no more overflow past 100). A 30-min vital stance
   * refills half a vital (the spec's target). Costs are small, so growth
   * stats mostly go up, as the spec wants. Hustle: ¥50 for 30 min.
   */
  stances: {
    nap: { spot: 'futon', gain: 'stamina', cost: 'belly', totals: totals(50, 10) },
    cook: { spot: 'stove', gain: 'belly', cost: 'power', totals: totals(50, 1) },
    cram: { spot: 'desk', gain: 'smarts', cost: 'guts', totals: totals(10, 5) },
    slack: { spot: 'sofa', gain: 'guts', cost: 'yen', totals: totals(20, 50) },
    squat: { spot: 'kerb', gain: 'rep', cost: 'smarts', totals: totals(10, 3) },
    train: { spot: 'pullUpBar', gain: 'power', cost: 'style', totals: totals(10, 10) },
    // Off-screen (no spot): he leaves by the Home door and comes back when it ends.
    sento: { spot: null, gain: 'style', cost: 'stamina', totals: totals(50, 10) },
    hustle: { spot: null, gain: 'yen', cost: 'rep', totals: totals(50, 2) },
  },

  /** Stance lengths, in minutes. */
  durations: {
    '15m': 15,
    '30m': 30,
    '2h': 120,
  },

  /**
   * How a stance's totals spread over its time: the gain is back-loaded
   * (the POC's "exponential", total × (e^p − 1) / (e − 1)), the cost linear.
   */
  curves: {
    gain: 'backLoaded',
    cost: 'linear',
  },

  /**
   * Sleep, on a schedule in local time (minutes after midnight). Decay runs
   * at `decayFactor` of its awake speed while he sleeps. Waking on his own
   * gives stamina (the POC's +35, now +40, and no longer −30 belly and −25
   * style, which made the morning the most dangerous moment). Being woken
   * early costs 20 stamina only, as ticket 08 described it.
   * `defaultTimeZone` is only for saves from before ticket 08; the client
   * sets the device's.
   */
  sleep: {
    window: { start: 23 * 60, end: 7 * 60 },
    defaultTimeZone: 'Europe/Stockholm',
    decayFactor: 0.25,
    naturalWake: { stamina: 40, belly: 0, style: 0 },
    earlyWake: { stamina: -20, belly: 0, style: 0 },
  },

  /**
   * Calendar events: the POC's five, in local time (the furyo's time zone).
   * Times are minutes after midnight, weekdays 0 for Sunday, month days 1–28
   * so every month has them. `effects` change stats, `items` add to the
   * inventory. Morning training was at 11:12 in the POC (its comment said
   * 6:00, which is inside the default sleep window): 07:30 here, just after
   * the default wake-up. It gives +4 power (the POC's +2), which balances the
   * two daily Cooks' cost.
   *
   * The economy: the weekly allowance (¥1,000) pays for his lunches (seven
   * Onigiri, ¥700) and a share of the monthly rent (¥1,000), leaving a few
   * hundred yen a month. Hustle and visitors (the Friend's bonus) add to it;
   * fines and setbacks take from it.
   */
  calendar: {
    rent: { when: { every: 'month', day: 1, time: 0 }, effects: { yen: -1000 }, items: {} },
    allowance: { when: { every: 'week', weekday: 1, time: 8 * 60 }, effects: { yen: 1000 }, items: {} },
    welcomeGift: { when: { once: 'afterBirth', minutes: 48 * 60 }, effects: { yen: 100 }, items: { onigiri: 2, energyDrink: 1 } },
    hygieneInspection: { when: { every: 'month', day: 15, time: 12 * 60 }, effects: { style: -10 }, items: {} },
    morningTraining: { when: { every: 'day', time: 7 * 60 + 30 }, effects: { power: 4, guts: 1 }, items: {} },
  },

  /**
   * The neglect ladder (the spec's numbers). A vital at 0 for `mistakeAfterHours`
   * is a care mistake (once per stretch at 0), with a setback. The setback
   * climbs with the mistakes in the last `windowHours`: the first collapses
   * him, the second gets him fined, the third gets him kicked out, and that
   * third is game over. A vital at 0 for `gameOverAtZeroHours` straight is
   * game over too. Setbacks: two days of lunch, half a week's allowance, a
   * week's allowance.
   */
  neglect: {
    mistakeAfterHours: 2,
    windowHours: 48,
    gameOverMistakes: 3,
    gameOverAtZeroHours: 24,
    setbacks: {
      collapsed: { yen: -200, rep: -5 },
      fined: { yen: -500, rep: -10 },
      kickedOut: { yen: -1000, rep: -20 },
    },
  },

  /**
   * Visitors: they only come while the game is open. The client brings one
   * every `arrivalMinutes` (a random pick between min and max), choosing who
   * by `weight`. Each waits `windowMinutes` for an answer, then leaves with
   * no effect. Numbers are a starting point for ticket 12.
   */
  visitors: {
    arrivalMinutes: { min: 4, max: 12 },
    windowMinutes: 2,
    kinds: {
      /**
       * A fight: he wins if a roll in [0, 1) falls under his chance, which
       * is (guts × gutsWeight + power × powerWeight) / 100, kept between
       * minChance and maxChance. From the start stats (80 guts, 40 power): 60%.
       */
      rival: {
        weight: 3,
        fight: { gutsWeight: 0.5, powerWeight: 0.5, minChance: 0.1, maxChance: 0.9, win: { rep: 10 }, lose: { stamina: -20 } },
      },
      /** Lends `amount`, repaid with `bonus` on top `repayAfterHours` later, even while the game is closed. */
      friend: { weight: 2, loan: { amount: 200, bonus: 100, repayAfterHours: 24 }, refuse: { rep: -3 } },
      /** Checks his style: under `styleBelow`, a fine (it takes only what's left). */
      cop: { weight: 2, styleBelow: 30, fine: { yen: -300 } },
      /** Fed one of `food`, the stray gives him `effects`. */
      stray: { weight: 2, food: 'onigiri', effects: { guts: 10 } },
      /** Drops one free item, picked from `items` by the seed. */
      delivery: { weight: 1, items: ['onigiri', 'energyDrink', 'wetWipes', 'manga', 'proteinShake'] },
    },
  },

  /** A vital crossing below this reports `vitalLow` (the badge's red dot uses the same line). */
  lowVital: 25,

  /** Inclusive bounds per kind of stat. */
  bounds: {
    vital: { min: 0, max: 100 },
    growth: { min: 0, max: 100 },
    yen: { min: 0, max: Number.MAX_SAFE_INTEGER },
  },
} as const

export type Balance = typeof balance

/** A stance's gain and cost per duration, from its 30-min totals. */
function totals(gain: number, cost: number) {
  const scale = { '15m': 0.6, '30m': 1, '2h': 2 } as const
  return {
    '15m': { gain: gain * scale['15m'], cost: cost * scale['15m'] },
    '30m': { gain: gain * scale['30m'], cost: cost * scale['30m'] },
    '2h': { gain: gain * scale['2h'], cost: cost * scale['2h'] },
  }
}
