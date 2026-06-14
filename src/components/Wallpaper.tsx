import { useStore } from '@/store/store';

export function Wallpaper() {
  const bgImage = useStore((s) => s.bgImage);
  if (!bgImage) return null;
  return <img className="wallpaper" src={bgImage} alt="" aria-hidden draggable={false} />;
}
