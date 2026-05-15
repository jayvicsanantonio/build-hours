import type { RealtimeAssistantConfig } from '../realtimeSessionConfig';

export const SUPPLY_REALTIME_MODEL = 'gpt-realtime-2';
export const SUPPLY_REALTIME_REASONING = {
  effort: 'low',
} satisfies NonNullable<RealtimeAssistantConfig['reasoning']>;
