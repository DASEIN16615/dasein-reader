import clsx from 'clsx';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { PiSun, PiMoon } from 'react-icons/pi';
import { TbSunMoon } from 'react-icons/tb';
import { MdOutlineSensors } from 'react-icons/md';
import { useEnv } from '@/context/EnvContext';
import { useThemeStore } from '@/store/themeStore';
import { useTranslation } from '@/hooks/useTranslation';
import { useSettingsStore } from '@/store/settingsStore';
import { useDeviceControlStore } from '@/store/deviceStore';
import { saveSysSettings } from '@/helpers/settings';
import { themes } from '@/styles/themes';
import { debounce } from '@/utils/debounce';
import { nextThemeMode } from '@/utils/ambientLight';
import Slider from '@/components/Slider';

const SCREEN_BRIGHTNESS_LIMITS = {
  MIN: 0,
  MAX: 100,
  DEFAULT: 50,
} as const;

interface ColorPanelProps {
  actionTab: string;
  bottomOffset: string;
  forceMobileLayout: boolean;
  // Keeps the panel clear of iPhone Duo's side status strip (#6307).
  insetStyle?: React.CSSProperties;
}

export const ColorPanel: React.FC<ColorPanelProps> = ({
  actionTab,
  bottomOffset,
  forceMobileLayout,
  insetStyle,
}) => {
  const _ = useTranslation();
  const { envConfig, appService } = useEnv();
  const { settings } = useSettingsStore();
  const { getScreenBrightness, setScreenBrightness } = useDeviceControlStore();
  const { themeMode, themeColor, isDarkMode, setThemeMode, setThemeColor } = useThemeStore();

  const [screenBrightnessValue, setScreenBrightnessValue] = useState(
    settings.screenBrightness >= 0 ? settings.screenBrightness : SCREEN_BRIGHTNESS_LIMITS.DEFAULT,
  );

  useEffect(() => {
    if (!appService?.isMobileApp) return;
    if (actionTab !== 'color') return;

    getScreenBrightness().then((brightness) => {
      if (brightness >= 0.0 && brightness <= 1.0) {
        const screenBrightness = Math.round(brightness * 100);
        setScreenBrightnessValue(screenBrightness);
      }
    });
  }, [actionTab, appService, getScreenBrightness]);

  const debouncedSetScreenBrightness = useMemo(
    () =>
      debounce(async (value: number) => {
        if (!settings.autoScreenBrightness) {
          saveSysSettings(envConfig, 'screenBrightness', value);
        }
        await setScreenBrightness(value / 100, settings.autoScreenBrightness);
      }, 100),
    [envConfig, setScreenBrightness, settings.autoScreenBrightness],
  );

  const handleScreenBrightnessChange = useCallback(
    async (value: number) => {
      if (!appService?.isMobileApp) return;

      setScreenBrightnessValue(value);
      debouncedSetScreenBrightness(value);
    },
    [appService, debouncedSetScreenBrightness],
  );

  const cycleThemeMode = () => {
    setThemeMode(nextThemeMode(themeMode, !!appService?.hasAmbientLightSensor));
  };

  const classes = clsx(
    'footerbar-color-mobile not-eink:bg-base-100/95 not-eink:backdrop-blur-md eink:bg-base-100 absolute flex w-full flex-col items-center gap-y-6 px-4 transition-all rounded-t-3xl shadow-2xl border-t border-base-content/5',
    'eink:border-base-content eink:border-t',
    !forceMobileLayout && 'sm:hidden',
    // Paddings stay constant in both states (the slide is transform-only) so
    // offsetHeight always reports the panel's settled height; the TTS mini
    // player measures it to stack above the expanded panel.
    'pb-6 pt-6',
    actionTab === 'color'
      ? 'pointer-events-auto translate-y-0 ease-out'
      : 'pointer-events-none invisible translate-y-full overflow-hidden ease-in',
  );

  return (
    <div
      className={classes}
      style={{
        bottom: appService?.isAndroidApp
          ? `calc(env(safe-area-inset-bottom) + 64px)`
          : bottomOffset,
        ...insetStyle,
      }}
    >
      {appService?.hasScreenBrightness && (
        <Slider
          label={_('Screen Brightness')}
          initialValue={screenBrightnessValue}
          bubbleLabel={`${screenBrightnessValue}`}
          minIcon={<PiSun size={16} />}
          maxIcon={<PiSun size={24} />}
          onChange={handleScreenBrightnessChange}
          min={SCREEN_BRIGHTNESS_LIMITS.MIN}
          max={SCREEN_BRIGHTNESS_LIMITS.MAX}
          valueToPosition={(value: number, min: number, max: number): number => {
            if (value <= min) return 0;
            if (value >= max) return 100;
            // Use exponential mapping: position = 100 * ((value/max)^0.5)
            const normalized = value / max;
            const position = Math.pow(normalized, 0.5) * 100;
            return position;
          }}
          positionToValue={(position: number, min: number, max: number): number => {
            if (position <= 0) return min;
            if (position >= 100) return max;
            // Inverse of the above: value = max * (position/100)^2
            const normalized = position / 100;
            const value = Math.pow(normalized, 2) * max;
            return Math.max(min, Math.min(max, value));
          }}
        />
      )}

      <div className='w-full'>
        <div className='flex items-center justify-between px-2 pb-2'>
          <span className='text-xs font-medium text-base-content/60 uppercase tracking-wider'>
            {_('Color')}
          </span>
        </div>
        <div
          className='flex items-center gap-4 overflow-x-auto px-2 py-1'
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {themes.map(({ name, label, colors }) => {
            const isSelected = themeColor === name;
            return (
              <button
                key={name}
                type='button'
                onClick={() => setThemeColor(name)}
                className='flex flex-col items-center gap-1 shrink-0'
              >
                <div
                  className={clsx(
                    'w-9 h-9 rounded-full border border-base-content/15 shadow-sm flex items-center justify-center transition-all',
                    isSelected
                      ? 'ring-2 ring-primary ring-offset-2 ring-offset-base-100 scale-105'
                      : 'hover:opacity-85 active:scale-95',
                  )}
                  style={{
                    backgroundColor: isDarkMode
                      ? colors.dark['base-100']
                      : colors.light['base-100'],
                  }}
                />
                <span
                  className={clsx(
                    'text-[11px] font-medium transition-colors',
                    isSelected ? 'text-primary font-semibold' : 'text-base-content/70',
                  )}
                >
                  {_(label)}
                </span>
              </button>
            );
          })}
          <button
            type='button'
            onClick={() => cycleThemeMode()}
            className='flex flex-col items-center gap-1 shrink-0'
          >
            <div
              className={clsx(
                'w-9 h-9 rounded-full border border-base-content/15 shadow-sm flex items-center justify-center transition-all',
                themeMode === 'dark'
                  ? 'ring-2 ring-primary ring-offset-2 ring-offset-base-100 bg-neutral text-neutral-content'
                  : 'bg-base-200 text-base-content/80 hover:opacity-85 active:scale-95',
              )}
            >
              {themeMode === 'light' ? (
                <PiSun size={18} />
              ) : themeMode === 'dark' ? (
                <PiMoon size={18} />
              ) : themeMode === 'ambient' ? (
                <MdOutlineSensors size={18} />
              ) : (
                <TbSunMoon size={18} />
              )}
            </div>
            <span className='text-[11px] font-medium text-base-content/70'>
              {themeMode === 'dark' ? _('Dark') : _('Light')}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
