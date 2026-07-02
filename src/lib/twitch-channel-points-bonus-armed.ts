/**
 * Whether channel-points bonus auto-click should run on a Twitch tab.
 */
import {
  isTwitchRaidGuardArmedForTab,
  type TwitchRaidGuardArmedInput,
} from './twitch-raid-guard-armed';

export type TwitchChannelPointsBonusArmedInput = TwitchRaidGuardArmedInput & {
  channelPointsBonusEnabled: boolean;
};

export function isTwitchChannelPointsBonusArmedForTab(
  input: TwitchChannelPointsBonusArmedInput
): boolean {
  if (!input.channelPointsBonusEnabled) {
    return false;
  }
  return isTwitchRaidGuardArmedForTab(input);
}
