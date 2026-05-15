import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  Edit3,
  KeyRound,
  LayoutDashboard,
  LockKeyhole,
  MessageCircle,
  Moon,
  Plus,
  Save,
  Settings,
  Target,
  Trash2,
  Users,
  X
} from 'lucide-react';
import branding from '../branding.config.json';
import PokerTable, { type Player as PokerTablePlayer } from './components/PokerTable';
import './styles.css';

declare global {
  interface Window {
    tableManagerDesktop?: {
      platform: string;
      isDesktop: boolean;
      openWindow: (route: AppRoute) => Promise<void>;
      loadState: () => Promise<{ schemaVersion: number; savedAt: string; state: Partial<AppState> } | null>;
      saveState: (state: AppState) => Promise<{ ok: boolean; path: string }>;
    };
  }
}

type AppRoute = 'floor' | 'builder' | 'profiles' | 'signals' | 'summary' | 'customization' | 'kpis';
type InterestStatus =
  | 'Interested'
  | 'Confirmed Coming'
  | 'Arrived'
  | 'Seated'
  | 'Declined'
  | 'No-Show'
  | 'Left Before Seated'
  | 'Removed';
type GameStatus = 'Running' | 'Forming' | 'Paused' | 'Closed' | 'Failed to Start';
type TableTag =
  | 'Action'
  | 'Social'
  | 'Competitive'
  | 'Beginner-Friendly'
  | 'Deep-Stacked'
  | 'Relaxed'
  | 'Short-handed'
  | 'Full-ring'
  | 'Fast-moving'
  | 'Slow-moving';

type GameConfig = {
  id: string;
  name: string;
  maxSeats: number;
  minInRoomForLikely: number;
  minFlexibleForLikely: number;
  minTotalForViable: number;
};

type Interest = {
  id: string;
  profileId?: string;
  playerName: string;
  gameId: string;
  status: InterestStatus;
  timestamp: string;
  interestedAt: string;
  confirmedAt?: string;
  arrivedAt?: string;
  seatedAt?: string;
  closedAt?: string;
  notes: string;
  manualEdits?: Record<string, string>;
};

type PlayerProfile = {
  id: string;
  name: string;
  birthday: string;
  membershipStartDate: string;
  membershipExpirationDate: string;
  totalTimePlayedHours: number;
  lastSessionTimePlayedHours: number;
  commonlyPlaysWithProfileIds: string[];
  preferredGameId: string;
  preferredGameIds: string[];
  preferredStakes: string;
  typicalBuyInMin: number;
  typicalBuyInMax: number;
  willingnessToMove: boolean;
  typicalAvailability: string;
  usualCompanions: string[];
  preferredTags: TableTag[];
  notes: string;
};

type GameSession = {
  id: string;
  gameId: string;
  label: string;
  status: GameStatus;
  seatsFilled: number;
  maxSeats: number;
  timeRaked?: boolean;
  rakeMode?: 'Time' | 'Drop';
  plannedPlayerIds?: string[];
  tags: TableTag[];
  startedAt: string;
  endedAt?: string;
  manualEdits?: Record<string, string>;
};

type PlayerSession = {
  id: string;
  playerName: string;
  profileId?: string;
  gameId: string;
  tableId: string;
  seatedAt: string;
  leftAt?: string;
  timePurchasedMinutes?: number;
  timeRemainingMinutes?: number;
  lastTimeTickAt?: string;
  timeRakeEnabled?: boolean;
  manualEdits?: Record<string, string>;
};

type BuyInLog = {
  id: string;
  profileId?: string;
  playerName: string;
  tableId: string;
  gameId: string;
  amount: number;
  timestamp: string;
  note?: string;
};

type TableEventType = 'Created' | 'Started' | 'Failed to Start' | 'Broke' | 'Merged' | 'Closed';

type TableEvent = {
  id: string;
  type: TableEventType;
  gameId: string;
  tableId?: string;
  timestamp: string;
  playerCount: number;
  reason?: string;
  note: string;
};

type NightRecord = {
  id: string;
  date: string;
  occupiedSeatHours: number;
  gamesStarted: number;
  averageSessionDurationHours: number;
  averageActiveTables: number;
  waitlistConversionRate: number;
  hadTwoPlusTables: boolean;
  notes?: string;
};

type FeedbackEntry = {
  id: string;
  role: 'Staff' | 'Owner';
  text: string;
  createdAt: string;
};

type CorrectionEntry = {
  id: string;
  entity: string;
  field: string;
  note: string;
  timestamp: string;
};

type BrandTheme = typeof branding.theme.default;

type PilotAccess = {
  authorized: boolean;
  authorizationCode: string;
  expiresAt: string;
  activatedAt: string;
  keyFileName?: string;
  issuedTo?: string;
  issuedAt?: string;
  licenseId?: string;
};

type ClubAccount = {
  clubName: string;
  accountName: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
};

type AppState = {
  games: GameConfig[];
  profiles: PlayerProfile[];
  interests: Interest[];
  sessions: GameSession[];
  playerSessions: PlayerSession[];
  buyIns: BuyInLog[];
  tableEvents: TableEvent[];
  history: NightRecord[];
  feedback: FeedbackEntry[];
  scriptTemplates: string[];
  correctionLog: CorrectionEntry[];
  settings: {
    lowLight: boolean;
    defaultRakeMode: 'Time' | 'Drop';
    showPlayerGrid: boolean;
    showDashboardKpis: boolean;
    showRecentPlayers: boolean;
    pilotAccess?: PilotAccess;
    clubAccount?: ClubAccount;
  };
};

type ParticipantCandidate = {
  id: string;
  playerName: string;
  interest?: Interest;
  profile?: PlayerProfile;
  confidence: number;
  reasons: string[];
  source: 'interest' | 'connected-profile';
};

type BalancePlan = {
  game: GameConfig;
  demand: ReturnType<typeof getDemand>;
  fromTable: GameSession;
  moveCandidates: ParticipantCandidate[];
  tableASeatsAfterMove: number;
  tableBProjectedSeats: number;
  nextStep: string;
};

type GroupMeCandidate = {
  id: string;
  playerName: string;
  gameId: string;
  status: InterestStatus;
  timestamp: string;
  confidence: number;
  sourceText: string;
};

const statuses: InterestStatus[] = [
  'Interested',
  'Confirmed Coming',
  'Arrived',
  'Seated',
  'Declined',
  'No-Show',
  'Left Before Seated',
  'Removed'
];
const activeInterestStatuses: InterestStatus[] = ['Interested', 'Confirmed Coming', 'Arrived'];
const gameQualityTags: TableTag[] = [
  'Social',
  'Action',
  'Relaxed',
  'Competitive',
  'Deep-Stacked',
  'Beginner-Friendly',
  'Short-handed',
  'Full-ring',
  'Fast-moving',
  'Slow-moving'
];
const failedStartReasons = ['not enough arrivals', 'players declined', 'wait too long', 'table fit concern', 'staff decision', 'other'];
const tableBreakReasons = ['too few players', 'players moved', 'players left', 'game merged', 'room closing', 'other'];
const defaultScriptTemplates = [
  'Current {game} has {inRoom} in the room, {coming} coming, and {waiting} waiting or interested.',
  'Current {game} is full, but overflow is building with {waiting} waiting or interested.',
  "We're building {game}, but need {needs} more player(s) before it is realistic.",
  '{game} is close to forming if arrivals hold. We can add you to the interest list.'
];
const storageKey = 'table-manager-state-v1';

const nowIso = () => new Date().toISOString();
const uid = () => crypto.randomUUID();
const memberId = () => `mem_${crypto.getRandomValues(new Uint32Array(2))[0].toString(16)}${crypto.getRandomValues(new Uint32Array(2))[1].toString(16)}`;
const todayDate = () => new Date().toISOString().slice(0, 10);
const nextYearDate = () => {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  return date.toISOString().slice(0, 10);
};
const hoursBetween = (start: string, end = nowIso()) =>
  Math.max(0, (new Date(end).getTime() - new Date(start).getTime()) / 36e5);
const formatClock = (iso?: string) => (iso ? new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '-');
const minutesSince = (iso?: string) => (iso ? Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000)) : 0);
const formatHours = (hours: number) => `${hours.toFixed(1)}h`;
const formatMinutesLeft = (minutes: number) => {
  if (minutes <= 0) return '0m';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours ? `${hours}h ${mins}m` : `${mins}m`;
};
const getTimeRemainingMinutes = (session: PlayerSession, nowMs = Date.now()) => {
  if (!session.timeRakeEnabled) return 0;
  const baseRemaining = session.timeRemainingMinutes ?? 0;
  const lastTick = new Date(session.lastTimeTickAt ?? session.seatedAt).getTime();
  return Math.max(0, baseRemaining - Math.floor((nowMs - lastTick) / 60000));
};
const getTimeRemainingSeconds = (session: PlayerSession, nowMs = Date.now()) => {
  if (!session.timeRakeEnabled) return 0;
  const baseRemaining = (session.timeRemainingMinutes ?? 0) * 60;
  const lastTick = new Date(session.lastTimeTickAt ?? session.seatedAt).getTime();
  return Math.max(0, baseRemaining - Math.floor((nowMs - lastTick) / 1000));
};
const formatTimeLeft = (seconds: number) => {
  if (seconds <= 0) return '0:00';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  const clock = `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}` : clock;
};
const getTimeStatus = (minutes: number) => (minutes > 20 ? 'green' : minutes > 0 ? 'yellow' : 'red');
const isFutureDate = (value?: string) => Boolean(value && new Date(`${value}T23:59:59`).getTime() >= Date.now());
const isPilotAccessActive = (access?: PilotAccess) => Boolean(access?.authorized && isFutureDate(access.expiresAt));
const base64ToArrayBuffer = (base64: string) => {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
};
const leftPadSignatureInteger = (bytes: Uint8Array) => {
  const normalized = bytes[0] === 0 ? bytes.slice(1) : bytes;
  if (normalized.length > 32) throw new Error('Invalid signature integer length.');
  const padded = new Uint8Array(32);
  padded.set(normalized, 32 - normalized.length);
  return padded;
};
const derToRawP256Signature = (signature: Uint8Array) => {
  if (signature.length === 64) return signature.buffer;
  if (signature[0] !== 0x30) throw new Error('Invalid signature format.');
  let offset = 2;
  if (signature[offset] !== 0x02) throw new Error('Invalid signature format.');
  const rLength = signature[offset + 1];
  const r = signature.slice(offset + 2, offset + 2 + rLength);
  offset += 2 + rLength;
  if (signature[offset] !== 0x02) throw new Error('Invalid signature format.');
  const sLength = signature[offset + 1];
  const s = signature.slice(offset + 2, offset + 2 + sLength);
  const raw = new Uint8Array(64);
  raw.set(leftPadSignatureInteger(r), 0);
  raw.set(leftPadSignatureInteger(s), 32);
  return raw.buffer;
};
const pemToArrayBuffer = (pem: string) =>
  base64ToArrayBuffer(
    pem
      .replace(/-----BEGIN PUBLIC KEY-----/g, '')
      .replace(/-----END PUBLIC KEY-----/g, '')
      .replace(/\s/g, '')
  );
const canonicalLicensePayload = (payload: Record<string, unknown>) =>
  JSON.stringify(
    Object.keys(payload)
      .sort()
      .reduce<Record<string, unknown>>((record, key) => {
        record[key] = payload[key];
        return record;
      }, {})
  );
const verifyPilotSignature = async (payload: Record<string, unknown>, signature: string) => {
  const publicKeyPem = branding.license?.publicKeyPem?.trim();
  if (!publicKeyPem) return { ok: false, error: 'License verification is not configured for this build.' };
  try {
    const key = await crypto.subtle.importKey(
      'spki',
      pemToArrayBuffer(publicKeyPem),
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify']
    );
    const verified = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      key,
      derToRawP256Signature(new Uint8Array(base64ToArrayBuffer(signature))),
      new TextEncoder().encode(canonicalLicensePayload(payload))
    );
    return verified ? { ok: true } : { ok: false, error: 'License signature is invalid.' };
  } catch {
    return { ok: false, error: 'Unable to verify license signature.' };
  }
};
const emptyClubAccount: ClubAccount = {
  clubName: '',
  accountName: '',
  contactName: '',
  email: '',
  phone: '',
  address: ''
};
const validatePilotKey = async (licenseFile: unknown, fileName?: string): Promise<{ access?: PilotAccess; error?: string }> => {
  const file = licenseFile as Record<string, unknown>;
  const record = (file.payload ?? file) as Record<string, unknown>;
  const signature = String(file.signature ?? '').trim();
  const authorizationCode = String(record.authorizationCode ?? record.code ?? '').trim();
  const expiresAt = String(record.expiresAt ?? record.expirationDate ?? record.validUntil ?? '').slice(0, 10);

  if (!signature) {
    return { error: 'Key file is not signed. Generate a production pilot key with the license tool.' };
  }

  if (!authorizationCode || authorizationCode.length < 12) {
    return { error: 'Key file is missing a valid authorization code.' };
  }

  if (!expiresAt || Number.isNaN(new Date(expiresAt).getTime())) {
    return { error: 'Key file is missing a valid expiration date.' };
  }

  if (!isFutureDate(expiresAt)) {
    return { error: `This pilot key expired on ${expiresAt}.` };
  }

  const signatureResult = await verifyPilotSignature(record, signature);
  if (!signatureResult.ok) {
    return { error: signatureResult.error ?? 'License signature is invalid.' };
  }

  return {
    access: {
      authorized: true,
      authorizationCode,
      expiresAt,
      activatedAt: nowIso(),
      keyFileName: fileName,
      issuedTo: String(record.issuedTo ?? ''),
      issuedAt: String(record.issuedAt ?? ''),
      licenseId: String(record.licenseId ?? '')
    }
  };
};
const toDateTimeInput = (iso?: string) => (iso ? new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '');
const fromDateTimeInput = (value: string) => (value ? new Date(value).toISOString() : undefined);
const markManualEdit = (edits: Record<string, string> | undefined, key: string) => ({ ...(edits ?? {}), [key]: nowIso() });
const cssBrandVariableMap: Record<keyof BrandTheme, string> = {
  ink: '--ink',
  muted: '--muted',
  canvas: '--canvas',
  panel: '--panel',
  panelSolid: '--panel-solid',
  line: '--line',
  lineStrong: '--line-strong',
  primary: '--primary',
  primaryDark: '--primary-dark',
  primarySoft: '--primary-soft',
  teal: '--teal',
  tealSoft: '--teal-soft',
  amber: '--amber',
  amberSoft: '--amber-soft',
  rose: '--rose',
  roseSoft: '--rose-soft',
  backgroundStart: '--background-start',
  backgroundAccentPrimary: '--background-accent-primary',
  backgroundAccentSecondary: '--background-accent-secondary'
};
const applyBrandTheme = (theme: BrandTheme) => {
  Object.entries(cssBrandVariableMap).forEach(([key, variable]) => {
    document.body.style.setProperty(variable, theme[key as keyof BrandTheme]);
  });
  document.body.style.setProperty('--brand-font-family', branding.theme.fontFamily);
};
const median = (values: number[]) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};
const legacyStatusMap: Record<string, InterestStatus> = {
  'In Room': 'Arrived',
  Waiting: 'Interested',
  'Interested / Maybe': 'Interested',
  Coming: 'Confirmed Coming'
};

const seedState: AppState = {
  games: [
    { id: 'nlh-1-2', name: '1/2 NLH', maxSeats: 10, minInRoomForLikely: 3, minFlexibleForLikely: 2, minTotalForViable: 6 },
    { id: 'plo', name: 'PLO', maxSeats: 10, minInRoomForLikely: 3, minFlexibleForLikely: 2, minTotalForViable: 5 },
    { id: 'nlh-2-5', name: '2/5 NLH', maxSeats: 10, minInRoomForLikely: 3, minFlexibleForLikely: 2, minTotalForViable: 6 }
  ],
  profiles: [
    {
      id: 'profile-john',
      name: 'John',
      birthday: '',
      membershipStartDate: todayDate(),
      membershipExpirationDate: nextYearDate(),
      totalTimePlayedHours: 0,
      lastSessionTimePlayedHours: 0,
      commonlyPlaysWithProfileIds: ['profile-mike'],
      preferredGameId: 'nlh-1-2',
      preferredGameIds: ['nlh-1-2'],
      preferredStakes: '1/2 NLH',
      typicalBuyInMin: 200,
      typicalBuyInMax: 400,
      willingnessToMove: true,
      typicalAvailability: 'Evenings',
      usualCompanions: ['Mike'],
      preferredTags: ['Social', 'Full-ring'],
      notes: 'Likes a full table and will move to a second table.'
    },
    {
      id: 'profile-mike',
      name: 'Mike',
      birthday: '',
      membershipStartDate: todayDate(),
      membershipExpirationDate: nextYearDate(),
      totalTimePlayedHours: 0,
      lastSessionTimePlayedHours: 0,
      commonlyPlaysWithProfileIds: ['profile-john', 'profile-sam'],
      preferredGameId: 'nlh-1-2',
      preferredGameIds: ['nlh-1-2', 'nlh-2-5'],
      preferredStakes: '1/2 NLH, 2/5 NLH',
      typicalBuyInMin: 300,
      typicalBuyInMax: 800,
      willingnessToMove: true,
      typicalAvailability: 'Nights',
      usualCompanions: ['John', 'Sam'],
      preferredTags: ['Action', 'Fast-moving'],
      notes: 'Often arrives after calling ahead.'
    },
    {
      id: 'profile-alex',
      name: 'Alex',
      birthday: '',
      membershipStartDate: todayDate(),
      membershipExpirationDate: nextYearDate(),
      totalTimePlayedHours: 0,
      lastSessionTimePlayedHours: 0,
      commonlyPlaysWithProfileIds: [],
      preferredGameId: 'plo',
      preferredGameIds: ['plo'],
      preferredStakes: 'PLO',
      typicalBuyInMin: 500,
      typicalBuyInMax: 1000,
      willingnessToMove: false,
      typicalAvailability: 'PLO nights',
      usualCompanions: [],
      preferredTags: ['Deep-Stacked', 'Competitive'],
      notes: 'Prefers deep-stacked PLO.'
    },
    {
      id: 'profile-sam',
      name: 'Sam',
      birthday: '',
      membershipStartDate: todayDate(),
      membershipExpirationDate: nextYearDate(),
      totalTimePlayedHours: 0,
      lastSessionTimePlayedHours: 0,
      commonlyPlaysWithProfileIds: ['profile-mike'],
      preferredGameId: 'nlh-1-2',
      preferredGameIds: ['nlh-1-2'],
      preferredStakes: '1/2 NLH',
      typicalBuyInMin: 200,
      typicalBuyInMax: 500,
      willingnessToMove: true,
      typicalAvailability: 'Weekends',
      usualCompanions: ['Mike'],
      preferredTags: ['Relaxed', 'Social'],
      notes: 'Willing to help start a new table.'
    }
  ],
  interests: [
    { id: uid(), profileId: 'profile-john', playerName: 'John', gameId: 'nlh-1-2', status: 'Arrived', timestamp: nowIso(), interestedAt: nowIso(), arrivedAt: nowIso(), notes: 'Prefers main list' },
    { id: uid(), profileId: 'profile-mike', playerName: 'Mike', gameId: 'nlh-1-2', status: 'Confirmed Coming', timestamp: nowIso(), interestedAt: nowIso(), confirmedAt: nowIso(), notes: '20 min ETA' },
    { id: uid(), profileId: 'profile-alex', playerName: 'Alex', gameId: 'plo', status: 'Interested', timestamp: nowIso(), interestedAt: nowIso(), notes: '' },
    { id: uid(), profileId: 'profile-sam', playerName: 'Sam', gameId: 'nlh-1-2', status: 'Interested', timestamp: nowIso(), interestedAt: nowIso(), notes: 'Second table OK' }
  ],
  sessions: [
    {
      id: uid(),
      gameId: 'nlh-1-2',
      label: 'Main Table',
      status: 'Running',
      seatsFilled: 9,
      maxSeats: 10,
      timeRaked: true,
      rakeMode: 'Time',
      tags: ['Action', 'Social'],
      startedAt: new Date(Date.now() - 2.4 * 36e5).toISOString()
    },
    {
      id: uid(),
      gameId: 'plo',
      label: 'Interest Table',
      status: 'Forming',
      seatsFilled: 3,
      maxSeats: 10,
      timeRaked: true,
      rakeMode: 'Time',
      tags: ['Deep-Stacked'],
      startedAt: nowIso()
    }
  ],
  playerSessions: [],
  buyIns: [],
  tableEvents: [],
  history: [
    {
      id: uid(),
      date: '2026-05-04',
      occupiedSeatHours: 68,
      gamesStarted: 4,
      averageSessionDurationHours: 3.8,
      averageActiveTables: 2.1,
      waitlistConversionRate: 0.62,
      hadTwoPlusTables: true
    },
    {
      id: uid(),
      date: '2026-05-05',
      occupiedSeatHours: 51,
      gamesStarted: 3,
      averageSessionDurationHours: 3.1,
      averageActiveTables: 1.7,
      waitlistConversionRate: 0.48,
      hadTwoPlusTables: false
    }
  ],
  feedback: [],
  scriptTemplates: defaultScriptTemplates,
  correctionLog: [],
    settings: {
      lowLight: false,
      defaultRakeMode: 'Drop',
      showPlayerGrid: true,
      showDashboardKpis: false,
      showRecentPlayers: true,
      pilotAccess: undefined,
      clubAccount: undefined
    }
};

function normalizeState(parsed: Partial<AppState>): AppState {
  const games = (parsed.games ?? seedState.games).map((game) =>
    ({ ...game, maxSeats: Math.max(game.maxSeats, 10) })
  );
  const profiles =
    parsed.profiles ??
    (parsed.interests ?? []).map((interest) => ({
      id: uid(),
      name: interest.playerName,
      birthday: '',
      membershipStartDate: todayDate(),
      membershipExpirationDate: nextYearDate(),
      totalTimePlayedHours: 0,
      lastSessionTimePlayedHours: 0,
      commonlyPlaysWithProfileIds: [],
      preferredGameId: interest.gameId,
      preferredGameIds: [interest.gameId],
      preferredStakes: '',
      typicalBuyInMin: 0,
      typicalBuyInMax: 0,
      willingnessToMove: false,
      typicalAvailability: '',
      preferredTags: [],
      usualCompanions: [],
      notes: ''
    }));
  const interests = (parsed.interests ?? []).map((interest) => {
    const status = legacyStatusMap[interest.status] ?? (interest.status as InterestStatus);
    return {
      ...interest,
      status,
      interestedAt: interest.interestedAt ?? interest.timestamp ?? nowIso(),
      confirmedAt: interest.confirmedAt ?? (status === 'Confirmed Coming' ? interest.timestamp : undefined),
      arrivedAt: interest.arrivedAt ?? (status === 'Arrived' ? interest.timestamp : undefined),
      seatedAt: interest.seatedAt ?? (status === 'Seated' ? interest.timestamp : undefined),
      closedAt:
        interest.closedAt ??
        (['Declined', 'No-Show', 'Left Before Seated', 'Removed'].includes(status) ? interest.timestamp : undefined),
      manualEdits: interest.manualEdits ?? {}
    };
  });

  return {
    games,
    profiles: profiles.map((profile) => ({
      ...profile,
      birthday: profile.birthday ?? '',
      membershipStartDate: profile.membershipStartDate ?? todayDate(),
      membershipExpirationDate: profile.membershipExpirationDate ?? nextYearDate(),
      totalTimePlayedHours: profile.totalTimePlayedHours ?? 0,
      lastSessionTimePlayedHours: profile.lastSessionTimePlayedHours ?? 0,
      commonlyPlaysWithProfileIds:
        profile.commonlyPlaysWithProfileIds ??
        (profile.usualCompanions ?? [])
          .map((name) => profiles.find((candidate) => candidate.name.toLowerCase() === name.toLowerCase())?.id)
          .filter((id): id is string => Boolean(id)),
      preferredGameId: profile.preferredGameId ?? profile.preferredGameIds?.[0] ?? games[0]?.id ?? 'nlh-1-2',
      preferredGameIds: profile.preferredGameIds?.length ? profile.preferredGameIds : [profile.preferredGameId ?? games[0]?.id ?? 'nlh-1-2'],
      willingnessToMove: profile.willingnessToMove ?? false,
      typicalAvailability: profile.typicalAvailability ?? '',
      preferredTags: profile.preferredTags ?? []
    })),
    interests,
    sessions: (parsed.sessions ?? []).map((session) => {
      const rakeMode = session.rakeMode ?? (session.timeRaked ? 'Time' : 'Drop');
      const game = games.find((item) => item.id === session.gameId);
      return {
        ...session,
        maxSeats: game ? Math.max(session.maxSeats, game.maxSeats) : session.maxSeats,
        rakeMode,
        timeRaked: rakeMode === 'Time',
        manualEdits: session.manualEdits ?? {}
      };
    }),
    playerSessions: (parsed.playerSessions ?? []).map((session) => ({
      ...session,
      timePurchasedMinutes: session.timePurchasedMinutes ?? 0,
      timeRemainingMinutes: session.timeRemainingMinutes ?? 0,
      lastTimeTickAt: session.lastTimeTickAt ?? session.seatedAt,
      timeRakeEnabled: session.timeRakeEnabled ?? false,
      manualEdits: session.manualEdits ?? {}
    })),
    buyIns: parsed.buyIns ?? [],
    tableEvents: (parsed.tableEvents ?? []).map((event) => ({ ...event, reason: event.reason ?? '' })),
    history: parsed.history ?? [],
    feedback: parsed.feedback ?? [],
    scriptTemplates: parsed.scriptTemplates ?? defaultScriptTemplates,
    correctionLog: parsed.correctionLog ?? [],
    settings: {
      lowLight: parsed.settings?.lowLight ?? false,
      defaultRakeMode: parsed.settings?.defaultRakeMode ?? 'Drop',
      showPlayerGrid: parsed.settings?.showPlayerGrid ?? true,
      showDashboardKpis: parsed.settings?.showDashboardKpis ?? false,
      showRecentPlayers: parsed.settings?.showRecentPlayers ?? true,
      pilotAccess: parsed.settings?.pilotAccess,
      clubAccount: parsed.settings?.clubAccount
    }
  };
}

function loadState(): AppState {
  try {
    const stored = localStorage.getItem(storageKey);
    if (!stored) return seedState;
    return normalizeState(JSON.parse(stored) as Partial<AppState>);
  } catch {
    return seedState;
  }
}

function saveState(state: AppState) {
  localStorage.setItem(storageKey, JSON.stringify(state));
  window.tableManagerDesktop?.saveState(state).catch(() => undefined);
}

function getDemand(game: GameConfig, interests: Interest[]) {
  const gameInterests = interests.filter((interest) => interest.gameId === game.id);
  const inRoom = gameInterests.filter((interest) => interest.status === 'Arrived' || interest.status === 'Seated').length;
  const confirmed = gameInterests.filter((interest) => interest.status === 'Confirmed Coming').length;
  const interested = gameInterests.filter((interest) => interest.status === 'Interested').length;
  const waiting = gameInterests.filter((interest) => interest.status === 'Arrived').length;
  const flexibleDemand = confirmed + interested + waiting;
  const totalDemand = inRoom + flexibleDemand;
  const likely = inRoom >= game.minInRoomForLikely && flexibleDemand >= game.minFlexibleForLikely;
  const needs = Math.max(0, game.minTotalForViable - totalDemand);

  return {
    inRoom,
    confirmed,
    interested,
    waiting,
    flexibleDemand,
    totalDemand,
    likely,
    needs,
    status: likely ? 'Likely to Start' : needs === 0 ? 'Viable' : `Needs ${needs} More`
  };
}

function getRunningSessions(state: AppState, gameId: string) {
  return state.sessions.filter((session) => session.gameId === gameId && session.status === 'Running');
}

function getOpenSessions(state: AppState, gameId: string) {
  return state.sessions.filter((session) => session.gameId === gameId && session.status !== 'Closed' && session.status !== 'Failed to Start');
}

function getPlayerLoggedHours(state: AppState, playerSession: PlayerSession) {
  const samePlayerSessions = state.playerSessions.filter((session) =>
    playerSession.profileId
      ? session.profileId === playerSession.profileId
      : session.playerName.toLowerCase() === playerSession.playerName.toLowerCase()
  );
  const total = samePlayerSessions.reduce((sum, session) => sum + hoursBetween(session.seatedAt, session.leftAt ?? nowIso()), 0);
  const tonight = state.playerSessions
    .filter((session) => session.id === playerSession.id || (
      !session.leftAt &&
      (playerSession.profileId
        ? session.profileId === playerSession.profileId
        : session.playerName.toLowerCase() === playerSession.playerName.toLowerCase())
    ))
    .reduce((sum, session) => sum + hoursBetween(session.seatedAt, session.leftAt ?? nowIso()), 0);
  return { tonight, total };
}

function getSessionBuyIns(state: AppState, playerSession: PlayerSession) {
  return state.buyIns.filter((buyIn) =>
    buyIn.tableId === playerSession.tableId &&
    buyIn.gameId === playerSession.gameId &&
    (playerSession.profileId ? buyIn.profileId === playerSession.profileId : buyIn.playerName.toLowerCase() === playerSession.playerName.toLowerCase())
  );
}

function getViabilityState(state: AppState, game: GameConfig) {
  const demand = getDemand(game, state.interests);
  const running = getRunningSessions(state, game.id);
  const fullTable = running.some((session) => session.seatsFilled >= session.maxSeats);

  if (running.length && fullTable && demand.flexibleDemand >= game.minFlexibleForLikely) {
    return { state: 'Likely to Start', nextStep: 'Second table likely' };
  }

  if (!running.length && demand.inRoom >= game.minInRoomForLikely && demand.totalDemand >= game.minTotalForViable) {
    return { state: 'Ready to Start', nextStep: 'Enough in-room demand to start' };
  }

  if (running.length) {
    const totalSeats = running.reduce((sum, session) => sum + session.seatsFilled, 0);
    const totalCapacity = running.reduce((sum, session) => sum + session.maxSeats, 0);
    if (totalSeats <= Math.floor(totalCapacity * 0.55) && demand.flexibleDemand < 2) {
      return { state: 'Fragile', nextStep: 'Game may not sustain yet' };
    }
    return { state: 'Running', nextStep: demand.waiting ? `${demand.waiting} waiting` : 'Game is active' };
  }

  if (demand.likely) return { state: 'Likely to Start', nextStep: 'Coordinate arrivals' };
  if (demand.totalDemand >= Math.max(2, game.minTotalForViable - 2)) {
    return { state: 'Building', nextStep: `Needs ${demand.needs} more player${demand.needs === 1 ? '' : 's'}` };
  }
  return { state: 'Not Enough Interest', nextStep: `Needs ${demand.needs} more players` };
}

function getTableHealth(state: AppState, session: GameSession) {
  const demand = getDemand(state.games.find((game) => game.id === session.gameId)!, state.interests);
  const fillRate = session.maxSeats ? session.seatsFilled / session.maxSeats : 0;
  if (session.status === 'Forming') return 'Building';
  if (fillRate >= 0.75 || demand.waiting > 0) return 'Healthy';
  if (fillRate >= 0.55 || demand.flexibleDemand >= 2) return 'Needs Attention';
  return 'Fragile';
}

function getOverflowOpportunities(state: AppState) {
  return state.games
    .map((game) => {
      const demand = getDemand(game, state.interests);
      const fullTables = getRunningSessions(state, game.id).filter((session) => session.seatsFilled >= session.maxSeats);
      return {
        game,
        demand,
        fullTables,
        label: `${game.name} full - ${demand.flexibleDemand} waiting/interested - ${
          demand.flexibleDemand >= game.minFlexibleForLikely ? 'second table possible' : 'keep gathering interest'
        }`
      };
    })
    .filter((item) => item.fullTables.length && item.demand.flexibleDemand > 0);
}

function getBalancePlans(state: AppState): BalancePlan[] {
  return state.games
    .map((game) => {
      const demand = getDemand(game, state.interests);
      const runningTables = getRunningSessions(state, game.id).filter((session) => session.seatsFilled >= Math.min(7, session.maxSeats));
      const fromTable = runningTables[0];
      if (!fromTable || demand.totalDemand <= 12) return null;

      const flexibleDemand = demand.confirmed + demand.waiting + demand.interested;
      const inRoomCandidates = state.interests
        .filter((interest) => interest.gameId === game.id && interest.status === 'Arrived')
        .map((interest) => {
          const profile = getProfileForInterest(interest, state.profiles);
          const connectedNames = profile?.usualCompanions.filter((name) =>
            state.interests.some(
              (other) =>
                other.playerName === name &&
                other.gameId === game.id &&
                ['Arrived', 'Confirmed Coming', 'Interested'].includes(other.status)
            )
          ) ?? [];
          const buyInAverage =
            profile && profile.typicalBuyInMax > 0
              ? Math.round((profile.typicalBuyInMin + profile.typicalBuyInMax) / 2)
              : 0;
          const confidence =
            (profile?.preferredGameIds.includes(game.id) || profile?.preferredStakes.includes(game.name) ? 35 : 10) +
            (profile?.willingnessToMove ? 35 : -15) +
            connectedNames.length * 20 +
            Math.min(20, Math.round(buyInAverage / 100));

          return {
            id: interest.id,
            playerName: interest.playerName,
            interest,
            profile,
            confidence,
            reasons: [
              profile?.willingnessToMove ? 'willing to move' : 'ask before moving',
              connectedNames.length ? `connected to ${connectedNames.join(', ')}` : '',
              buyInAverage ? `$${buyInAverage} typical buy-in` : '',
              profile?.preferredStakes || game.name
            ].filter(Boolean),
            source: 'interest' as const
          };
        })
        .sort((a, b) => b.confidence - a.confidence);

      const minimumTableASeats = Math.min(6, fromTable.maxSeats);
      const projectedTableBTarget = Math.min(game.maxSeats, Math.floor(demand.totalDemand / 2));
      const moveNeeded = Math.max(2, projectedTableBTarget - flexibleDemand);
      const maxMovable = Math.max(0, fromTable.seatsFilled - minimumTableASeats);
      const moveCount = Math.min(inRoomCandidates.length, maxMovable, moveNeeded);
      const moveCandidates = inRoomCandidates.slice(0, moveCount);

      if (!moveCandidates.length) return null;

      return {
        game,
        demand,
        fromTable,
        moveCandidates,
        tableASeatsAfterMove: fromTable.seatsFilled - moveCandidates.length,
        tableBProjectedSeats: flexibleDemand + moveCandidates.length,
        nextStep: `${game.name}: move ${moveCandidates.map((candidate) => candidate.playerName).join(', ')} to seed Table B`
      };
    })
    .filter((plan): plan is BalancePlan => Boolean(plan));
}

function getAnalytics(state: AppState) {
  const activeSessions = state.sessions.filter((session) => session.status === 'Running' || session.status === 'Forming');
  const completedSessions = state.sessions.filter((session) => session.endedAt);
  const liveSeatHours = activeSessions.reduce(
    (sum, session) => sum + session.seatsFilled * hoursBetween(session.startedAt),
    0
  );
  const completedSeatHours = completedSessions.reduce(
    (sum, session) => sum + session.seatsFilled * hoursBetween(session.startedAt, session.endedAt),
    0
  );
  const playerSeatHours = state.playerSessions.reduce(
    (sum, session) => sum + hoursBetween(session.seatedAt, session.leftAt),
    0
  );
  const completedWaits = state.interests.filter((interest) => interest.arrivedAt && interest.seatedAt);
  const waitMinutes = completedWaits.map(
    (interest) => (new Date(interest.seatedAt!).getTime() - new Date(interest.arrivedAt!).getTime()) / 60000
  );
  const arrivalWaits = state.interests.filter((interest) => interest.interestedAt && interest.arrivedAt);
  const confirmedComing = state.interests.filter((interest) => interest.confirmedAt || interest.status === 'Confirmed Coming');
  const confirmedArrived = confirmedComing.filter((interest) => interest.arrivedAt || interest.status === 'Arrived' || interest.status === 'Seated');
  const durations = state.sessions.map((session) => hoursBetween(session.startedAt, session.endedAt));
  const conversionEligible = state.interests.filter((interest) => interest.status !== 'Removed');
  const convertedWaiters = state.interests.filter((interest) => interest.seatedAt).length;
  const noShows = state.interests.filter((interest) => interest.status === 'No-Show').length;
  const declined = state.interests.filter((interest) => interest.status === 'Declined').length;
  const leftBeforeSeated = state.interests.filter((interest) => interest.status === 'Left Before Seated').length;
  const totalArrivals = state.interests.filter((interest) => interest.arrivedAt || interest.status === 'Arrived' || interest.status === 'Seated').length;
  const seatHoursByGame = state.games.map((game) => ({
    game: game.name,
    hours: state.playerSessions
      .filter((session) => session.gameId === game.id)
      .reduce((sum, session) => sum + hoursBetween(session.seatedAt, session.leftAt), 0)
  }));
  const seatHoursByTable = state.sessions.map((session) => ({
    table: session.label,
    game: state.games.find((game) => game.id === session.gameId)?.name ?? 'Unknown',
    hours: state.playerSessions
      .filter((playerSession) => playerSession.tableId === session.id)
      .reduce((sum, playerSession) => sum + hoursBetween(playerSession.seatedAt, playerSession.leftAt), 0)
  }));
  const waitByGame = state.games.map((game) => {
    const waits = completedWaits
      .filter((interest) => interest.gameId === game.id)
      .map((interest) => (new Date(interest.seatedAt!).getTime() - new Date(interest.arrivedAt!).getTime()) / 60000);
    return {
      game: game.name,
      averageMinutes: waits.length ? waits.reduce((sum, value) => sum + value, 0) / waits.length : 0,
      count: waits.length
    };
  });
  const failedStartEvents = state.tableEvents.filter((event) => event.type === 'Failed to Start');
  const lostSeatHourEstimate = failedStartEvents.length * 2 + leftBeforeSeated * 1.5;
  const currentNight: NightRecord = {
    id: 'current',
    date: new Date().toISOString().slice(0, 10),
    occupiedSeatHours: Math.max(liveSeatHours + completedSeatHours, playerSeatHours),
    gamesStarted: state.sessions.filter((session) => session.status !== 'Closed').length,
    averageSessionDurationHours: durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
    averageActiveTables: activeSessions.length,
    waitlistConversionRate: conversionEligible.length ? convertedWaiters / conversionEligible.length : 0,
    hadTwoPlusTables: activeSessions.length >= 2
  };
  return {
    currentNight,
    activeTables: activeSessions.length,
    averageSeatsOccupied: activeSessions.length
      ? activeSessions.reduce((sum, session) => sum + session.seatsFilled, 0) / activeSessions.length
      : 0,
    averageSeatHoursPerPlayer: state.playerSessions.length ? playerSeatHours / state.playerSessions.length : 0,
    averageWaitMinutes: waitMinutes.length ? waitMinutes.reduce((sum, value) => sum + value, 0) / waitMinutes.length : 0,
    medianWaitMinutes: median(waitMinutes),
    averageInterestToArrivalMinutes: arrivalWaits.length
      ? arrivalWaits.reduce((sum, interest) => sum + (new Date(interest.arrivedAt!).getTime() - new Date(interest.interestedAt).getTime()) / 60000, 0) /
        arrivalWaits.length
      : 0,
    conversionRate: conversionEligible.length ? convertedWaiters / conversionEligible.length : 0,
    noShowRate: conversionEligible.length ? noShows / conversionEligible.length : 0,
    declineRate: conversionEligible.length ? declined / conversionEligible.length : 0,
    leftBeforeSeatedRate: conversionEligible.length ? leftBeforeSeated / conversionEligible.length : 0,
    noShows,
    declined,
    leftBeforeSeated,
    confirmedArrivalRate: confirmedComing.length ? confirmedArrived.length / confirmedComing.length : 0,
    waitlistAbandonmentCount: leftBeforeSeated + declined,
    lostSeatHourEstimate,
    failedStarts: state.tableEvents.filter((event) => event.type === 'Failed to Start').length,
    tableBreaks: state.tableEvents.filter((event) => event.type === 'Broke' || event.type === 'Closed').length,
    secondTablesStarted: state.sessions.filter((session) => session.status !== 'Failed to Start' && session.label !== 'Main Table').length,
    totalArrivals,
    peakWaitlistPressure: Math.max(...state.games.map((game) => getDemand(game, state.interests).waiting + getDemand(game, state.interests).interested), 0),
    seatHoursByGame,
    seatHoursByTable,
    waitByGame,
    peakActiveTables: Math.max(activeSessions.length, state.history.reduce((max, night) => Math.max(max, night.averageActiveTables), 0)),
    peakInterestedByGame: state.games
      .map((game) => ({ game: game.name, count: getDemand(game, state.interests).totalDemand }))
      .sort((a, b) => b.count - a.count)[0]
  };
}

function getClosestGameLabel(state: AppState) {
  const closest = state.games
    .map((game) => ({ game, demand: getDemand(game, state.interests) }))
    .sort((a, b) => a.demand.needs - b.demand.needs || b.demand.totalDemand - a.demand.totalDemand)[0];

  if (!closest) return '-';
  return closest.demand.likely ? `${closest.game.name} likely` : `${closest.game.name}: needs ${closest.demand.needs}`;
}

function getProfileForInterest(interest: Interest, profiles: PlayerProfile[]) {
  return (
    profiles.find((profile) => profile.id === interest.profileId) ??
    profiles.find((profile) => profile.name.toLowerCase() === interest.playerName.toLowerCase())
  );
}

function getInClubInterests(state: AppState) {
  return state.interests.filter((interest) => interest.status === 'Arrived' || interest.status === 'Seated');
}

function getInClubNames(state: AppState) {
  return new Set(getInClubInterests(state).map((interest) => interest.playerName));
}

function getParticipantPool(state: AppState, gameId: string, seats: number): ParticipantCandidate[] {
  const availabilityScore: Record<InterestStatus, number> = {
    Arrived: 100,
    Seated: 96,
    Interested: 58,
    'Confirmed Coming': 76,
    Declined: 0,
    'No-Show': 0,
    'Left Before Seated': 0,
    Removed: 0
  };
  const available = state.interests.filter((interest) => activeInterestStatuses.includes(interest.status) && interest.gameId === gameId);
  const inClubNames = getInClubNames(state);
  const interestNames = new Set(state.interests.map((interest) => interest.playerName.toLowerCase()));

  const interestCandidates = available
    .map((interest) => {
      const profile = getProfileForInterest(interest, state.profiles);
      const companions = profile?.usualCompanions ?? [];
      const companionMatches = companions.filter((name) => inClubNames.has(name));
      const gameMatch = interest.gameId === gameId || !!profile?.preferredGameIds.includes(gameId);
      const tagMatches = profile?.preferredTags.filter((tag) =>
        state.sessions.some((session) => session.gameId === gameId && session.tags.includes(tag))
      ) ?? [];
      const buyInAverage =
        profile && profile.typicalBuyInMax > 0
          ? Math.round((profile.typicalBuyInMin + profile.typicalBuyInMax) / 2)
          : 0;
      const buyInScore = buyInAverage ? Math.min(18, Math.round(buyInAverage / 100)) : 0;
      const confidence =
        availabilityScore[interest.status] +
        (gameMatch ? 28 : -18) +
        Math.min(14, tagMatches.length * 7) +
        Math.min(24, companionMatches.length * 8) +
        buyInScore;
      const reasons = [
        interest.status,
        gameMatch ? 'game/stakes fit' : 'alternate game',
        tagMatches.length ? `fits ${tagMatches.join(', ')}` : '',
        companionMatches.length ? `connected to ${companionMatches.join(', ')}` : '',
        buyInAverage ? `$${buyInAverage} typical buy-in` : ''
      ].filter(Boolean);

      return {
        id: interest.id,
        playerName: interest.playerName,
        interest,
        profile,
        confidence,
        reasons,
        source: 'interest' as const
      };
    });

  const connectedProfileCandidates = state.profiles
    .filter((profile) => !interestNames.has(profile.name.toLowerCase()))
    .map((profile) => {
      const connectedNames = profile.usualCompanions.filter((name) => inClubNames.has(name));
      const gameMatch = profile.preferredGameIds.includes(gameId) || profile.preferredStakes.includes(state.games.find((game) => game.id === gameId)?.name ?? '');
      const tagMatches = profile.preferredTags.filter((tag) =>
        state.sessions.some((session) => session.gameId === gameId && session.tags.includes(tag))
      );
      if (!connectedNames.length && !gameMatch) return null;
      const buyInAverage = profile.typicalBuyInMax > 0 ? Math.round((profile.typicalBuyInMin + profile.typicalBuyInMax) / 2) : 0;
      const confidence = (gameMatch ? 62 : 20) + connectedNames.length * 22 + tagMatches.length * 8 + Math.min(18, Math.round(buyInAverage / 100));
      return {
        id: `profile-${profile.id}`,
        playerName: profile.name,
        profile,
        confidence,
        reasons: [
          gameMatch ? 'game/stakes fit' : 'possible fit',
          tagMatches.length ? `fits ${tagMatches.join(', ')}` : '',
          connectedNames.length ? `connected to ${connectedNames.join(', ')}` : '',
          buyInAverage ? `$${buyInAverage} typical buy-in` : ''
        ].filter(Boolean),
        source: 'connected-profile' as const
      };
    })
    .filter((candidate): candidate is ParticipantCandidate => Boolean(candidate));

  return [...interestCandidates, ...connectedProfileCandidates]
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, seats);
}

function getLikelyParticipants(state: AppState) {
  const activePlayerNames = getInClubNames(state);

  return state.games
    .flatMap((game) => {
      const demand = getDemand(game, state.interests);
      return state.profiles
        .filter((profile) => !activePlayerNames.has(profile.name))
        .map((profile) => {
          const prefersGame = profile.preferredGameIds.includes(game.id) || profile.preferredStakes.includes(game.name);
          const tagMatches = profile.preferredTags.filter((tag) =>
            state.sessions.some((session) => session.gameId === game.id && session.tags.includes(tag))
          );
          const companionMatches = profile.usualCompanions.filter((name) => activePlayerNames.has(name));
          const buyInAverage =
            profile.typicalBuyInMax > 0 ? Math.round((profile.typicalBuyInMin + profile.typicalBuyInMax) / 2) : 0;
          const confidence =
            (prefersGame ? 55 : 8) +
            demand.totalDemand * 7 +
            companionMatches.length * 18 +
            tagMatches.length * 8 +
            Math.min(20, Math.round(buyInAverage / 100));
          const reason = [
            prefersGame ? `prefers ${game.name}` : `possible ${game.name}`,
            tagMatches.length ? `fits ${tagMatches.join(', ')}` : '',
            demand.totalDemand ? `${demand.totalDemand} already interested` : '',
            companionMatches.length ? `connected to ${companionMatches.join(', ')}` : '',
            demand.needs ? `needs ${demand.needs}` : 'table viable'
          ].filter(Boolean);

          return {
            id: `${profile.id}-${game.id}`,
            profile,
            game,
            confidence,
            reason,
            message: `${profile.name}, ${game.name} is close to forming. ${demand.totalDemand} players are already in or interested. Would you want a seat if it starts?`
          };
        });
    })
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 8);
}

function renderScriptTemplate(template: string, game: GameConfig, demand: ReturnType<typeof getDemand>) {
  return template
    .replaceAll('{game}', game.name)
    .replaceAll('{inRoom}', demand.inRoom.toString())
    .replaceAll('{coming}', demand.confirmed.toString())
    .replaceAll('{waiting}', (demand.interested + demand.waiting).toString())
    .replaceAll('{needs}', demand.needs.toString());
}

function getStaffScripts(state: AppState) {
  const gameScripts = state.games.flatMap((game) => {
    const demand = getDemand(game, state.interests);
    const running = getRunningSessions(state, game.id);
    const full = running.some((session) => session.seatsFilled >= session.maxSeats);
    const scripts = [{ label: `${game.name}: current demand`, text: renderScriptTemplate(state.scriptTemplates[0] ?? defaultScriptTemplates[0], game, demand) }];
    if (full && demand.flexibleDemand > 0) {
      scripts.push({
        label: `${game.name}: overflow`,
        text: renderScriptTemplate(state.scriptTemplates[1] ?? defaultScriptTemplates[1], game, demand)
      });
    }
    if (demand.needs > 0) {
      scripts.push({
        label: `${game.name}: needs more`,
        text: renderScriptTemplate(state.scriptTemplates[2] ?? defaultScriptTemplates[2], game, demand)
      });
    } else {
      scripts.push({
        label: `${game.name}: likely`,
        text: renderScriptTemplate(state.scriptTemplates[3] ?? defaultScriptTemplates[3], game, demand)
      });
    }
    return scripts;
  });
  return gameScripts.slice(0, 8);
}

function getOperationalOpportunities(state: AppState, analytics: ReturnType<typeof getAnalytics>) {
  const opportunities: string[] = [];
  if (analytics.failedStarts >= 2) {
    opportunities.push('Repeated failed starts: review arrival confirmation process.');
  }
  if (analytics.averageWaitMinutes >= 30 && analytics.conversionRate < 0.5) {
    opportunities.push('High wait with low conversion: reduce uncertainty for incoming players.');
  }
  if ((analytics.peakInterestedByGame?.count ?? 0) >= 8 && analytics.currentNight.gamesStarted <= 1) {
    opportunities.push('Strong demand with few starts: focus on second-table coordination.');
  }
  if (analytics.tableBreaks >= 2) {
    opportunities.push('Table breaks above normal: review late-night sustainability.');
  }
  if (!opportunities.length) {
    opportunities.push('No major operational flags yet. Keep tracking wait pressure and table starts.');
  }
  return opportunities;
}

function parseGroupMeMessages(text: string, games: GameConfig[]): GroupMeCandidate[] {
  const statusFromLine = (line: string): InterestStatus =>
    /on my way|coming|eta|be there/i.test(line)
      ? 'Confirmed Coming'
      : /here|arrived|in room|at the room/i.test(line)
        ? 'Arrived'
        : 'Interested';

  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const matchedGame =
        games.find((game) => line.toLowerCase().includes(game.name.toLowerCase())) ??
        games.find((game) => game.name.includes('1/2') && /\b1\s*\/\s*2\b|1-2/i.test(line)) ??
        games.find((game) => game.name.includes('2/5') && /\b2\s*\/\s*5\b|2-5/i.test(line)) ??
        games.find((game) => game.name.toLowerCase().includes('plo') && /plo/i.test(line));
      if (!matchedGame) return null;
      const nameMatch = line.match(/^([A-Za-z][A-Za-z .'-]{1,32})[:\-]/) ?? line.match(/\bfrom\s+([A-Za-z][A-Za-z .'-]{1,32})\b/i);
      const playerName = (nameMatch?.[1] ?? line.split(/\s+/)[0] ?? 'Unknown').trim();
      const confidence = /interested|play|seat|list|coming|eta|arrived|here|in/i.test(line) ? 82 : 62;
      return {
        id: uid(),
        playerName,
        gameId: matchedGame.id,
        status: statusFromLine(line),
        timestamp: nowIso(),
        confidence,
        sourceText: line
      };
    })
    .filter((candidate): candidate is GroupMeCandidate => Boolean(candidate));
}

function App() {
  const [state, setState] = useState<AppState>(() => loadState());
  const getRouteFromHash = (): AppRoute =>
    window.location.hash.includes('profiles')
      ? 'profiles'
      : window.location.hash.includes('summary')
        ? 'summary'
        : window.location.hash.includes('kpis')
          ? 'kpis'
        : window.location.hash.includes('customization') || window.location.hash.includes('settings')
          ? 'customization'
          : window.location.hash.includes('signals') || window.location.hash.includes('outreach')
            ? 'signals'
            : window.location.hash.includes('builder')
              ? 'builder'
              : 'floor';
  const [route, setRoute] = useState<AppRoute>(() => getRouteFromHash());
  const [form, setForm] = useState({
    playerName: '',
    gameId: 'nlh-1-2',
    status: 'Confirmed Coming' as InterestStatus,
    notes: ''
  });
  const [newProfile, setNewProfile] = useState({
    name: '',
    birthday: '',
    membershipStartDate: todayDate(),
    membershipExpirationDate: nextYearDate(),
    totalTimePlayedHours: 0,
    lastSessionTimePlayedHours: 0,
    commonlyPlaysWithProfileIds: [] as string[],
    preferredGameIds: ['nlh-1-2'],
    preferredGameId: 'nlh-1-2',
    preferredStakes: '',
    typicalBuyInMin: 200,
    typicalBuyInMax: 500,
    usualCompanions: '',
    typicalAvailability: '',
    willingnessToMove: true,
    preferredTags: [] as TableTag[],
    notes: ''
  });
  const [importText, setImportText] = useState('');
  const [summaryNotes, setSummaryNotes] = useState('');
  const [profileSearch, setProfileSearch] = useState('');
  const [groupMeText, setGroupMeText] = useState('');
  const [groupMeCandidates, setGroupMeCandidates] = useState<GroupMeCandidate[]>([]);
  const [staffFeedback, setStaffFeedback] = useState('');
  const [ownerFeedback, setOwnerFeedback] = useState('');
  const [pendingPilotAccess, setPendingPilotAccess] = useState<PilotAccess | null>(null);
  const [pilotKeyError, setPilotKeyError] = useState('');
  const [clubDraft, setClubDraft] = useState<ClubAccount>(() => state.settings.clubAccount ?? emptyClubAccount);
  const [undoStack, setUndoStack] = useState<AppState[]>([]);
  const [eventDrafts, setEventDrafts] = useState<Record<string, { failReason: string; failNote: string; breakReason: string; breakNote: string }>>({});
  const [tableSeatDrafts, setTableSeatDrafts] = useState<Record<string, string>>({});
  const [startPlayerDrafts, setStartPlayerDrafts] = useState<Record<string, string[]>>({});
  const [buyInDrafts, setBuyInDrafts] = useState<Record<string, { amount: string; note: string }>>({});
  const [customTimeDrafts, setCustomTimeDrafts] = useState<Record<string, string>>({});
  const [collapsedTables, setCollapsedTables] = useState<Record<string, boolean>>({});
  const [openPanels, setOpenPanels] = useState<Record<string, boolean>>({
    currentTables: true,
    waitlist: true,
    tableOverview: false,
    formingGames: false,
    kpis: false,
    quickAdd: false
  });
  const [overviewTableId, setOverviewTableId] = useState('');
  const [clockNow, setClockNow] = useState(() => Date.now());
  const [coordinationConfig, setCoordinationConfig] = useState({ gameId: 'nlh-1-2', seats: 10 });
  const analytics = useMemo(() => getAnalytics(state), [state]);
  const operationalOpportunities = useMemo(() => getOperationalOpportunities(state, analytics), [state, analytics]);
  const participantPool = useMemo(
    () => getParticipantPool(state, coordinationConfig.gameId, coordinationConfig.seats),
    [state, coordinationConfig]
  );
  const likelyParticipants = useMemo(() => getLikelyParticipants(state), [state]);
  const staffScripts = useMemo(() => getStaffScripts(state), [state]);
  const inClubInterests = useMemo(() => getInClubInterests(state), [state]);
  const overflowOpportunities = useMemo(() => getOverflowOpportunities(state), [state]);
  const balancePlans = useMemo(() => getBalancePlans(state), [state]);
  const recentProfiles = useMemo(() => {
    const recentNames = [...state.interests]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .map((interest) => interest.playerName.toLowerCase());
    return state.profiles
      .map((profile: { name: string; }) => ({
        profile,
        recentIndex: recentNames.indexOf(profile.name.toLowerCase()),
        count: state.interests.filter((interest: { playerName: string; }) => interest.playerName.toLowerCase() === profile.name.toLowerCase()).length
      }))
      .sort((a: { recentIndex: number; count: number; }, b: { recentIndex: number; count: number; }) => (a.recentIndex === -1 ? 999 : a.recentIndex) - (b.recentIndex === -1 ? 999 : b.recentIndex) || b.count - a.count)
      .slice(0, 4)
      .map((item: { profile: any; }) => item.profile);
  }, [state]);
  const filteredProfiles = useMemo(() => {
    const query = profileSearch.trim().toLowerCase();
    if (!query) return state.profiles;
    return state.profiles.filter((profile) =>
      [
        profile.name,
        profile.id,
        profile.preferredStakes,
        profile.typicalAvailability,
        profile.usualCompanions.join(' '),
        profile.commonlyPlaysWithProfileIds
          .map((id) => state.profiles.find((candidate) => candidate.id === id)?.name)
          .filter(Boolean)
          .join(' '),
        profile.notes
      ]
        .join(' ')
        .toLowerCase()
        .includes(query)
    );
  }, [state.profiles, profileSearch]);
  const duplicateProfiles = useMemo(() => {
    const groups = new Map<string, PlayerProfile[]>();
    state.profiles.forEach((profile: { name: any; id?: string; preferredGameIds?: string[]; preferredStakes?: string; typicalBuyInMin?: number; typicalBuyInMax?: number; willingnessToMove?: boolean; typicalAvailability?: string; usualCompanions?: string[]; preferredTags?: TableTag[]; notes?: string; }) => {
      const key = profile.name.trim().toLowerCase();
      groups.set(key, [...(groups.get(key) ?? []), profile]);
    });
    return [...groups.values()].filter((group) => group.length > 1);
  }, [state.profiles]);

  useEffect(() => {
    window.tableManagerDesktop?.loadState().then((record) => {
      if (record?.state) {
        const next = normalizeState(record.state);
        setUndoStack([]);
        setState(next);
        localStorage.setItem(storageKey, JSON.stringify(next));
      }
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('low-light', state.settings.lowLight);
    applyBrandTheme(state.settings.lowLight ? branding.theme.lowLight : branding.theme.default);
    document.title = branding.product.name;
  }, [state.settings.lowLight]);

  useEffect(() => {
    const timer = window.setInterval(() => setClockNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setClubDraft(state.settings.clubAccount ?? emptyClubAccount);
  }, [state.settings.clubAccount]);

  useEffect(() => {
    const syncState = (event: StorageEvent) => {
      if (event.key === storageKey) {
        setState(loadState());
      }
    };

    window.addEventListener('storage', syncState);
    return () => window.removeEventListener('storage', syncState);
  }, []);

  useEffect(() => {
    const syncRoute = () => {
      setRoute(getRouteFromHash());
    };

    window.addEventListener('hashchange', syncRoute);
    return () => window.removeEventListener('hashchange', syncRoute);
  }, []);

  const persist = (next: AppState, trackUndo = true) => {
    if (trackUndo) {
      setUndoStack((previous: any) => [state, ...previous].slice(0, 5));
    }
    setState(next);
    saveState(next);
  };

  const withCorrectionLog = (next: AppState, entity: string, field: string, note: string) => ({
    ...next,
    correctionLog: [
      {
        id: uid(),
        entity,
        field,
        note,
        timestamp: nowIso()
      },
      ...next.correctionLog
    ].slice(0, 50)
  });

  const undoLastAction = () => {
    const [previous, ...rest] = undoStack;
    if (!previous) return;
    setUndoStack(rest);
    setState(previous);
    saveState(previous);
  };

  const addInterest = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.playerName.trim()) return;
    const existingProfile = state.profiles.find(
      (profile: { name: string; }) => profile.name.toLowerCase() === form.playerName.trim().toLowerCase()
    );
    persist({
      ...state,
      interests: [
        {
          id: uid(),
          profileId: existingProfile?.id,
          playerName: form.playerName.trim(),
          gameId: form.gameId,
          status: form.status,
          notes: form.notes.trim(),
          timestamp: nowIso(),
          interestedAt: nowIso(),
          confirmedAt: form.status === 'Confirmed Coming' ? nowIso() : undefined,
          arrivedAt: form.status === 'Arrived' ? nowIso() : undefined,
          seatedAt: form.status === 'Seated' ? nowIso() : undefined
        },
        ...state.interests
      ]
    });
    setForm({ ...form, playerName: '', notes: '' });
  };

  const quickFillProfile = (profile: PlayerProfile) => {
    setForm({
      playerName: profile.name,
      gameId: profile.preferredGameIds[0] ?? form.gameId,
      status: 'Confirmed Coming',
      notes: profile.notes ? `Profile note: ${profile.notes}` : ''
    });
  };

  const updateInterest = (id: string, patch: Partial<Interest>) => {
    const timestampPatch =
      patch.status === 'Confirmed Coming'
        ? { confirmedAt: nowIso() }
        : patch.status === 'Arrived'
          ? { arrivedAt: nowIso() }
          : patch.status === 'Seated'
            ? { seatedAt: nowIso() }
            : patch.status && ['Declined', 'No-Show', 'Left Before Seated', 'Removed'].includes(patch.status)
              ? { closedAt: nowIso() }
              : {};
    persist({
      ...state,
      interests: state.interests.map((interest: { id: string; timestamp: any; manualEdits: any; }) =>
        interest.id === id
          ? {
              ...interest,
              ...patch,
              ...timestampPatch,
              timestamp: patch.status ? nowIso() : interest.timestamp,
              manualEdits: Object.keys(patch).reduce(
                (edits, key) => markManualEdit(edits, key),
                interest.manualEdits
              )
            }
          : interest
      )
    });
  };

  const updateInterestTimestamp = (id: string, key: 'interestedAt' | 'confirmedAt' | 'arrivedAt' | 'seatedAt' | 'closedAt', value: string) => {
    const nextValue = fromDateTimeInput(value);
    const interest = state.interests.find((item: { id: string; }) => item.id === id);
    persist(withCorrectionLog({
      ...state,
      interests: state.interests.map((item: { id: string; manualEdits: Record<string, string> | undefined; }) =>
        item.id === id ? { ...item, [key]: nextValue, manualEdits: markManualEdit(item.manualEdits, key) } : item
      ),
      playerSessions: state.playerSessions.map((session: { playerName: any; gameId: any; manualEdits: Record<string, string> | undefined; }) => {
        if (!interest || session.playerName !== interest.playerName || session.gameId !== interest.gameId) return session;
        if (key === 'seatedAt' && nextValue) return { ...session, seatedAt: nextValue, manualEdits: markManualEdit(session.manualEdits, 'seatedAt') };
        if (key === 'closedAt') return { ...session, leftAt: nextValue, manualEdits: markManualEdit(session.manualEdits, 'leftAt') };
        return session;
      })
    }, interest?.playerName ?? id, key, 'Timestamp corrected'));
  };

  const updatePlayerSession = (sessionId: string, patch: Partial<PlayerSession>, editKey: string) => {
    persist(withCorrectionLog({
      ...state,
      playerSessions: state.playerSessions.map((session: { id: string; manualEdits: Record<string, string> | undefined; }) =>
        session.id === sessionId ? { ...session, ...patch, manualEdits: markManualEdit(session.manualEdits, editKey) } : session
      )
    }, sessionId, editKey, 'Player session corrected'));
  };

  const setTableRakeMode = (sessionId: string, rakeMode: 'Time' | 'Drop') => {
    const timeRaked = rakeMode === 'Time';
    persist({
      ...state,
      sessions: state.sessions.map((session) => (session.id === sessionId ? { ...session, rakeMode, timeRaked } : session)),
      playerSessions: state.playerSessions.map((playerSession) =>
        playerSession.tableId === sessionId && !playerSession.leftAt
          ? { ...playerSession, timeRakeEnabled: timeRaked, lastTimeTickAt: playerSession.lastTimeTickAt ?? nowIso() }
          : playerSession
      )
    });
  };

  const addPlayerTime = (playerSession: PlayerSession, minutes: number) => {
    if (!minutes || minutes <= 0) return;
    const remaining = getTimeRemainingMinutes(playerSession);
    const timestamp = nowIso();
    persist({
      ...state,
      playerSessions: state.playerSessions.map((session) =>
        session.id === playerSession.id
          ? {
              ...session,
              timePurchasedMinutes: (session.timePurchasedMinutes ?? 0) + minutes,
              timeRemainingMinutes: remaining + minutes,
              lastTimeTickAt: timestamp,
              timeRakeEnabled: true
            }
          : session
      ),
      tableEvents: [
        ...state.tableEvents,
        {
          id: uid(),
          type: 'Merged',
          gameId: playerSession.gameId,
          tableId: playerSession.tableId,
          timestamp,
          playerCount: state.sessions.find((session) => session.id === playerSession.tableId)?.seatsFilled ?? 0,
          reason: 'time added',
          note: `${minutes} minutes added for ${playerSession.playerName}`
        }
      ]
    });
    setCustomTimeDrafts((drafts) => ({ ...drafts, [playerSession.id]: '' }));
  };

  const addBuyIn = (playerSession: PlayerSession, amountOverride?: number, noteOverride?: string) => {
    const draft = buyInDrafts[playerSession.id] ?? { amount: '', note: '' };
    const amount = amountOverride ?? Number(draft.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      window.alert('Enter a buy-in amount.');
      return;
    }
    persist({
      ...state,
      buyIns: [
        {
          id: uid(),
          profileId: playerSession.profileId,
          playerName: playerSession.playerName,
          tableId: playerSession.tableId,
          gameId: playerSession.gameId,
          amount,
          timestamp: nowIso(),
          note: noteOverride ?? draft.note.trim()
        },
        ...state.buyIns
      ]
    });
    setBuyInDrafts((drafts) => ({ ...drafts, [playerSession.id]: { amount: '', note: '' } }));
  };

  const deleteInterest = (id: string) => {
    if (!window.confirm('Remove this interest entry?')) return;
    persist({ ...state, interests: state.interests.filter((interest: { id: string; }) => interest.id !== id) });
  };

  const getSeatOptions = (gameId: string) =>
    state.interests.filter(
      (interest) =>
        interest.gameId === gameId &&
        !['Seated', 'Declined', 'No-Show', 'Left Before Seated', 'Removed'].includes(interest.status)
    );

  const seatInterestAtTable = (interest: Interest, tableId?: string) => {
    const table = tableId
      ? state.sessions.find((session: { id: string; status: string; }) => session.id === tableId && session.status !== 'Closed' && session.status !== 'Failed to Start')
      : state.sessions.find((session: { gameId: string; status: string; }) => session.gameId === interest.gameId && session.status !== 'Closed' && session.status !== 'Failed to Start');
    if (!table) {
      updateInterest(interest.id, { status: 'Seated' });
      return;
    }

    persist({
      ...state,
      interests: state.interests.map((item: { id: string; seatedAt: any; }) =>
        item.id === interest.id
          ? { ...item, status: 'Seated', seatedAt: item.seatedAt ?? nowIso(), timestamp: nowIso() }
          : item
      ),
      sessions: state.sessions.map((session: { id: any; maxSeats: number; seatsFilled: number; }) =>
        session.id === table.id ? { ...session, seatsFilled: Math.min(session.maxSeats, session.seatsFilled + 1) } : session
      ),
      playerSessions: [
        ...state.playerSessions,
        {
          id: uid(),
          playerName: interest.playerName,
          profileId: interest.profileId,
          gameId: interest.gameId,
          tableId: table.id,
          seatedAt: nowIso(),
          timePurchasedMinutes: 0,
          timeRemainingMinutes: 0,
          lastTimeTickAt: nowIso(),
          timeRakeEnabled: table.timeRaked ?? false
        }
      ]
    });
  };

  const seatInterest = (interest: Interest) => seatInterestAtTable(interest);

  const addSelectedPlayerToTable = (session: GameSession) => {
    const selectedInterestId = tableSeatDrafts[session.id];
    const selectedInterest = state.interests.find((interest) => interest.id === selectedInterestId);
    if (!selectedInterest) {
      window.alert('Select a player first.');
      return;
    }
    seatInterestAtTable(selectedInterest, session.id);
    setTableSeatDrafts((drafts) => ({ ...drafts, [session.id]: '' }));
  };

  const toggleStartPlayer = (sessionId: string, interestId: string) => {
    setStartPlayerDrafts((drafts) => {
      const current = drafts[sessionId] ?? [];
      return {
        ...drafts,
        [sessionId]: current.includes(interestId)
          ? current.filter((id) => id !== interestId)
          : [...current, interestId]
      };
    });
  };

  const startSessionWithPlayers = (session: GameSession) => {
    const selectedIds = startPlayerDrafts[session.id] ?? [];
    const selectedInterests = state.interests.filter((interest) => selectedIds.includes(interest.id));
    if (!selectedInterests.length) {
      window.alert('Select at least one player to start the table.');
      return;
    }
    const seatedAt = nowIso();
    persist({
      ...state,
      sessions: state.sessions.map((item) =>
        item.id === session.id
          ? { ...item, status: 'Running', seatsFilled: Math.min(session.maxSeats, selectedInterests.length), startedAt: seatedAt }
          : item
      ),
      interests: state.interests.map((interest) =>
        selectedInterests.some((selected) => selected.id === interest.id)
          ? { ...interest, status: 'Seated', seatedAt: interest.seatedAt ?? seatedAt, timestamp: seatedAt }
          : interest
      ),
      playerSessions: [
        ...state.playerSessions,
        ...selectedInterests.map((interest) => ({
          id: uid(),
          playerName: interest.playerName,
          profileId: interest.profileId,
          gameId: session.gameId,
          tableId: session.id,
          seatedAt,
          timePurchasedMinutes: 0,
          timeRemainingMinutes: 0,
          lastTimeTickAt: seatedAt,
          timeRakeEnabled: session.timeRaked ?? false
        }))
      ],
      tableEvents: [
        ...state.tableEvents,
        {
          id: uid(),
          type: 'Started' as TableEventType,
          gameId: session.gameId,
          tableId: session.id,
          timestamp: seatedAt,
          playerCount: selectedInterests.length,
          note: `Started with ${selectedInterests.map((interest) => interest.playerName).join(', ')}`
        }
      ]
    });
    setStartPlayerDrafts((drafts) => ({ ...drafts, [session.id]: [] }));
  };

  const movePlayerToTable = (playerSession: PlayerSession, targetTableId: string) => {
    if (playerSession.tableId === targetTableId) return;
    const sourceTable = state.sessions.find((session: { id: string; }) => session.id === playerSession.tableId);
    const targetTable = state.sessions.find((session: { id: string; }) => session.id === targetTableId);
    if (!targetTable) return;
    persist({
      ...state,
      sessions: state.sessions.map((session: { id: string; seatsFilled: number; maxSeats: number; }) =>
        session.id === playerSession.tableId
          ? { ...session, seatsFilled: Math.max(0, session.seatsFilled - 1) }
          : session.id === targetTableId
            ? { ...session, seatsFilled: Math.min(session.maxSeats, session.seatsFilled + 1) }
            : session
      ),
      playerSessions: state.playerSessions.map((session: { id: string; manualEdits: Record<string, string> | undefined; }) =>
        session.id === playerSession.id ? { ...session, tableId: targetTableId, manualEdits: markManualEdit(session.manualEdits, 'tableId') } : session
      ),
      tableEvents: [
        ...state.tableEvents,
        {
          id: uid(),
          type: 'Merged',
          gameId: targetTable.gameId,
          tableId: targetTable.id,
          timestamp: nowIso(),
          playerCount: targetTable.seatsFilled + 1,
          reason: 'player moved',
          note: `${playerSession.playerName} moved from ${sourceTable?.label ?? 'unknown table'} to ${targetTable.label}`
        }
      ]
    });
  };

  const markPlayerLeft = (interest: Interest) => {
    const openSession = state.playerSessions.find(
      (session: { playerName: string; gameId: string; leftAt: any; }) => session.playerName === interest.playerName && session.gameId === interest.gameId && !session.leftAt
    );

    persist({
      ...state,
      interests: state.interests.map((item: { id: string; }) =>
        item.id === interest.id ? { ...item, status: 'Removed', closedAt: nowIso(), timestamp: nowIso() } : item
      ),
      playerSessions: state.playerSessions.map((session: { id: any; }) =>
        session.id === openSession?.id ? { ...session, leftAt: nowIso() } : session
      )
    });
  };

  const markPlayerSessionLeft = (playerSession: PlayerSession) => {
    const leftAt = nowIso();
    const sessionHours = hoursBetween(playerSession.seatedAt, leftAt);
    persist({
      ...state,
      interests: state.interests.map((interest) => {
        const samePlayer = playerSession.profileId
          ? interest.profileId === playerSession.profileId
          : interest.playerName.toLowerCase() === playerSession.playerName.toLowerCase() && interest.gameId === playerSession.gameId;
        return samePlayer && interest.status === 'Seated'
          ? { ...interest, status: 'Removed', closedAt: leftAt, timestamp: leftAt }
          : interest;
      }),
      sessions: state.sessions.map((session) =>
        session.id === playerSession.tableId
          ? { ...session, seatsFilled: Math.max(0, session.seatsFilled - 1) }
          : session
      ),
      playerSessions: state.playerSessions.map((session) =>
        session.id === playerSession.id ? { ...session, leftAt, manualEdits: markManualEdit(session.manualEdits, 'leftAt') } : session
      ),
      profiles: state.profiles.map((profile) =>
        profile.id === playerSession.profileId ||
        (!playerSession.profileId && profile.name.toLowerCase() === playerSession.playerName.toLowerCase())
          ? {
              ...profile,
              totalTimePlayedHours: (profile.totalTimePlayedHours ?? 0) + sessionHours,
              lastSessionTimePlayedHours: sessionHours
            }
          : profile
      )
    });
  };

  const addSession = (gameId: string) => {
    const game = state.games.find((item: { id: string; }) => item.id === gameId);
    if (!game) return;
    const currentCount = state.sessions.filter((session: { gameId: string; status: string; }) => session.gameId === gameId && session.status !== 'Closed').length;
    persist({
      ...state,
      sessions: [
        ...state.sessions,
        {
          id: uid(),
          gameId,
          label: currentCount ? `Table ${currentCount + 1}` : 'Main Table',
          status: 'Forming',
          seatsFilled: 0,
          maxSeats: game.maxSeats,
          timeRaked: state.settings.defaultRakeMode === 'Time',
          rakeMode: state.settings.defaultRakeMode,
          tags: [],
          startedAt: nowIso()
        }
      ],
      tableEvents: [
        ...state.tableEvents,
        {
          id: uid(),
          type: 'Created',
          gameId,
          timestamp: nowIso(),
          playerCount: 0,
          note: 'Table forming'
        }
      ]
    });
  };

  const addPlannedSession = () => {
    const game = state.games.find((item: { id: any; }) => item.id === coordinationConfig.gameId);
    if (!game || participantPool.length === 0) return;
    const currentCount = state.sessions.filter((session: { gameId: any; status: string; }) => session.gameId === game.id && session.status !== 'Closed').length;
    const newInterests = participantPool
      .filter((candidate: { interest: any; }) => !candidate.interest)
      .map((candidate: { profile: { id: any; }; playerName: any; }) => ({
        id: uid(),
        profileId: candidate.profile?.id,
        playerName: candidate.playerName,
        gameId: game.id,
        status: 'Interested' as InterestStatus,
        notes: 'Connected participant',
        timestamp: nowIso(),
        interestedAt: nowIso()
      }));
    persist({
      ...state,
      interests: [...newInterests, ...state.interests],
      sessions: [
        ...state.sessions,
        {
          id: uid(),
          gameId: game.id,
          label: currentCount ? `Coordinated Table ${currentCount + 1}` : 'Coordinated Table',
          status: 'Forming',
          seatsFilled: participantPool.length,
          maxSeats: game.maxSeats,
          timeRaked: state.settings.defaultRakeMode === 'Time',
          rakeMode: state.settings.defaultRakeMode,
          plannedPlayerIds: [
            ...participantPool.filter((candidate: { interest: any; }) => candidate.interest).map((candidate: { interest: any; }) => candidate.interest!.id),
            ...newInterests.map((interest: { id: any; }) => interest.id)
          ],
          tags: [],
          startedAt: nowIso()
        }
      ],
      tableEvents: [
        ...state.tableEvents,
        {
          id: uid(),
          type: 'Created',
          gameId: game.id,
          timestamp: nowIso(),
          playerCount: participantPool.length,
          note: 'Staff-created planned table'
        }
      ]
    });
  };

  const createBalancedTable = (plan: BalancePlan) => {
    const currentCount = state.sessions.filter((session: { gameId: string; status: string; }) => session.gameId === plan.game.id && session.status !== 'Closed').length;
    persist({
      ...state,
      sessions: [
        ...state.sessions.map((session: { id: string; plannedPlayerIds: any; }) =>
          session.id === plan.fromTable.id
            ? {
                ...session,
                seatsFilled: plan.tableASeatsAfterMove,
                plannedPlayerIds: (session.plannedPlayerIds ?? []).filter(
                  (id: string | undefined) => !plan.moveCandidates.some((candidate) => candidate.interest?.id === id)
                )
              }
            : session
        ),
        {
          id: uid(),
          gameId: plan.game.id,
          label: `Balanced Table ${currentCount + 1}`,
          status: 'Forming',
          seatsFilled: plan.tableBProjectedSeats,
          maxSeats: plan.game.maxSeats,
          timeRaked: plan.fromTable.timeRaked ?? false,
          rakeMode: plan.fromTable.rakeMode ?? (plan.fromTable.timeRaked ? 'Time' : 'Drop'),
          plannedPlayerIds: plan.moveCandidates.map((candidate) => candidate.interest!.id),
          tags: [],
          startedAt: nowIso()
        }
      ],
      tableEvents: [
        ...state.tableEvents,
        {
          id: uid(),
          type: 'Created',
          gameId: plan.game.id,
          tableId: plan.fromTable.id,
          timestamp: nowIso(),
          playerCount: plan.tableBProjectedSeats,
          note: `Table B created from Table A balance option: ${plan.moveCandidates.map((candidate) => candidate.playerName).join(', ')}`
        }
      ]
    });
  };

  const updateSession = (id: string, patch: Partial<GameSession>) => {
    const current = state.sessions.find((session: { id: string; }) => session.id === id);
    const eventType: TableEventType | undefined =
      patch.status === 'Running'
        ? 'Started'
        : patch.status === 'Closed'
          ? current?.status === 'Forming'
            ? 'Failed to Start'
            : 'Closed'
          : undefined;
    persist({
      ...state,
      sessions: state.sessions.map((session: { id: string; endedAt: any; manualEdits: any; }) => {
        if (session.id !== id) return session;
        const closed = patch.status === 'Closed' && !session.endedAt;
        return {
          ...session,
          ...patch,
          endedAt: closed ? nowIso() : patch.status === 'Running' ? undefined : session.endedAt,
          manualEdits: Object.keys(patch).reduce((edits, key) => markManualEdit(edits, key), session.manualEdits)
        };
      }),
      tableEvents:
        eventType && current
          ? [
              ...state.tableEvents,
              {
                id: uid(),
                type: eventType,
                gameId: current.gameId,
                tableId: current.id,
                timestamp: nowIso(),
                playerCount: current.seatsFilled,
                note: ''
              }
            ]
          : state.tableEvents
    });
  };

  const updateSessionTimestamp = (id: string, key: 'startedAt' | 'endedAt', value: string) => {
    const nextValue = fromDateTimeInput(value);
    persist(withCorrectionLog({
      ...state,
      sessions: state.sessions.map((session: { id: string; manualEdits: Record<string, string> | undefined; }) =>
        session.id === id ? { ...session, [key]: nextValue, manualEdits: markManualEdit(session.manualEdits, key) } : session
      )
    }, id, key, 'Table timestamp corrected'));
  };

  const recordTableEvent = (session: GameSession, type: TableEventType, reason: string, note = '') => {
    persist({
      ...state,
      sessions: state.sessions.map((item: { id: string; status: any; endedAt: any; }) =>
        item.id === session.id
          ? {
              ...item,
              status: type === 'Started' ? 'Running' : type === 'Failed to Start' ? 'Failed to Start' : type === 'Broke' || type === 'Closed' ? 'Closed' : item.status,
              endedAt:
                type === 'Failed to Start' || type === 'Broke' || type === 'Closed'
                  ? item.endedAt ?? nowIso()
                  : item.endedAt
            }
          : item
      ),
      playerSessions:
        type === 'Broke' || type === 'Closed'
          ? state.playerSessions.map((playerSession: { tableId: string; leftAt: any; }) =>
              playerSession.tableId === session.id && !playerSession.leftAt
                ? { ...playerSession, leftAt: nowIso() }
                : playerSession
            )
          : state.playerSessions,
      tableEvents: [
        ...state.tableEvents,
        {
          id: uid(),
          type,
          gameId: session.gameId,
          tableId: session.id,
          timestamp: nowIso(),
          playerCount: session.seatsFilled,
          reason,
          note
        }
      ]
    });
  };

  const failFormingGame = (session: GameSession) => {
    const draft = eventDrafts[session.id];
    recordTableEvent(session, 'Failed to Start', draft?.failReason || failedStartReasons[0], draft?.failNote ?? '');
  };

  const changeSeatCount = (session: GameSession, delta: number) => {
    updateSession(session.id, {
      seatsFilled: Math.min(session.maxSeats, Math.max(0, session.seatsFilled + delta))
    });
  };

  const addProfile = (event: React.FormEvent) => {
    event.preventDefault();
    if (!newProfile.name.trim()) return;
    const preferredGame = state.games.find((game) => game.id === newProfile.preferredGameId);
    persist({
      ...state,
      profiles: [
        ...state.profiles,
        {
          id: memberId(),
          name: newProfile.name.trim(),
          birthday: newProfile.birthday,
          membershipStartDate: newProfile.membershipStartDate,
          membershipExpirationDate: newProfile.membershipExpirationDate,
          totalTimePlayedHours: newProfile.totalTimePlayedHours,
          lastSessionTimePlayedHours: newProfile.lastSessionTimePlayedHours,
          commonlyPlaysWithProfileIds: newProfile.commonlyPlaysWithProfileIds,
          preferredGameId: newProfile.preferredGameId,
          preferredGameIds: [newProfile.preferredGameId],
          preferredStakes:
            newProfile.preferredStakes.trim() ||
            preferredGame?.name ||
            '',
          typicalBuyInMin: newProfile.typicalBuyInMin,
          typicalBuyInMax: newProfile.typicalBuyInMax,
          willingnessToMove: newProfile.willingnessToMove,
          typicalAvailability: newProfile.typicalAvailability.trim(),
          preferredTags: newProfile.preferredTags,
          usualCompanions: newProfile.usualCompanions
            .split(',')
            .map((name: string) => name.trim())
            .filter(Boolean),
          notes: newProfile.notes.trim()
        }
      ]
    });
    setNewProfile({
      name: '',
      birthday: '',
      membershipStartDate: todayDate(),
      membershipExpirationDate: nextYearDate(),
      totalTimePlayedHours: 0,
      lastSessionTimePlayedHours: 0,
      commonlyPlaysWithProfileIds: [],
      preferredGameIds: ['nlh-1-2'],
      preferredGameId: 'nlh-1-2',
      preferredStakes: '',
      typicalBuyInMin: 200,
      typicalBuyInMax: 500,
      usualCompanions: '',
      typicalAvailability: '',
      willingnessToMove: true,
      preferredTags: [],
      notes: ''
    });
  };

  const deleteProfile = (id: string) => {
    if (!window.confirm('Remove this profile? Existing sessions and interest entries will keep the player name.')) return;
    persist({
      ...state,
      profiles: state.profiles.filter((profile: { id: string; }) => profile.id !== id),
      interests: state.interests.map((interest: { profileId: string; }) =>
        interest.profileId === id ? { ...interest, profileId: undefined } : interest
      )
    });
  };

  const updateScriptTemplate = (index: number, value: string) => {
    persist({
      ...state,
      scriptTemplates: state.scriptTemplates.map((template: any, templateIndex: number) => (templateIndex === index ? value : template))
    });
  };

  const addFeedback = (role: 'Staff' | 'Owner', text: string) => {
    if (!text.trim()) return;
    persist({
      ...state,
      feedback: [
        {
          id: uid(),
          role,
          text: text.trim(),
          createdAt: nowIso()
        },
        ...state.feedback
      ]
    });
    if (role === 'Staff') setStaffFeedback('');
    if (role === 'Owner') setOwnerFeedback('');
  };

  const exportPilotReport = () => {
    const rows = [
      [branding.product.pilotReportName, new Date().toISOString()],
      ['Occupied seat-hours', analytics.currentNight.occupiedSeatHours.toFixed(1)],
      ['Average wait', `${analytics.averageWaitMinutes.toFixed(0)}m`],
      ['Waitlist conversion', `${(analytics.conversionRate * 100).toFixed(0)}%`],
      ['Games started', analytics.currentNight.gamesStarted.toString()],
      ['Table breaks', analytics.tableBreaks.toString()],
      ['Failed starts', analytics.failedStarts.toString()],
      ['Feedback count', state.feedback.length.toString()],
      ...state.feedback.map((entry: { role: any; text: any; }) => [`${entry.role} feedback`, entry.text])
    ];
    const csv = rows.map((row) => row.map((cell: string) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `table-manager-pilot-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const mergeDuplicateProfiles = (profilesToMerge: PlayerProfile[]) => {
    const [primary, ...duplicates] = profilesToMerge;
    if (!primary) return;
    const duplicateIds = new Set(duplicates.map((profile) => profile.id));
    const merged: PlayerProfile = {
      ...primary,
      birthday: primary.birthday || profilesToMerge.find((profile) => profile.birthday)?.birthday || '',
      membershipStartDate:
        profilesToMerge
          .map((profile) => profile.membershipStartDate)
          .filter(Boolean)
          .sort()[0] ?? primary.membershipStartDate,
      membershipExpirationDate:
        profilesToMerge
          .map((profile) => profile.membershipExpirationDate)
          .filter(Boolean)
          .sort()
          .at(-1) ?? primary.membershipExpirationDate,
      totalTimePlayedHours: profilesToMerge.reduce((sum, profile) => sum + (profile.totalTimePlayedHours ?? 0), 0),
      lastSessionTimePlayedHours: Math.max(...profilesToMerge.map((profile) => profile.lastSessionTimePlayedHours ?? 0)),
      commonlyPlaysWithProfileIds: Array.from(
        new Set(profilesToMerge.flatMap((profile) => profile.commonlyPlaysWithProfileIds ?? []).filter((id) => id !== primary.id && !duplicateIds.has(id)))
      ),
      preferredGameId: primary.preferredGameId || profilesToMerge.find((profile) => profile.preferredGameId)?.preferredGameId || primary.preferredGameIds[0],
      preferredGameIds: Array.from(new Set(profilesToMerge.flatMap((profile) => profile.preferredGameIds))),
      preferredStakes: Array.from(
        new Set(profilesToMerge.flatMap((profile) => profile.preferredStakes.split(',').map((item) => item.trim()).filter(Boolean)))
      ).join(', '),
      typicalBuyInMin: Math.min(...profilesToMerge.map((profile) => profile.typicalBuyInMin || primary.typicalBuyInMin)),
      typicalBuyInMax: Math.max(...profilesToMerge.map((profile) => profile.typicalBuyInMax || primary.typicalBuyInMax)),
      willingnessToMove: profilesToMerge.some((profile) => profile.willingnessToMove),
      typicalAvailability: Array.from(new Set(profilesToMerge.map((profile) => profile.typicalAvailability).filter(Boolean))).join(', '),
      usualCompanions: Array.from(new Set(profilesToMerge.flatMap((profile) => profile.usualCompanions))),
      preferredTags: Array.from(new Set(profilesToMerge.flatMap((profile) => profile.preferredTags))),
      notes: Array.from(new Set(profilesToMerge.map((profile) => profile.notes).filter(Boolean))).join(' | ')
    };

    persist({
      ...state,
      profiles: state.profiles.map((profile: { id: string; }) => (profile.id === primary.id ? merged : profile)).filter((profile: { id: string; }) => !duplicateIds.has(profile.id)),
      interests: state.interests.map((interest: { profileId: string; }) =>
        interest.profileId && duplicateIds.has(interest.profileId) ? { ...interest, profileId: primary.id } : interest
      ),
      playerSessions: state.playerSessions.map((session: { profileId: string; }) =>
        session.profileId && duplicateIds.has(session.profileId) ? { ...session, profileId: primary.id } : session
      )
    });
  };

  const addProfileToClub = (profile: PlayerProfile) => {
    const existingInterest = state.interests.find(
      (interest: { profileId: string; playerName: string; }) => interest.profileId === profile.id || interest.playerName.toLowerCase() === profile.name.toLowerCase()
    );
    const preferredGameId = profile.preferredGameIds[0] ?? state.games[0]?.id ?? 'nlh-1-2';

    if (existingInterest) {
      updateInterest(existingInterest.id, {
        status: 'Arrived',
        gameId: existingInterest.gameId || preferredGameId,
        profileId: profile.id
      });
      return;
    }

    persist({
      ...state,
      interests: [
        {
          id: uid(),
          profileId: profile.id,
          playerName: profile.name,
          gameId: preferredGameId,
          status: 'Arrived',
          timestamp: nowIso(),
          interestedAt: nowIso(),
          arrivedAt: nowIso(),
          notes: 'In club'
        },
        ...state.interests
      ]
    });
  };

  const removeProfileFromClub = (profile: PlayerProfile) => {
    persist({
      ...state,
      interests: state.interests.filter(
        (interest: { status: string; profileId: string; playerName: string; }) =>
          !(
            interest.status === 'Arrived' &&
            (interest.profileId === profile.id || interest.playerName.toLowerCase() === profile.name.toLowerCase())
          )
      )
    });
  };

  const importProfiles = () => {
    const raw = importText.trim();
    if (!raw) return;

    let imported: PlayerProfile[] = [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        imported = parsed
          .filter((item) => item?.name)
          .map((item) => {
            const preferredGameId = String(item.preferredGameId ?? item.preferredGameIds?.[0] ?? state.games[0]?.id ?? 'nlh-1-2');
            const companionNames = Array.isArray(item.usualCompanions)
              ? item.usualCompanions.map(String)
              : String(item.usualCompanions ?? item.commonlyPlaysWith ?? item.companions ?? '')
                  .split(/[|;]/)
                  .map((name) => name.trim())
                  .filter(Boolean);
            return {
            id: String(item.id ?? memberId()),
            name: String(item.name).trim(),
            birthday: String(item.birthday ?? ''),
            membershipStartDate: String(item.membershipStartDate ?? item.memberSince ?? todayDate()),
            membershipExpirationDate: String(item.membershipExpirationDate ?? item.expiresAt ?? nextYearDate()),
            totalTimePlayedHours: Number(item.totalTimePlayedHours ?? item.totalTimePlayed ?? 0),
            lastSessionTimePlayedHours: Number(item.lastSessionTimePlayedHours ?? item.lastSessionTimePlayed ?? 0),
            commonlyPlaysWithProfileIds: Array.isArray(item.commonlyPlaysWithProfileIds) ? item.commonlyPlaysWithProfileIds.map(String) : [],
            preferredGameId,
            preferredGameIds: Array.isArray(item.preferredGameIds) ? item.preferredGameIds : [preferredGameId],
            preferredStakes: String(item.preferredStakes ?? item.stakes ?? state.games.find((game) => game.id === preferredGameId)?.name ?? ''),
            typicalBuyInMin: Number(item.typicalBuyInMin ?? item.buyInMin ?? 0),
            typicalBuyInMax: Number(item.typicalBuyInMax ?? item.buyInMax ?? 0),
            willingnessToMove: Boolean(item.willingnessToMove ?? item.moveTables ?? false),
            typicalAvailability: String(item.typicalAvailability ?? item.availability ?? ''),
            preferredTags: Array.isArray(item.preferredTags) ? item.preferredTags : [],
            usualCompanions: companionNames,
            notes: String(item.notes ?? '')
          };
          });
      }
    } catch {
      imported = raw
        .split(/\r?\n/)
        .map((line: string) => line.trim())
        .filter(Boolean)
        .map((line: { split: (arg0: string) => { (): any; new(): any; map: { (arg0: (part: any) => any): [any, ("" | undefined)?, ("0" | undefined)?, ("0" | undefined)?, ("" | undefined)?, ("" | undefined)?, ("yes" | undefined)?]; new(): any; }; }; }) => {
          const [name, preferredStakes = '', birthday = '', membershipStart = todayDate(), membershipExpiration = nextYearDate(), companions = '', availability = '', moveTables = 'yes'] = line.split(',').map((part: string) => part.trim());
          const matchingGame = state.games.find((game: { name: any; }) => preferredStakes.includes(game.name));
          const preferredGameId = matchingGame?.id ?? state.games[0]?.id ?? 'nlh-1-2';
          return {
            id: memberId(),
            name,
            birthday,
            membershipStartDate: membershipStart || todayDate(),
            membershipExpirationDate: membershipExpiration || nextYearDate(),
            totalTimePlayedHours: 0,
            lastSessionTimePlayedHours: 0,
            commonlyPlaysWithProfileIds: [],
            preferredGameId,
            preferredGameIds: [preferredGameId],
            preferredStakes,
            typicalBuyInMin: 0,
            typicalBuyInMax: 0,
            willingnessToMove: !['no', 'false', 'n'].includes(moveTables.toLowerCase()),
            typicalAvailability: availability,
            preferredTags: [],
            usualCompanions: companions
              .split(/[|;]/)
              .map((companion: string) => companion.trim())
              .filter(Boolean),
            notes: ''
          };
        })
        .filter((profile: { name: any; }) => profile.name);
    }

    if (!imported.length) return;
    const existingNames = new Set(state.profiles.map((profile: { name: string; }) => profile.name.toLowerCase()));
    const uniqueImports = imported.filter((profile) => !existingNames.has(profile.name.toLowerCase()));
    const allProfiles = [...state.profiles, ...uniqueImports];
    const enrichedImports = uniqueImports.map((profile) => ({
      ...profile,
      commonlyPlaysWithProfileIds: profile.commonlyPlaysWithProfileIds.length
        ? profile.commonlyPlaysWithProfileIds
        : profile.usualCompanions
            .map((name) => allProfiles.find((candidate) => candidate.name.toLowerCase() === name.toLowerCase())?.id)
            .filter((id): id is string => Boolean(id))
    }));
    persist({ ...state, profiles: [...state.profiles, ...enrichedImports] });
    setImportText('');
  };

  const archiveNight = () => {
    if (!window.confirm('Close and archive this night?')) return;
    persist({
      ...state,
      history: [...state.history, { ...analytics.currentNight, id: uid(), notes: summaryNotes.trim() }],
      interests: [],
      sessions: state.sessions.map((session: { endedAt: any; }) => ({ ...session, status: 'Closed', endedAt: session.endedAt ?? nowIso() })),
      playerSessions: state.playerSessions.map((session: { leftAt: any; }) => ({ ...session, leftAt: session.leftAt ?? nowIso() })),
      tableEvents: [
        ...state.tableEvents,
        ...state.sessions
          .filter((session: { status: string; }) => session.status !== 'Closed')
          .map((session: { gameId: any; id: any; seatsFilled: any; }) => ({
            id: uid(),
            type: 'Closed' as TableEventType,
            gameId: session.gameId,
            tableId: session.id,
            timestamp: nowIso(),
            playerCount: session.seatsFilled,
            note: summaryNotes.trim() || 'Night archived'
          }))
      ]
    });
    setSummaryNotes('');
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `table-manager-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportCsv = () => {
    const rows = [
      ['Metric', 'Value'],
      ['Occupied seat-hours', analytics.currentNight.occupiedSeatHours.toFixed(2)],
      ['Average seat-hours/player', analytics.averageSeatHoursPerPlayer.toFixed(2)],
      ['Average wait minutes', analytics.averageWaitMinutes.toFixed(0)],
      ['Waitlist conversion', `${(analytics.conversionRate * 100).toFixed(0)}%`],
      ['Games started', analytics.currentNight.gamesStarted.toString()],
      ['Failed starts', analytics.failedStarts.toString()],
      ['Table breaks', analytics.tableBreaks.toString()],
      ['Peak active tables', analytics.peakActiveTables.toString()],
      ['Median wait minutes', analytics.medianWaitMinutes.toFixed(0)],
      ['Confirmed to arrived', `${(analytics.confirmedArrivalRate * 100).toFixed(0)}%`],
      ['Waitlist abandonment', analytics.waitlistAbandonmentCount.toString()],
      ['Lost seat-hour estimate', analytics.lostSeatHourEstimate.toFixed(1)],
      ...analytics.waitByGame.map((item: { game: any; count: any; averageMinutes: number; }) => [`Wait by game - ${item.game}`, item.count ? `${item.averageMinutes.toFixed(0)} minutes` : 'No seated waits']),
      ...state.tableEvents
        .filter((event: { type: string; }) => event.type === 'Failed to Start' || event.type === 'Broke')
        .map((event: { type: any; reason: any; note: any; }) => [`${event.type} reason`, `${event.reason || 'Unspecified'}${event.note ? ` - ${event.note}` : ''}`])
    ];
    const csv = rows.map((row) => row.map((cell: string) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `table-manager-summary-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const scanGroupMeText = () => {
    setGroupMeCandidates(parseGroupMeMessages(groupMeText, state.games));
  };

  const acceptGroupMeCandidate = (candidate: GroupMeCandidate) => {
    const existingProfile = state.profiles.find((profile: { name: string; }) => profile.name.toLowerCase() === candidate.playerName.toLowerCase());
    persist({
      ...state,
      interests: [
        {
          id: uid(),
          profileId: existingProfile?.id,
          playerName: candidate.playerName,
          gameId: candidate.gameId,
          status: candidate.status,
          timestamp: candidate.timestamp,
          interestedAt: candidate.timestamp,
          confirmedAt: candidate.status === 'Confirmed Coming' ? candidate.timestamp : undefined,
          arrivedAt: candidate.status === 'Arrived' ? candidate.timestamp : undefined,
          notes: `GroupMe/pasted: ${candidate.sourceText}`
        },
        ...state.interests
      ]
    });
    setGroupMeCandidates((candidates: any[]) => candidates.filter((item: { id: string; }) => item.id !== candidate.id));
  };

  const rejectGroupMeCandidate = (id: string) => {
    setGroupMeCandidates((candidates: any[]) => candidates.filter((item: { id: string; }) => item.id !== id));
  };

  const copyMessage = (message: string) => {
    navigator.clipboard?.writeText(message).catch(() => undefined);
  };

  const openRoute = (target: Exclude<AppRoute, 'floor'>) => {
    window.location.hash = `/${target}`;
  };

  const closeRoute = () => {
    window.location.hash = '/floor';
  };

  const updateSettings = (patch: Partial<AppState['settings']>) => {
    persist({ ...state, settings: { ...state.settings, ...patch } });
  };

  const loadPilotKeyFile = async (file?: File) => {
    setPilotKeyError('');
    setPendingPilotAccess(null);
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const result = await validatePilotKey(parsed, file.name);
      if (result.error || !result.access) {
        setPilotKeyError(result.error ?? 'Unable to validate this key file.');
        return;
      }
      setPendingPilotAccess(result.access);
    } catch {
      setPilotKeyError('Key file must be valid JSON.');
    }
  };

  const activatePilotAccess = (event: React.FormEvent) => {
    event.preventDefault();
    if (!pendingPilotAccess) {
      setPilotKeyError('Load a valid key file first.');
      return;
    }
    if (!clubDraft.clubName.trim() || !clubDraft.accountName.trim() || !clubDraft.contactName.trim() || !clubDraft.email.trim()) {
      setPilotKeyError('Club name, account name, contact name, and email are required.');
      return;
    }
    persist({
      ...state,
      settings: {
        ...state.settings,
        pilotAccess: pendingPilotAccess,
        clubAccount: {
          ...clubDraft,
          clubName: clubDraft.clubName.trim(),
          accountName: clubDraft.accountName.trim(),
          contactName: clubDraft.contactName.trim(),
          email: clubDraft.email.trim(),
          phone: clubDraft.phone.trim(),
          address: clubDraft.address.trim()
        }
      }
    });
    window.location.hash = '/floor';
  };

  const applyReplacementPilotKey = async (file?: File) => {
    setPilotKeyError('');
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const result = await validatePilotKey(parsed, file.name);
      if (result.error || !result.access) {
        setPilotKeyError(result.error ?? 'Unable to validate this key file.');
        return;
      }
      updateSettings({ pilotAccess: result.access });
    } catch {
      setPilotKeyError('Key file must be valid JSON.');
    }
  };

  const saveClubAccount = (event: React.FormEvent) => {
    event.preventDefault();
    if (!clubDraft.clubName.trim() || !clubDraft.accountName.trim() || !clubDraft.contactName.trim() || !clubDraft.email.trim()) {
      setPilotKeyError('Club name, account name, contact name, and email are required.');
      return;
    }
    setPilotKeyError('');
    updateSettings({
      clubAccount: {
        ...clubDraft,
        clubName: clubDraft.clubName.trim(),
        accountName: clubDraft.accountName.trim(),
        contactName: clubDraft.contactName.trim(),
        email: clubDraft.email.trim(),
        phone: clubDraft.phone.trim(),
        address: clubDraft.address.trim()
      }
    });
  };

  const togglePanel = (panelId: string) => {
    setOpenPanels((panels) => ({ ...panels, [panelId]: !panels[panelId] }));
  };

  const applyDefaultRakeToActiveTables = () => {
    const rakeMode = state.settings.defaultRakeMode;
    const timeRaked = rakeMode === 'Time';
    persist({
      ...state,
      sessions: state.sessions.map((session) =>
        session.status !== 'Closed' && session.status !== 'Failed to Start'
          ? { ...session, rakeMode, timeRaked }
          : session
      ),
      playerSessions: state.playerSessions.map((playerSession) =>
        !playerSession.leftAt
          ? { ...playerSession, timeRakeEnabled: timeRaked, lastTimeTickAt: playerSession.lastTimeTickAt ?? nowIso() }
          : playerSession
      )
    });
  };

  if (!isPilotAccessActive(state.settings.pilotAccess)) {
    return (
      <main className="access-shell">
        <section className="access-card">
          <div className="access-brand">
            <div className="access-icon">
              <LockKeyhole size={28} />
            </div>
            <div>
              <div className="eyebrow">Pilot access</div>
              <h1>{branding.product.name}</h1>
              <p>Load your pilot key file, then register the club account that will use this installation.</p>
            </div>
          </div>

          <div className="access-grid">
            <section className="access-step">
              <div className="access-step-title">
                <KeyRound size={20} />
                <h2>Key File</h2>
              </div>
              <label className="key-file-drop">
                <input
                  type="file"
                  accept="application/json,.json,.key"
                  onChange={(event) => loadPilotKeyFile(event.target.files?.[0])}
                />
                <span>{pendingPilotAccess?.keyFileName ?? 'Choose key file'}</span>
                <small>Expected JSON fields: authorizationCode and expiresAt.</small>
              </label>
              {pendingPilotAccess ? (
                <div className="access-valid">
                  <strong>Valid through {pendingPilotAccess.expiresAt}</strong>
                  <span>{pendingPilotAccess.authorizationCode}</span>
                </div>
              ) : null}
              {pilotKeyError ? <p className="access-error">{pilotKeyError}</p> : null}
            </section>

            <form className="access-step account-form" onSubmit={activatePilotAccess}>
              <div className="access-step-title">
                <Users size={20} />
                <h2>Club Account</h2>
              </div>
              <input
                value={clubDraft.clubName}
                onChange={(event) => setClubDraft({ ...clubDraft, clubName: event.target.value })}
                placeholder="Club name"
              />
              <input
                value={clubDraft.accountName}
                onChange={(event) => setClubDraft({ ...clubDraft, accountName: event.target.value })}
                placeholder="Account name"
              />
              <input
                value={clubDraft.contactName}
                onChange={(event) => setClubDraft({ ...clubDraft, contactName: event.target.value })}
                placeholder="Primary contact"
              />
              <input
                type="email"
                value={clubDraft.email}
                onChange={(event) => setClubDraft({ ...clubDraft, email: event.target.value })}
                placeholder="Email"
              />
              <input
                value={clubDraft.phone}
                onChange={(event) => setClubDraft({ ...clubDraft, phone: event.target.value })}
                placeholder="Phone"
              />
              <input
                value={clubDraft.address}
                onChange={(event) => setClubDraft({ ...clubDraft, address: event.target.value })}
                placeholder="Club address"
              />
              <button className="primary-button" type="submit" disabled={!pendingPilotAccess}>
                Unlock Dashboard
              </button>
            </form>
          </div>
        </section>
      </main>
    );
  }

  if (route === 'customization') {
    return (
      <main className="app-shell compact-shell">
        <header className="topbar">
          <div>
            <div className="eyebrow">Room preferences</div>
            <h1>Customization</h1>
          </div>
          <button className="ghost-button" onClick={closeRoute}>
            <X size={18} />
            Close
          </button>
        </header>

        <section className="customization-layout">
          <section className="panel settings-panel account-management-panel">
            <PanelTitle icon={<KeyRound />} title="Account & License" />
            <div className="preference-list">
              <article className="preference-row">
                <div>
                  <strong>{state.settings.clubAccount?.clubName || 'Club account'}</strong>
                  <span>
                    {state.settings.pilotAccess
                      ? `License ${state.settings.pilotAccess.licenseId || state.settings.pilotAccess.authorizationCode} expires ${state.settings.pilotAccess.expiresAt}`
                      : 'No active license on file'}
                  </span>
                </div>
                <label className="secondary-button license-file-button">
                  Renew Key
                  <input
                    type="file"
                    accept="application/json,.json,.key"
                    onChange={(event) => applyReplacementPilotKey(event.target.files?.[0])}
                  />
                </label>
              </article>
              <form className="account-management-form" onSubmit={saveClubAccount}>
                <input
                  value={clubDraft.clubName}
                  onChange={(event) => setClubDraft({ ...clubDraft, clubName: event.target.value })}
                  placeholder="Club name"
                />
                <input
                  value={clubDraft.accountName}
                  onChange={(event) => setClubDraft({ ...clubDraft, accountName: event.target.value })}
                  placeholder="Account name"
                />
                <input
                  value={clubDraft.contactName}
                  onChange={(event) => setClubDraft({ ...clubDraft, contactName: event.target.value })}
                  placeholder="Primary contact"
                />
                <input
                  type="email"
                  value={clubDraft.email}
                  onChange={(event) => setClubDraft({ ...clubDraft, email: event.target.value })}
                  placeholder="Email"
                />
                <input
                  value={clubDraft.phone}
                  onChange={(event) => setClubDraft({ ...clubDraft, phone: event.target.value })}
                  placeholder="Phone"
                />
                <input
                  value={clubDraft.address}
                  onChange={(event) => setClubDraft({ ...clubDraft, address: event.target.value })}
                  placeholder="Address"
                />
                <button className="primary-button" type="submit">
                  Save Account
                </button>
              </form>
              {pilotKeyError ? <p className="access-error">{pilotKeyError}</p> : null}
            </div>
          </section>

          <section className="panel settings-panel">
            <PanelTitle icon={<Settings />} title="Table Defaults" />
            <div className="preference-list">
              <article className="preference-row">
                <div>
                  <strong>New table rake mode</strong>
                  <span>Choose whether newly created tables use drop rake or player time fees.</span>
                </div>
                <div className="segmented-control">
                  <button
                    className={state.settings.defaultRakeMode === 'Drop' ? 'secondary-button active' : 'ghost-button'}
                    onClick={() => updateSettings({ defaultRakeMode: 'Drop' })}
                  >
                    Drop
                  </button>
                  <button
                    className={state.settings.defaultRakeMode === 'Time' ? 'secondary-button active' : 'ghost-button'}
                    onClick={() => updateSettings({ defaultRakeMode: 'Time' })}
                  >
                    Time fees
                  </button>
                </div>
              </article>
              <article className="preference-row">
                <div>
                  <strong>Apply default to active tables</strong>
                  <span>Update every open table and seated player timer setting to the selected rake mode.</span>
                </div>
                <button className="secondary-button" onClick={applyDefaultRakeToActiveTables}>
                  Apply
                </button>
              </article>
            </div>
          </section>

          <section className="panel settings-panel">
            <PanelTitle icon={<Moon />} title="Display" />
            <div className="preference-list">
              <article className="preference-row">
                <div>
                  <strong>Dark mode</strong>
                  <span>Use the lower-brightness theme for the floor, pop-outs, and summaries.</span>
                </div>
                <label className="switch-control">
                  <input
                    type="checkbox"
                    checked={state.settings.lowLight}
                    onChange={(event) => updateSettings({ lowLight: event.target.checked })}
                  />
                  <span>{state.settings.lowLight ? 'On' : 'Off'}</span>
                </label>
              </article>
              <article className="preference-row">
                <div>
                  <strong>Recent player shortcuts</strong>
                  <span>Show quick-fill buttons below Quick Add on the landing page.</span>
                </div>
                <label className="switch-control">
                  <input
                    type="checkbox"
                    checked={state.settings.showRecentPlayers}
                    onChange={(event) => updateSettings({ showRecentPlayers: event.target.checked })}
                  />
                  <span>{state.settings.showRecentPlayers ? 'Shown' : 'Hidden'}</span>
                </label>
              </article>
            </div>
          </section>
        </section>
      </main>
    );
  }

  if (route === 'builder') {
    return (
      <main className="app-shell compact-shell">
        <header className="topbar">
          <div>
            <div className="eyebrow">Table planning</div>
            <h1>Build a Table</h1>
          </div>
          <div className="topbar-actions">
            <button className="ghost-button" onClick={exportPilotReport}>
              <Download size={18} />
              Export Pilot
            </button>
            <button className="ghost-button" onClick={closeRoute}>
              <X size={18} />
              Close
            </button>
          </div>
        </header>

        <section className="panel">
          <div className="builder-controls">
            <label>
              Game
              <select
                value={coordinationConfig.gameId}
                onChange={(event: { target: { value: any; }; }) => setCoordinationConfig({ ...coordinationConfig, gameId: event.target.value })}
              >
                {state.games.map((game: { id: any; name: any; }) => (
                  <option key={game.id} value={game.id}>
                    {game.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Seats
              <input
                type="number"
                min="2"
                max={state.games.find((game: { id: any; }) => game.id === coordinationConfig.gameId)?.maxSeats ?? 10}
                value={coordinationConfig.seats}
                onChange={(event: { target: { value: any; }; }) => setCoordinationConfig({ ...coordinationConfig, seats: Number(event.target.value) })}
              />
            </label>
            <button className="primary-button" onClick={addPlannedSession}>
              <Plus size={18} />
              Create Table
            </button>
          </div>
          <div className="builder-grid single-window-grid">
            {participantPool.map((candidate: { id: any; playerName: any; reasons: any[]; profile: { preferredStakes: any; typicalBuyInMin: any; typicalBuyInMax: any; }; source: string; }, index: number) => (
              <article className="candidate-card" key={candidate.id}>
                <div className="candidate-rank">{index + 1}</div>
                <div>
                  <h3>{candidate.playerName}</h3>
                  <p>{candidate.reasons.slice(0, 3).join(' - ')}</p>
                  <small>
                    {candidate.profile?.preferredStakes || 'No saved stakes'} -{' '}
                    {candidate.profile
                      ? `$${candidate.profile.typicalBuyInMin}-${candidate.profile.typicalBuyInMax} buy-in`
                      : 'No profile'}
                  </small>
                  {candidate.source === 'connected-profile' ? <small>Profile connection, not currently listed</small> : null}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="panel">
          <PanelTitle icon={<Target />} title="Two-Table Balance Option" />
          <div className="balance-list">
            {balancePlans.filter((plan: { game: { id: any; }; }) => plan.game.id === coordinationConfig.gameId).length ? (
              balancePlans
                .filter((plan: { game: { id: any; }; }) => plan.game.id === coordinationConfig.gameId)
                .map((plan: { game: any; fromTable: any; demand: any; tableASeatsAfterMove: any; tableBProjectedSeats: any; nextStep: any; moveCandidates: any; }) => (
                  <article className="balance-card" key={`${plan.game.id}-${plan.fromTable.id}`}>
                    <div>
                      <h3>{plan.game.name}</h3>
                      <p>{plan.demand.totalDemand} total demand - Table A {plan.tableASeatsAfterMove}/{plan.fromTable.maxSeats} after move - Table B projected {plan.tableBProjectedSeats}/{plan.game.maxSeats}</p>
                      <small>{plan.nextStep}</small>
                    </div>
                    <div className="balance-movers">
                      {plan.moveCandidates.map((candidate: { id: any; playerName: any; reasons: any[]; }) => (
                        <span key={candidate.id}>{candidate.playerName} - {candidate.reasons.slice(0, 2).join(' - ')}</span>
                      ))}
                    </div>
                    <button className="primary-button" onClick={() => createBalancedTable(plan)}>
                      Create Table B
                    </button>
                  </article>
                ))
            ) : (
              <p className="muted-copy">This appears when a game has more than 12 total players across in-room, waiting, coming, and interested demand.</p>
            )}
          </div>
        </section>
      </main>
    );
  }

  if (route === 'profiles') {
    return (
      <main className="app-shell compact-shell">
        <header className="topbar">
          <div>
            <div className="eyebrow">Player context</div>
            <h1>Profiles</h1>
          </div>
          <button className="ghost-button" onClick={closeRoute}>
            <X size={18} />
            Close
          </button>
        </header>

        <section className="panel">
          <PanelTitle icon={<Users />} title="In Club" />
          <div className="club-list">
            {inClubInterests.length ? (
              inClubInterests.map((interest: { id: string; playerName: any; gameId: any; }) => (
                <article className="club-card" key={interest.id}>
                  <div>
                    <strong>{interest.playerName}</strong>
                    <small>{state.games.find((game: { id: any; }) => game.id === interest.gameId)?.name ?? 'Unknown game'}</small>
                  </div>
                  <button className="secondary-button" onClick={() => deleteInterest(interest.id)}>
                    Remove
                  </button>
                </article>
              ))
            ) : (
              <p className="muted-copy">No one marked in club.</p>
            )}
          </div>
        </section>

        <section className="panel">
          <div className="profile-search-row">
            <input
              value={profileSearch}
              onChange={(event: { target: { value: any; }; }) => setProfileSearch(event.target.value)}
              placeholder="Search players, stakes, companions, notes"
            />
            <span>{filteredProfiles.length} shown</span>
          </div>
          {duplicateProfiles.length ? (
            <div className="duplicate-list">
              {duplicateProfiles.map((group: any[]) => (
                <article className="duplicate-card" key={group[0].name.toLowerCase()}>
                  <span>Possible duplicate: {group.map((profile: { name: any; }) => profile.name).join(', ')}</span>
                  <button className="secondary-button" onClick={() => mergeDuplicateProfiles(group)}>
                    Merge
                  </button>
                </article>
              ))}
            </div>
          ) : null}
          <form className="profile-form" onSubmit={addProfile}>
            <input
              value={newProfile.name}
              onChange={(event: { target: { value: any; }; }) => setNewProfile({ ...newProfile, name: event.target.value })}
              placeholder="Player name"
            />
            <select
              value={newProfile.preferredGameId}
              onChange={(event: { target: { value: any; }; }) =>
                setNewProfile({
                  ...newProfile,
                  preferredGameId: event.target.value,
                  preferredGameIds: [event.target.value]
                })
              }
              title="Preferred game"
            >
              {state.games.map((game: { id: any; name: any; }) => (
                <option key={game.id} value={game.id}>
                  {game.name}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={newProfile.birthday}
              onChange={(event: { target: { value: string; }; }) => setNewProfile({ ...newProfile, birthday: event.target.value })}
              title="Birthday"
            />
            <input
              type="date"
              value={newProfile.membershipStartDate}
              onChange={(event: { target: { value: string; }; }) => setNewProfile({ ...newProfile, membershipStartDate: event.target.value })}
              title="Membership start"
            />
            <input
              type="date"
              value={newProfile.membershipExpirationDate}
              onChange={(event: { target: { value: string; }; }) => setNewProfile({ ...newProfile, membershipExpirationDate: event.target.value })}
              title="Membership expiration"
            />
            <input
              type="number"
              min="0"
              step="0.1"
              value={newProfile.totalTimePlayedHours}
              onChange={(event: { target: { value: any; }; }) => setNewProfile({ ...newProfile, totalTimePlayedHours: Number(event.target.value) })}
              title="Total time played"
            />
            <input
              type="number"
              min="0"
              step="0.1"
              value={newProfile.lastSessionTimePlayedHours}
              onChange={(event: { target: { value: any; }; }) => setNewProfile({ ...newProfile, lastSessionTimePlayedHours: Number(event.target.value) })}
              title="Last session time played"
            />
            <select
              multiple
              value={newProfile.commonlyPlaysWithProfileIds}
              onChange={(event) =>
                setNewProfile({
                  ...newProfile,
                  commonlyPlaysWithProfileIds: Array.from(event.target.selectedOptions).map((option) => option.value),
                  usualCompanions: Array.from(event.target.selectedOptions)
                    .map((option) => option.text)
                    .join(', ')
                })
              }
              title="Commonly plays with"
            >
              {state.profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </select>
            <button className="primary-button">
              <Plus size={18} />
              Add
            </button>
          </form>
          <textarea
            className="import-box"
            value={importText}
            onChange={(event: { target: { value: any; }; }) => setImportText(event.target.value)}
            placeholder="Import CSV: name, preferred game, birthday, membership start, membership expiration, companions separated by |"
          />
          <button className="secondary-button import-button" onClick={importProfiles}>
            Import People
          </button>
          <div className="profile-grid">
            {filteredProfiles.map((profile) => {
              const preferredGame = state.games.find((game) => game.id === profile.preferredGameId)?.name ?? profile.preferredStakes;
              const companionNames = profile.commonlyPlaysWithProfileIds
                .map((id) => state.profiles.find((candidate) => candidate.id === id)?.name)
                .filter(Boolean);
              const inClub = inClubInterests.some(
                (interest: { profileId: any; playerName: string; }) => interest.profileId === profile.id || interest.playerName.toLowerCase() === profile.name.toLowerCase()
              );
              return (
                <article className="profile-card" key={profile.id}>
                  <div>
                    <h3>{profile.name}</h3>
                    <p>ID: {profile.id}</p>
                    <small>Preferred game: {preferredGame || 'Not set'}</small>
                    <small>Birthday: {profile.birthday || 'Not set'}</small>
                    <small>Membership: {profile.membershipStartDate || 'Not set'} to {profile.membershipExpirationDate || 'Not set'}</small>
                    <small>Total played: {formatHours(profile.totalTimePlayedHours)} / Last session: {formatHours(profile.lastSessionTimePlayedHours)}</small>
                    {companionNames.length > 0 ? <small>Commonly plays with: {companionNames.join(', ')}</small> : null}
                  </div>
                  <div className="profile-actions">
                    <button className="secondary-button" onClick={() => (inClub ? removeProfileFromClub(profile) : addProfileToClub(profile))}>
                      {inClub ? 'Leave' : 'In Club'}
                    </button>
                    <button className="icon-button danger" onClick={() => deleteProfile(profile.id)} title="Remove profile">
                      <Trash2 size={17} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </main>
    );
  }

  if (route === 'signals') {
    return (
      <main className="app-shell compact-shell">
        <header className="topbar">
          <div>
            <div className="eyebrow">Coordination support</div>
            <h1>Interest Signals</h1>
          </div>
          <button className="ghost-button" onClick={closeRoute}>
            <X size={18} />
            Close
          </button>
        </header>

        <section className="panel">
          <PanelTitle icon={<Target />} title="Likely Participants" />
          <div className="outreach-list">
            {likelyParticipants.map((item: { id: any; profile: { name: any; }; game: { name: any; }; reason: any[]; message: string; confidence: number; }) => (
              <article className="outreach-card" key={item.id}>
                <div>
                  <h3>{item.profile.name}</h3>
                  <p>{item.game.name} - {item.reason.join(' - ')}</p>
                  <small>{item.message}</small>
                </div>
                <div className="outreach-actions">
                  <strong>{item.confidence >= 95 ? 'High' : item.confidence >= 70 ? 'Medium' : 'Low'}</strong>
                  <button className="secondary-button" onClick={() => copyMessage(item.message)}>
                    Copy Text
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="panel">
          <PanelTitle icon={<MessageCircle />} title="GroupMe Interest Scan" />
          <div className="integration-copy">
            <p>
              Paste room chat here to detect likely interest. Staff must review every match before it is added.
            </p>
            <textarea value={groupMeText} onChange={(event: { target: { value: any; }; }) => setGroupMeText(event.target.value)} placeholder="Mike: I can play 1/2 in 20 minutes&#10;Alex - interested in PLO" />
            <button className="secondary-button" onClick={scanGroupMeText}>Scan Pasted Messages</button>
            <div className="script-grid">
              {groupMeCandidates.map((candidate: { id: any; playerName: any; gameId: any; status: any; sourceText: any; confidence: any; timestamp?: string; }) => (
                <article className="script-card" key={candidate.id}>
                  <div className="candidate-edit-grid">
                    <input
                      value={candidate.playerName}
                      onChange={(event: { target: { value: any; }; }) =>
                        setGroupMeCandidates((candidates: any[]) =>
                          candidates.map((item: { id: any; }) => (item.id === candidate.id ? { ...item, playerName: event.target.value } : item))
                        )
                      }
                    />
                    <select
                      value={candidate.gameId}
                      onChange={(event: { target: { value: any; }; }) =>
                        setGroupMeCandidates((candidates: any[]) =>
                          candidates.map((item: { id: any; }) => (item.id === candidate.id ? { ...item, gameId: event.target.value } : item))
                        )
                      }
                    >
                      {state.games.map((game: { id: any; name: any; }) => (
                        <option key={game.id} value={game.id}>{game.name}</option>
                      ))}
                    </select>
                    <select
                      value={candidate.status}
                      onChange={(event: { target: { value: string; }; }) =>
                        setGroupMeCandidates((candidates: any[]) =>
                          candidates.map((item: { id: any; }) => (item.id === candidate.id ? { ...item, status: event.target.value as InterestStatus } : item))
                        )
                      }
                    >
                      {statuses.map((status) => (
                        <option key={status}>{status}</option>
                      ))}
                    </select>
                  </div>
                  <p>{candidate.sourceText}</p>
                  <small>{candidate.confidence}% confidence - staff review required</small>
                  <div className="inline-actions">
                    <button className="secondary-button" onClick={() => acceptGroupMeCandidate(candidate)}>Add</button>
                    <button className="ghost-button" onClick={() => rejectGroupMeCandidate(candidate.id)}>Reject</button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="panel">
          <PanelTitle icon={<MessageCircle />} title="Staff Scripts" />
          <div className="script-template-list">
            {state.scriptTemplates.map((template: any, index: number) => (
              <label key={index}>
                Template {index + 1}
                <input value={template} onChange={(event: { target: { value: string; }; }) => updateScriptTemplate(index, event.target.value)} />
              </label>
            ))}
          </div>
          <div className="script-grid">
            {staffScripts.map((script: { label: any; text: string; }) => (
              <article className="script-card" key={script.label}>
                <strong>{script.label}</strong>
                <p>{script.text}</p>
                <button className="secondary-button" onClick={() => copyMessage(script.text)}>
                  Copy
                </button>
              </article>
            ))}
          </div>
        </section>
      </main>
    );
  }

  if (route === 'summary') {
    return (
      <main className="app-shell compact-shell">
        <header className="topbar">
          <div>
            <div className="eyebrow">Owner view</div>
            <h1>Night Summary</h1>
          </div>
          <div className="topbar-actions">
            <button className="ghost-button" onClick={exportCsv}>
              <Download size={18} />
              CSV
            </button>
            <button className="ghost-button" onClick={() => window.print()}>
              <Download size={18} />
              Screenshot / Print
            </button>
            <button className="ghost-button" onClick={closeRoute}>
              <X size={18} />
              Close
            </button>
            <button
              className="ghost-button"
              onClick={() => persist({ ...state, settings: { ...state.settings, lowLight: !state.settings.lowLight } })}
            >
              {state.settings.lowLight ? 'Day Mode' : 'Low Light'}
            </button>
          </div>
        </header>

        <section className="owner-summary-grid">
          <article className="panel owner-metric">
            <span>Occupied Seat-Hours</span>
            <strong>{analytics.currentNight.occupiedSeatHours.toFixed(1)}</strong>
          </article>
          <article className="panel owner-metric">
            <span>Avg Wait</span>
            <strong>{analytics.averageWaitMinutes.toFixed(0)}m</strong>
          </article>
          <article className="panel owner-metric">
            <span>Conversion</span>
            <strong>{(analytics.conversionRate * 100).toFixed(0)}%</strong>
          </article>
          <article className="panel owner-metric">
            <span>Games Started</span>
            <strong>{analytics.currentNight.gamesStarted}</strong>
          </article>
          <article className="panel owner-metric">
            <span>Failed Starts</span>
            <strong>{analytics.failedStarts}</strong>
          </article>
          <article className="panel owner-metric">
            <span>Table Breaks</span>
            <strong>{analytics.tableBreaks}</strong>
          </article>
          <article className="panel owner-metric">
            <span>Median Wait</span>
            <strong>{analytics.medianWaitMinutes.toFixed(0)}m</strong>
          </article>
          <article className="panel owner-metric">
            <span>No-Shows</span>
            <strong>{analytics.noShows}</strong>
          </article>
          <article className="panel owner-metric">
            <span>Left Wait</span>
            <strong>{analytics.leftBeforeSeated}</strong>
          </article>
          <article className="panel owner-metric">
            <span>Confirmed Arrived</span>
            <strong>{(analytics.confirmedArrivalRate * 100).toFixed(0)}%</strong>
          </article>
          <article className="panel owner-metric">
            <span>Abandonment</span>
            <strong>{analytics.waitlistAbandonmentCount}</strong>
          </article>
          <article className="panel owner-metric">
            <span>Lost Seat-Hours</span>
            <strong>{analytics.lostSeatHourEstimate.toFixed(1)}</strong>
          </article>
          <article className="panel owner-metric">
            <span>Second Tables</span>
            <strong>{analytics.secondTablesStarted}</strong>
          </article>
          <article className="panel owner-metric">
            <span>Peak Wait</span>
            <strong>{analytics.peakWaitlistPressure}</strong>
          </article>
          <article className="panel owner-metric">
            <span>Arrivals</span>
            <strong>{analytics.totalArrivals}</strong>
          </article>
        </section>

        <section className="panel summary-report">
          <PanelTitle icon={<Target />} title="What Happened Tonight" />
          <p>
            The room generated {analytics.currentNight.occupiedSeatHours.toFixed(1)} occupied seat-hours across {analytics.activeTables} active/forming tables.
            Average wait is {analytics.averageWaitMinutes.toFixed(0)} minutes, with {(analytics.conversionRate * 100).toFixed(0)}% waitlist conversion.
          </p>
          <p>
            Peak demand is {analytics.peakInterestedByGame ? `${analytics.peakInterestedByGame.game} with ${analytics.peakInterestedByGame.count} interested/in-room players` : 'not available yet'}.
            Failed starts: {analytics.failedStarts}. Table breaks: {analytics.tableBreaks}.
          </p>
          <div className="summary-breakdown">
            <div>
              <h3>Seat-Hours by Game</h3>
              {analytics.seatHoursByGame.map((item: { game: any; hours: number; }) => (
                <span key={item.game}>{item.game}: {item.hours.toFixed(1)}</span>
              ))}
            </div>
            <div>
              <h3>Seat-Hours by Table</h3>
              {analytics.seatHoursByTable.slice(0, 6).map((item: { table: any; game: any; hours: number; }) => (
                <span key={`${item.table}-${item.game}`}>{item.table} ({item.game}): {item.hours.toFixed(1)}</span>
              ))}
            </div>
            <div>
              <h3>Wait by Game</h3>
              {analytics.waitByGame.map((item: { game: any; count: any; averageMinutes: number; }) => (
                <span key={item.game}>{item.game}: {item.count ? `${item.averageMinutes.toFixed(0)}m avg` : 'No seated waits'}</span>
              ))}
            </div>
            <div>
              <h3>Event Reasons</h3>
              {state.tableEvents.filter((event: { type: string; }) => event.type === 'Failed to Start' || event.type === 'Broke').slice(-6).map((event: { id: any; type: any; reason: any; note: any; }) => (
                <span key={event.id}>{event.type}: {event.reason || 'Unspecified'}{event.note ? ` - ${event.note}` : ''}</span>
              ))}
              {!state.tableEvents.some((event: { type: string; }) => event.type === 'Failed to Start' || event.type === 'Broke') ? <span>No failed starts or breaks logged.</span> : null}
            </div>
          </div>
          <div className="summary-breakdown">
            <div>
              <h3>Last 5 Nights</h3>
              {state.history.slice(-5).reverse().map((night: { id: any; date: any; occupiedSeatHours: number; gamesStarted: any; waitlistConversionRate: number; averageActiveTables: number; }) => (
                <span key={night.id}>
                  {night.date}: {night.occupiedSeatHours.toFixed(1)} seat-hours / {night.gamesStarted} starts / {(night.waitlistConversionRate * 100).toFixed(0)}% conversion / {night.averageActiveTables.toFixed(1)} avg tables
                </span>
              ))}
              {!state.history.length ? <span>No archived nights yet.</span> : null}
            </div>
            <div>
              <h3>Operational Opportunities</h3>
              {operationalOpportunities.map((item: any) => (
                <span key={item}>{item}</span>
              ))}
            </div>
            <div>
              <h3>Correction Log</h3>
              {state.correctionLog.slice(0, 8).map((entry: { id: any; timestamp: string | undefined; entity: any; field: any; }) => (
                <span key={entry.id}>{formatClock(entry.timestamp)} - {entry.entity}: {entry.field}</span>
              ))}
              {!state.correctionLog.length ? <span>No corrections logged.</span> : null}
            </div>
          </div>
          <textarea
            className="summary-notes"
            value={summaryNotes}
            onChange={(event: { target: { value: any; }; }) => setSummaryNotes(event.target.value)}
            placeholder="Owner-facing notes"
          />
          <button className="primary-button" onClick={archiveNight}>
            <Save size={18} />
            Close Night
          </button>
        </section>
      </main>
    );
  }

  if (route === 'kpis') {
    return (
      <main className="app-shell compact-shell">
        <header className="topbar">
          <div>
            <div className="eyebrow">Operating metrics</div>
            <h1>KPIs</h1>
          </div>
          <div className="topbar-actions">
            <button className="ghost-button" onClick={exportCsv}>
              <Download size={18} />
              CSV
            </button>
            <button className="ghost-button" onClick={closeRoute}>
              <X size={18} />
              Close
            </button>
          </div>
        </header>

        <section className="owner-summary-grid">
          <article className="panel owner-metric">
            <span>Seat-Hours</span>
            <strong>{analytics.currentNight.occupiedSeatHours.toFixed(1)}</strong>
          </article>
          <article className="panel owner-metric">
            <span>Active Tables</span>
            <strong>{analytics.activeTables}</strong>
          </article>
          <article className="panel owner-metric">
            <span>Average Wait</span>
            <strong>{analytics.averageWaitMinutes.toFixed(0)}m</strong>
          </article>
          <article className="panel owner-metric">
            <span>Conversion</span>
            <strong>{(analytics.conversionRate * 100).toFixed(0)}%</strong>
          </article>
          <article className="panel owner-metric">
            <span>Failed Starts</span>
            <strong>{analytics.failedStarts}</strong>
          </article>
          <article className="panel owner-metric">
            <span>Table Breaks</span>
            <strong>{analytics.tableBreaks}</strong>
          </article>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <div className="eyebrow">{branding.product.tagline}</div>
          <h1>{branding.product.name}</h1>
        </div>
        <div className="topbar-actions">
          <button className="ghost-button" onClick={() => openRoute('customization')} title="Open customization">
            <Settings size={18} />
            Customize
          </button>
          <button className="ghost-button" onClick={() => openRoute('builder')} title="Open table builder">
            <Users size={18} />
            Build Table
          </button>
          <button className="ghost-button" onClick={() => openRoute('profiles')} title="Open profiles">
            <Edit3 size={18} />
            Profiles
          </button>
          <button className="ghost-button" onClick={() => openRoute('summary')} title="Open owner summary">
            <Clock size={18} />
            Summary
          </button>
          <button className="ghost-button" onClick={() => openRoute('kpis')} title="Open KPIs">
            <Target size={18} />
            KPIs
          </button>
        </div>
      </header>

      <section className="minimal-dashboard dashboard-simple">
        <section className={`panel floor-panel current-tables-panel ${openPanels.currentTables ? '' : 'collapsed-panel'}`}>
          <PanelTitle
            icon={<LayoutDashboard />}
            title="Current Tables"
            collapsed={!openPanels.currentTables}
            onToggle={() => togglePanel('currentTables')}
          />
          {openPanels.currentTables ? <div className="active-game-list">
            {state.sessions.filter((session: { status: string; }) => session.status !== 'Closed' && session.status !== 'Failed to Start').length ? (
              state.sessions.filter((session: { status: string; }) => session.status !== 'Closed' && session.status !== 'Failed to Start').map((session: GameSession) => {
                const game = state.games.find((item: { id: any; }) => item.id === session.gameId);
                const health = getTableHealth(state, session);
                const seatOptions = getSeatOptions(session.gameId);
                const seatedPlayers = state.playerSessions.filter((playerSession) => playerSession.tableId === session.id && !playerSession.leftAt);
                const isTimeRake = session.rakeMode === 'Time' || session.timeRaked;
                const tableExpanded = Boolean(collapsedTables[session.id]);
                const pokerTablePlayers: PokerTablePlayer[] = seatedPlayers.map((playerSession, index) => {
                  const hours = getPlayerLoggedHours(state, playerSession);
                  const buyIns = getSessionBuyIns(state, playerSession);
                  const buyInTotal = buyIns.reduce((sum, buyIn) => sum + buyIn.amount, 0);
                  return {
                    id: playerSession.id,
                    seatNumber: index + 1,
                    name: playerSession.playerName,
                    membershipId: playerSession.profileId ?? playerSession.id.slice(0, 8),
                    joinedAt: new Date(playerSession.seatedAt).getTime(),
                    hourlyTimeLimit: isTimeRake ? Math.max(1, playerSession.timePurchasedMinutes ?? 60) : undefined,
                    timeRemainingSeconds: isTimeRake ? getTimeRemainingSeconds(playerSession, clockNow) : undefined,
                    tonightHours: formatHours(hours.tonight),
                    totalHours: formatHours(hours.total),
                    buyInTotal,
                    recentBuyIns: buyIns.slice(0, 4).map((buyIn) => ({
                      id: buyIn.id,
                      label: `$${buyIn.amount.toLocaleString()} at ${formatClock(buyIn.timestamp)}${buyIn.note ? ` - ${buyIn.note}` : ''}`
                    }))
                  };
                });
                return (
                  <article className="active-game-card" key={session.id}>
                    <div>
                      <h3>{game?.name ?? 'Unknown'}</h3>
                      <span>{session.label} - {session.status} - {isTimeRake ? 'Time rake' : 'Drop rake'}</span>
                      <small>
                        Start {formatClock(session.startedAt)} {session.manualEdits?.startedAt ? <em className="edited-marker">edited</em> : null}
                        {session.endedAt ? <> / End {formatClock(session.endedAt)} {session.manualEdits?.endedAt ? <em className="edited-marker">edited</em> : null}</> : null}
                      </small>
                    </div>
                    <strong>{pokerTablePlayers.length}/{session.maxSeats}</strong>
                    <span className={`health-pill ${health.toLowerCase().replace(/\s+/g, '-')}`}>{health}</span>
                    <div className="seat-control">
                      <button className="mini-button" onClick={() => changeSeatCount(session, -1)} title="Remove occupied seat">-</button>
                      <button className="mini-button" onClick={() => window.alert('Open Details and select the player joining this table.')} title="Select player to seat">+</button>
                      {session.status !== 'Running' ? (
                        <button className="secondary-button" onClick={() => startSessionWithPlayers(session)}>Run</button>
                      ) : (
                        <button className="secondary-button" onClick={() => updateSession(session.id, { status: 'Paused' })}>Pause</button>
                      )}
                      <button className="ghost-button" onClick={() => recordTableEvent(session, 'Broke', eventDrafts[session.id]?.breakReason || tableBreakReasons[0], eventDrafts[session.id]?.breakNote ?? '')}>
                        Broke
                      </button>
                      <button
                        className="icon-button"
                        onClick={() => setCollapsedTables((tables) => ({ ...tables, [session.id]: !tables[session.id] }))}
                        title={tableExpanded ? 'Hide table' : 'Show table'}
                      >
                        {tableExpanded ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
                      </button>
                      <button className="icon-button" onClick={() => recordTableEvent(session, 'Closed', 'Staff closed table')} title="Close table">
                        <X size={17} />
                      </button>
                    </div>
                    <div className="table-detail-panel">
                      <div className="seat-player-row">
                        <select
                          value={tableSeatDrafts[session.id] ?? ''}
                          onChange={(event: { target: { value: string; }; }) => setTableSeatDrafts((drafts) => ({ ...drafts, [session.id]: event.target.value }))}
                        >
                          <option value="">Select player to seat</option>
                          {seatOptions.map((interest) => (
                            <option key={interest.id} value={interest.id}>
                              {interest.playerName} - {interest.status}
                            </option>
                          ))}
                        </select>
                        <button className="secondary-button" onClick={() => addSelectedPlayerToTable(session)} disabled={!seatOptions.length}>
                          Seat
                        </button>
                      </div>
                      {tableExpanded ? (
                        <div className="poker-table-display">
                          {seatedPlayers.length ? (
                            <PokerTable
                              players={pokerTablePlayers}
                              showTimeRemaining={isTimeRake}
                              maxPlayers={session.maxSeats}
                              onAddTime={(playerId, minutes) => {
                                const playerSession = seatedPlayers.find((player) => player.id === playerId);
                                if (playerSession) addPlayerTime(playerSession, minutes);
                              }}
                              onAddBuyIn={(playerId, amount, note) => {
                                const playerSession = seatedPlayers.find((player) => player.id === playerId);
                                if (playerSession) addBuyIn(playerSession, amount, note);
                              }}
                              onRemovePlayer={(playerId) => {
                                const playerSession = seatedPlayers.find((player) => player.id === playerId);
                                if (playerSession) markPlayerSessionLeft(playerSession);
                              }}
                            />
                          ) : (
                            <span className="muted-copy">No seated players yet.</span>
                          )}
                        </div>
                      ) : (
                        <div className="table-collapsed-note">
                          <span>{seatedPlayers.length} seated player{seatedPlayers.length === 1 ? '' : 's'}</span>
                          <button
                            className="ghost-button"
                            onClick={() => setCollapsedTables((tables) => ({ ...tables, [session.id]: true }))}
                          >
                            Show table
                          </button>
                        </div>
                      )}
                    </div>
                    <details className="compact-details table-admin-details">
                      <summary>Table admin</summary>
                      <div className="correction-grid">
                        <label>
                          Start
                          <input
                            type="datetime-local"
                            value={toDateTimeInput(session.startedAt)}
                            onChange={(event: { target: { value: string; }; }) => updateSessionTimestamp(session.id, 'startedAt', event.target.value)}
                          />
                        </label>
                        <label>
                          End
                          <input
                            type="datetime-local"
                            value={toDateTimeInput(session.endedAt)}
                            onChange={(event: { target: { value: string; }; }) => updateSessionTimestamp(session.id, 'endedAt', event.target.value)}
                          />
                        </label>
                        <label>
                          Break reason
                          <select
                            value={eventDrafts[session.id]?.breakReason ?? tableBreakReasons[0]}
                            onChange={(event: { target: { value: any; }; }) =>
                              setEventDrafts((drafts: { [x: string]: any; }) => ({
                                ...drafts,
                                [session.id]: { failReason: failedStartReasons[0], failNote: '', breakNote: '', ...(drafts[session.id] ?? {}), breakReason: event.target.value }
                              }))
                            }
                          >
                            {tableBreakReasons.map((reason) => (
                              <option key={reason}>{reason}</option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Break note
                          <input
                            value={eventDrafts[session.id]?.breakNote ?? ''}
                            onChange={(event: { target: { value: any; }; }) =>
                              setEventDrafts((drafts: { [x: string]: any; }) => ({
                                ...drafts,
                                [session.id]: { failReason: failedStartReasons[0], failNote: '', breakReason: tableBreakReasons[0], ...(drafts[session.id] ?? {}), breakNote: event.target.value }
                              }))
                            }
                            placeholder="Optional"
                          />
                        </label>
                      </div>
                    </details>
                  </article>
                );
              })
            ) : (
              <p className="muted-copy">No active tables.</p>
            )}
          </div> : null}
        </section>

        <section className={`panel floor-panel table-overview-panel ${openPanels.tableOverview ? '' : 'collapsed-panel'}`}>
          <PanelTitle
            icon={<Clock />}
            title="Table Overview"
            collapsed={!openPanels.tableOverview}
            onToggle={() => togglePanel('tableOverview')}
          />
          {openPanels.tableOverview ? (() => {
            const openSessions = state.sessions.filter((session) => session.status !== 'Closed' && session.status !== 'Failed to Start');
            const selectedTable = openSessions.find((session) => session.id === overviewTableId) ?? openSessions[0];
            const selectedPlayers = selectedTable
              ? state.playerSessions.filter((playerSession) => playerSession.tableId === selectedTable.id && !playerSession.leftAt)
              : [];
            const selectedIsTimeRake = Boolean(selectedTable && (selectedTable.rakeMode === 'Time' || selectedTable.timeRaked));
            return (
              <div className="table-overview-content">
                {openSessions.length ? (
                  <>
                    <select value={selectedTable?.id ?? ''} onChange={(event) => setOverviewTableId(event.target.value)}>
                      {openSessions.map((session) => (
                        <option key={session.id} value={session.id}>
                          {session.label} - {state.games.find((game) => game.id === session.gameId)?.name ?? 'Unknown'}
                        </option>
                      ))}
                    </select>
                    <div className="overview-player-list">
                      {selectedPlayers.length ? (
                        selectedPlayers.map((playerSession, index) => {
                          const remainingSeconds = getTimeRemainingSeconds(playerSession, clockNow);
                          const remainingMinutes = Math.ceil(remainingSeconds / 60);
                          const timeStatus = selectedIsTimeRake ? getTimeStatus(remainingMinutes) : 'off';
                          return (
                            <div className="overview-player-row" key={playerSession.id}>
                              <span>Seat {index + 1}</span>
                              <strong>{playerSession.playerName}</strong>
                              <em className={`time-left-pill ${timeStatus}`}>
                                {selectedIsTimeRake ? formatTimeLeft(remainingSeconds) : formatMinutesLeft(minutesSince(playerSession.seatedAt))}
                              </em>
                            </div>
                          );
                        })
                      ) : (
                        <p className="muted-copy">No seated players on this table.</p>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="muted-copy">No open tables to summarize.</p>
                )}
              </div>
            );
          })() : null}
        </section>

        <section className={`panel floor-panel shown-interest-panel ${openPanels.formingGames ? '' : 'collapsed-panel'}`}>
          <PanelTitle icon={<Users />} title="Forming Games" collapsed={!openPanels.formingGames} onToggle={() => togglePanel('formingGames')} />
          {openPanels.formingGames ? <div className="forming-list">
            {state.games.map((game: { id: any; name: any; maxSeats?: number; minInRoomForLikely?: number; minFlexibleForLikely?: number; minTotalForViable?: number; }) => {
              const demand = getDemand(game, state.interests);
              const viability = getViabilityState(state, game);
              const formingSession = state.sessions.find((session: { gameId: any; status: string; }) => session.gameId === game.id && session.status === 'Forming');
              const candidates = getParticipantPool(state, game.id, 3);
              const startOptions = getSeatOptions(game.id);
              const selectedForStart = formingSession ? (startPlayerDrafts[formingSession.id] ?? []) : [];
              return (
                <article className="forming-card" key={game.id}>
                  <div>
                    <strong>{game.name}</strong>
                    <span className={`status-pill ${viability.state === 'Ready to Start' || viability.state === 'Likely to Start' ? 'likely' : ''}`}>
                      {viability.state}
                    </span>
                  </div>
                  <p>{demand.inRoom} in / {demand.confirmed} coming / {demand.interested + demand.waiting} waiting</p>
                  <small>{viability.nextStep}</small>
                  {candidates.length ? <small>Likely: {candidates.map((candidate) => candidate.playerName).join(', ')}</small> : null}
                  <div className="inline-actions">
                    {formingSession ? (
                      <>
                        <button className="secondary-button" onClick={() => startSessionWithPlayers(formingSession)}>
                          Select + Start
                        </button>
                        <button className="ghost-button" onClick={() => failFormingGame(formingSession)}>
                          Failed
                        </button>
                      </>
                    ) : (
                      <button className="secondary-button" onClick={() => addSession(game.id)}>
                        Form
                      </button>
                    )}
                  </div>
                  {formingSession ? (
                    <details className="compact-details">
                      <summary>Players</summary>
                      <div className="player-picker-list">
                        {startOptions.length ? (
                          startOptions.slice(0, formingSession.maxSeats).map((interest) => (
                            <label className="player-pick-row" key={interest.id}>
                              <input
                                type="checkbox"
                                checked={selectedForStart.includes(interest.id)}
                                onChange={() => toggleStartPlayer(formingSession.id, interest.id)}
                              />
                              <span>{interest.playerName}</span>
                              <small>{interest.status}</small>
                            </label>
                          ))
                        ) : (
                          <span className="muted-copy">No players available.</span>
                        )}
                      </div>
                    </details>
                  ) : null}
                  {formingSession ? (
                    <details className="compact-details">
                      <summary>Failed start</summary>
                      <div className="correction-grid">
                      <label>
                        Failed reason
                        <select
                          value={eventDrafts[formingSession.id]?.failReason ?? failedStartReasons[0]}
                          onChange={(event: { target: { value: any; }; }) =>
                            setEventDrafts((drafts: { [x: string]: any; }) => ({
                              ...drafts,
                              [formingSession.id]: { breakReason: tableBreakReasons[0], breakNote: '', failNote: '', ...(drafts[formingSession.id] ?? {}), failReason: event.target.value }
                            }))
                          }
                        >
                          {failedStartReasons.map((reason) => (
                            <option key={reason}>{reason}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Failed note
                        <input
                          value={eventDrafts[formingSession.id]?.failNote ?? ''}
                          onChange={(event: { target: { value: any; }; }) =>
                            setEventDrafts((drafts: { [x: string]: any; }) => ({
                              ...drafts,
                              [formingSession.id]: { breakReason: tableBreakReasons[0], breakNote: '', failReason: failedStartReasons[0], ...(drafts[formingSession.id] ?? {}), failNote: event.target.value }
                            }))
                          }
                          placeholder="Optional"
                        />
                      </label>
                      </div>
                    </details>
                  ) : null}
                </article>
              );
            })}
          </div> : null}
        </section>

        <section className={`panel floor-panel recommended-panel ${openPanels.waitlist ? '' : 'collapsed-panel'}`}>
          <PanelTitle icon={<Target />} title="Waitlist" collapsed={!openPanels.waitlist} onToggle={() => togglePanel('waitlist')} />
          {openPanels.waitlist ? <div className="waitlist-list">
            {state.interests.filter((interest) => activeInterestStatuses.includes(interest.status)).length ? (
              state.interests
                .filter((interest) => activeInterestStatuses.includes(interest.status))
                .slice(0, 8)
                .map((interest: { gameId: any; id: any; playerName: any; status: any; interestedAt: any; manualEdits: any; arrivedAt: any; }) => {
                const game = state.games.find((item: { id: any; }) => item.id === interest.gameId);
                return (
                  <article className="waitlist-card" key={interest.id}>
                    <div>
                      <strong>{interest.playerName}</strong>
                      <span>{game?.name ?? 'Unknown'} - {interest.status}</span>
                      <small>
                        Logged {formatClock(interest.interestedAt)} ({minutesSince(interest.interestedAt)}m)
                        {interest.manualEdits?.interestedAt ? <em className="edited-marker">edited</em> : null}
                      </small>
                      {interest.arrivedAt ? (
                        <small>
                          Arrived {formatClock(interest.arrivedAt)} ({minutesSince(interest.arrivedAt)}m)
                          {interest.manualEdits?.arrivedAt ? <em className="edited-marker">edited</em> : null}
                        </small>
                      ) : null}
                    </div>
                    <div className="lifecycle-actions">
                      <button className="ghost-button" onClick={() => deleteInterest(interest.id)}>Remove</button>
                    </div>
                  </article>
                );
              })
            ) : (
              <p className="muted-copy">No one is on the waitlist.</p>
            )}
          </div> : null}
        </section>

        <section className={`panel floor-panel quick-add-panel ${openPanels.quickAdd ? '' : 'collapsed-panel'}`}>
          <PanelTitle icon={<Plus />} title="Quick Add" collapsed={!openPanels.quickAdd} onToggle={() => togglePanel('quickAdd')} />
          {openPanels.quickAdd ? <>
          <form className="quick-form" onSubmit={addInterest}>
            <input
              value={form.playerName}
              onChange={(event: { target: { value: any; }; }) => setForm({ ...form, playerName: event.target.value })}
              placeholder="Player name"
            />
            <select value={form.gameId} onChange={(event: { target: { value: any; }; }) => setForm({ ...form, gameId: event.target.value })}>
              {state.games.map((game: { id: any; name: any; }) => (
                <option key={game.id} value={game.id}>
                  {game.name}
                </option>
              ))}
            </select>
            <select
              value={form.status}
              onChange={(event: { target: { value: string; }; }) => setForm({ ...form, status: event.target.value as InterestStatus })}
            >
              {statuses.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
            <input
              value={form.notes}
              onChange={(event: { target: { value: any; }; }) => setForm({ ...form, notes: event.target.value })}
              placeholder="Optional note"
            />
            <button className="primary-button" type="submit">
              <Plus size={18} />
              Add
            </button>
          </form>
          {state.settings.showRecentPlayers ? (
            <div className="recent-player-row">
              {recentProfiles.map((profile: { id: any; name: any; preferredGameIds?: string[]; preferredStakes?: string; typicalBuyInMin?: number; typicalBuyInMax?: number; willingnessToMove?: boolean; typicalAvailability?: string; usualCompanions?: string[]; preferredTags?: TableTag[]; notes?: string; }) => (
                <button className="ghost-button" key={profile.id} onClick={() => quickFillProfile(profile)}>
                  {profile.name}
                </button>
              ))}
            </div>
          ) : null}
          </> : null}
        </section>

      </section>
    </main>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <article className="metric-card">
      <div className="metric-icon">{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

function PanelTitle({
  icon,
  title,
  collapsed,
  onToggle
}: {
  icon: React.ReactNode;
  title: string;
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  return (
    <div className="panel-title">
      <div className="panel-title-main">
        {icon}
        <h2>{title}</h2>
      </div>
      {onToggle ? (
        <button className="icon-button panel-toggle-button" onClick={onToggle} title={collapsed ? `Open ${title}` : `Close ${title}`}>
          {collapsed ? <ChevronDown size={17} /> : <ChevronUp size={17} />}
        </button>
      ) : null}
    </div>
  );
}

function TagPicker({ selected, onChange }: { selected: TableTag[]; onChange: (tags: TableTag[]) => void }) {
  return (
    <div className="tag-picker">
      {gameQualityTags.map((tag) => {
        const active = selected.includes(tag);
        return (
          <button
            className={active ? 'tag active' : 'tag'}
            key={tag}
            type="button"
            onClick={() => onChange(active ? selected.filter((item) => item !== tag) : [...selected, tag])}
          >
            {tag}
          </button>
        );
      })}
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
