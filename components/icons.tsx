import type { SVGProps } from "react";
import { LOGO_PATH, LOGO_VIEWBOX } from "./logo-path";

type P = SVGProps<SVGSVGElement> & { size?: number };

function Stroke({ size = 20, children, ...rest }: P & { children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true" focusable="false" {...rest}>
      {children}
    </svg>
  );
}

export const SearchIcon = (p: P) => <Stroke {...p}><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5L21 21" /></Stroke>;
export const BagIcon = (p: P) => <Stroke {...p}><path d="M4 8h16l-1.2 13H5.2L4 8z" /><path d="M8.5 8V6.5a3.5 3.5 0 0 1 7 0V8" /></Stroke>;
export const MenuIcon = (p: P) => <Stroke {...p}><path d="M3 7h18M3 12h18M3 17h12" /></Stroke>;
export const CloseIcon = (p: P) => <Stroke {...p}><path d="M5 5l14 14M19 5L5 19" /></Stroke>;
export const ArrowRightIcon = (p: P) => <Stroke {...p}><path d="M4 12h15M13 6l6 6-6 6" /></Stroke>;
export const PlusIcon = (p: P) => <Stroke {...p}><path d="M12 5v14M5 12h14" /></Stroke>;
export const MinusIcon = (p: P) => <Stroke {...p}><path d="M5 12h14" /></Stroke>;
export const ChevronDownIcon = (p: P) => <Stroke {...p}><path d="M6 9l6 6 6-6" /></Stroke>;
export const TruckIcon = (p: P) => <Stroke {...p}><path d="M2 6h12v10H2zM14 10h4l3 3v3h-7" /><circle cx="6" cy="18" r="1.8" /><circle cx="17" cy="18" r="1.8" /></Stroke>;
export const ReturnIcon = (p: P) => <Stroke {...p}><path d="M9 7L4 12l5 5" /><path d="M4 12h11a5 5 0 0 1 0 10h-3" /></Stroke>;
export const ShieldIcon = (p: P) => <Stroke {...p}><path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6l8-3z" /><path d="M8.5 12l2.5 2.5 4.5-5" /></Stroke>;

export function WhatsAppIcon({ size = 20, ...rest }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...rest}>
      <path fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" d="M3.6 20.4l1.25-4.15A8.6 8.6 0 1 1 8.1 19.5L3.6 20.4z" />
      <path fill="currentColor" d="M9.1 7.3c.25-.55.5-.56.85-.57h.6c.2 0 .45.07.6.42l.8 1.95c.1.25.05.48-.08.68l-.55.7c-.13.17-.2.33-.04.6.62 1.04 1.5 1.85 2.6 2.4.28.13.44.1.6-.08l.72-.86c.18-.22.4-.27.66-.17l1.85.88c.26.13.43.2.43.44 0 .5-.2 1.32-.98 1.84-.66.44-1.55.58-2.6.26-2.1-.66-3.9-2.3-5-4.25-.62-1.12-.82-2.35-.3-3.36z" />
    </svg>
  );
}

export function TikTokIcon({ size = 20, ...rest }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...rest}>
      <path fill="currentColor" d="M14 2.5h3.1c.25 1.85 1.6 3.4 3.6 3.6v3.15c-1.35 0-2.6-.4-3.6-1.05v6.55a5.4 5.4 0 1 1-5.4-5.4c.3 0 .6.03.9.08v3.2a2.3 2.3 0 1 0 1.4 2.12V2.5z" />
    </svg>
  );
}

/** The client's horned M, traced from their logo artwork (scripts/trace-logo.mjs). */
export function LogoMark({ size = 28, ...rest }: P) {
  return (
    <svg height={size} viewBox={LOGO_VIEWBOX} aria-hidden="true" focusable="false" {...rest}>
      <path fill="currentColor" d={LOGO_PATH} />
    </svg>
  );
}
