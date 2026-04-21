const BrandMark = ({ size = 'md', className = '' }) => {
  const sizeClass =
    size === 'sm'
      ? 'h-5 w-5 rounded-[6px]'
      : 'h-8 w-8 rounded-[10px]';

  return (
    <div
      className={`relative flex items-center justify-center bg-[linear-gradient(145deg,#1F2937,#0F172A)] ${sizeClass} ${className}`}
      aria-hidden="true"
    >
      <div className="absolute inset-[18%] rounded-[30%] bg-[linear-gradient(145deg,#4F7CFF,#2B59F3)]" />
      <div className="relative h-[34%] w-[34%] rounded-[28%] bg-white" />
      <div className="absolute right-[16%] top-[16%] h-[18%] w-[18%] rounded-[40%] bg-white/15" />
      <div className="absolute inset-[16%] rounded-[30%] border border-white/10" />
    </div>
  );
};

export default BrandMark;
