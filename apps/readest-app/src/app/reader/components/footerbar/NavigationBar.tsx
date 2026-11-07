import clsx from 'clsx';
import React from 'react';
import { IoIosList as TOCIcon } from 'react-icons/io';
import { RxSlider as SliderIcon } from 'react-icons/rx';
import { RiFontFamily as FontIcon } from 'react-icons/ri';
import { PiSun as ColorIcon } from 'react-icons/pi';
import { MdOutlineHeadphones as TTSIcon } from 'react-icons/md';
import { useEnv } from '@/context/EnvContext';
import { useReaderStore } from '@/store/readerStore';
import { useTranslation } from '@/hooks/useTranslation';
import { useSidebarStore } from '@/store/sidebarStore';
import { useResponsiveSize } from '@/hooks/useResponsiveSize';
import Button from '@/components/Button';
import { Insets } from '@/types/misc';

interface NavigationBarProps {
  bookKey: string;
  actionTab: string;
  gridInsets: Insets;
  forceMobileLayout: boolean;
  // Keeps the row clear of iPhone Duo's side status strip (#6307).
  insetStyle?: React.CSSProperties;
  onSetActionTab: (tab: string) => void;
}

export const NavigationBar: React.FC<NavigationBarProps> = ({
  bookKey,
  actionTab,
  gridInsets,
  forceMobileLayout,
  insetStyle,
  onSetActionTab,
}) => {
  const isMobile = forceMobileLayout || window.innerWidth < 640 || window.innerHeight < 640;
  const _ = useTranslation();
  const { appService } = useEnv();
  const { getViewState } = useReaderStore();
  const { isSideBarVisible, isSideBarPinned } = useSidebarStore();

  const viewState = getViewState(bookKey);
  const tocIconSize = useResponsiveSize(23);
  const fontIconSize = useResponsiveSize(18);
  const navPadding = isMobile ? `${gridInsets.bottom * 0.33 + 16}px` : '0px';

  return (
    <div
      className={clsx(
        'not-eink:bg-base-100/95 not-eink:backdrop-blur-md not-eink:shadow-[0_-4px_24px_rgba(0,0,0,0.06)] border-t border-base-content/5 eink:bg-base-100 z-30 mt-auto flex w-full justify-between px-6 py-3 transition-all',
        'eink:border-base-content eink:border-t',
        !forceMobileLayout && 'sm:hidden',
      )}
      style={{
        paddingBottom: appService?.isAndroidApp
          ? `calc(env(safe-area-inset-bottom) + 12px)`
          : navPadding,
        ...insetStyle,
      }}
    >
      {isSideBarVisible && isSideBarPinned ? null : (
        <Button
          label={_('Table of Contents')}
          icon={<TOCIcon size={tocIconSize} />}
          onClick={() => onSetActionTab('toc')}
        />
      )}
      <Button
        label={_('Color')}
        icon={<ColorIcon className={clsx(actionTab === 'color' && 'text-primary scale-110')} />}
        onClick={() => onSetActionTab('color')}
      />
      <Button
        label={_('Reading Progress')}
        icon={<SliderIcon className={clsx(actionTab === 'progress' && 'text-primary scale-110')} />}
        onClick={() => onSetActionTab('progress')}
      />
      <Button
        label={_('Font & Layout')}
        icon={
          <FontIcon
            size={fontIconSize}
            className={clsx(actionTab === 'font' && 'text-primary scale-110')}
          />
        }
        onClick={() => onSetActionTab('font')}
      />
      <Button
        label={_('Speak')}
        icon={<TTSIcon className={viewState?.ttsEnabled ? 'text-primary scale-110' : ''} />}
        onClick={() => onSetActionTab('tts')}
      />
    </div>
  );
};
