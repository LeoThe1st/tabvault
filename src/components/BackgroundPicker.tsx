import { useRef, useState } from 'react';
import { useStore } from '@/store/store';
import { useDialogs } from '@/dialogs/DialogHost';
import { Popover } from './Popover';
import { LinkIcon, TrashIcon, UploadIcon, WallpaperIcon } from './icons';

export function BackgroundPicker() {
  const dialogs = useDialogs();
  const bgImage = useStore((s) => s.bgImage);
  const setBgImage = useStore((s) => s.setBgImage);
  const fileRef = useRef<HTMLInputElement>(null);
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);

  const onUrl = async () => {
    setAnchor(null);
    const url = await dialogs.prompt({
      title: 'Обои из URL',
      label: 'Image URL',
      required: true,
      placeholder: 'https://example.com/bg.jpg'
    });
    if (url) setBgImage(url);
  };

  const onUpload = () => {
    setAnchor(null);
    fileRef.current?.click();
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      await dialogs.alert({
        title: 'Обои',
        message: 'Файл слишком большой (максимум 8 МБ).'
      });
      return;
    }
    const dataUrl = await new Promise<string>((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.onerror = rej;
      r.readAsDataURL(file);
    });
    setBgImage(dataUrl);
  };

  return (
    <div className="fab fab-bl">
      <button
        className="fab-btn"
        title="Обои"
        aria-label="wallpaper"
        onClick={(e) => setAnchor(anchor ? null : e.currentTarget)}
      >
        <WallpaperIcon />
      </button>
      <input type="file" ref={fileRef} accept="image/*" hidden onChange={onFile} />
      {anchor && (
        <Popover anchor={anchor} placement="right-of" onClose={() => setAnchor(null)}>
          <button onClick={() => void onUrl()}>
            <LinkIcon /> Из URL
          </button>
          <button onClick={onUpload}>
            <UploadIcon /> С компьютера
          </button>
          {bgImage && (
            <>
              <div className="sep" />
              <button className="danger" onClick={() => setBgImage(null)}>
                <TrashIcon /> Убрать обои
              </button>
            </>
          )}
        </Popover>
      )}
    </div>
  );
}
