import clsx from 'clsx';
import React, { useState } from 'react';

interface AnnotationToolButtonProps {
  showTooltip: boolean;
  tooltipText: string;
  disabled?: boolean;
  Icon: React.ElementType;
  onClick: () => void;
}

const AnnotationToolButton: React.FC<AnnotationToolButtonProps> = ({
  showTooltip,
  tooltipText,
  disabled,
  Icon,
  onClick,
}) => {
  const [buttonClicked, setButtonClicked] = useState(false);
  const handleClick = () => {
    setButtonClicked(true);
    onClick();
  };
  return (
    <div
      className='lg:tooltip lg:tooltip-bottom'
      title={!buttonClicked && showTooltip ? tooltipText : undefined}
    >
      <button
        type='button'
        onClick={handleClick}
        aria-label={tooltipText}
        className={clsx(
          'flex flex-col items-center justify-center shrink-0 min-w-9 h-10 px-1 py-0.5 rounded-xl transition-all',
          disabled
            ? 'cursor-not-allowed opacity-40'
            : 'not-eink:hover:bg-base-200/80 not-eink:active:bg-base-300 not-eink:active:scale-95',
        )}
        disabled={disabled}
      >
        <Icon className='w-4 h-4 text-base-content/85' />
        <span className='text-[10px] leading-tight font-normal text-base-content/75 mt-0.5 whitespace-nowrap'>
          {tooltipText}
        </span>
      </button>
    </div>
  );
};

export default AnnotationToolButton;
