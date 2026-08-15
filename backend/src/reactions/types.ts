export type Animation = 'happy' | 'sad' | 'celebrate' | 'concerned' | 'neutral' | 'sleeping' | 'curious';
export type Sound = 'chime' | 'fanfare' | 'warning' | 'coin' | 'off';
export type LedColor = 'green' | 'amber' | 'red' | 'rainbow' | 'off';

export type Reaction = {
  animation: Animation;
  sound: Sound;
  led: LedColor;
  duration: number;
  reason: string;
};
