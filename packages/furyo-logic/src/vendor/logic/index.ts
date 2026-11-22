// The game logic's public interface. Pure TS: no Phaser, no DOM, no clock.
export { advance, apply, cartTotal, fightChance, nextCalendarEvent, sleepProgress, stanceProgress, stanceTotals } from './game'
export type { Cart, Command, GameEvent, Outcome, RefusalReason, VisitorOutcome } from './game'
export { boundsOf, CALENDAR, VISITOR_RESPONSES, VISITORS, createFuryo, retire, SETBACKS, DURATIONS, GROWTH_STATS, ITEMS, migrate, STANCES, STATE_VERSION, STATS, VITALS } from './state'
export type { Loan, PendingVisitor, VisitorId, VisitorResponse, ActiveStance, CalendarId, CareMistake, DurationId, Ending, GameOver, PastFuryo, SetbackId, FuryoState, SleepSettings, Gender, GrowthId, ItemId, NewFuryo, StanceId, StatId, VitalId } from './state'
export { MINUTES_PER_DAY, nightAt, nextNight } from './sleep'
export { badgeStatus } from './badge'
export type { BadgeStatus } from './badge'
export type { Night, SleepWindow } from './sleep'
