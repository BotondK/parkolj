import Svg, { Circle, Path, Rect } from 'react-native-svg';

// Egyszerű vonalas ikonok (saját rajz), a városi közlekedési appok stílusában.
export type IconName =
  | 'map' | 'star' | 'starFill' | 'ticket' | 'menu' | 'home' | 'work' | 'search' | 'bell' | 'gear' | 'card' | 'info'
  | 'user' | 'chevron' | 'back' | 'car' | 'pin' | 'trash' | 'plus' | 'receipt' | 'users' | 'finger' | 'coupon'
  | 'moon' | 'globe' | 'help' | 'logout' | 'close' | 'check' | 'clock' | 'external' | 'parking' | 'chat';

export function Icon({ name, size = 24, color = '#000', stroke = 1.8 }: { name: IconName; size?: number; color?: string; stroke?: number }) {
  const p = { stroke: color, strokeWidth: stroke, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const body = (() => {
    switch (name) {
      case 'map':
        return (
          <>
            <Path {...p} d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20z" />
            <Path {...p} d="M8 11h1.5M11 11h1.5M15 10l2 2m0-2-2 2" />
          </>
        );
      case 'star':
        return <Path {...p} d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />;
      case 'starFill':
        return <Path {...p} fill={color} d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />;
      case 'ticket':
        return (
          <>
            <Rect {...p} x="6" y="2.5" width="12" height="19" rx="2" />
            <Path {...p} d="M9 6h1m2 0h1m2 0h0M9 9h1m2 0h1m2 0h0M9 12h1m2 0h1m2 0h0" />
            <Path {...p} d="m10 18 2-2 2 2" />
          </>
        );
      case 'menu':
        return <Path {...p} d="M8 6h13M8 12h13M8 18h13M3.5 6h.5M3.5 12h.5M3.5 18h.5" />;
      case 'home':
        return <Path {...p} d="M3 11 12 3.5 21 11M5.5 9v11h5v-6h3v6h5V9" />;
      case 'work':
        return (
          <>
            <Rect {...p} x="5" y="3" width="14" height="18" rx="1" />
            <Path {...p} d="M8.5 7h2m3 0h2m-7 4h2m3 0h2m-7 4h2m3 0h2M10.5 21v-3h3v3" />
          </>
        );
      case 'search':
        return (
          <>
            <Circle {...p} cx="10.5" cy="10.5" r="6" strokeWidth={stroke + 0.6} />
            <Path {...p} strokeWidth={stroke + 0.8} d="m15 15 5.5 5.5" />
          </>
        );
      case 'bell':
        return <Path {...p} d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0" />;
      case 'gear':
        return (
          <>
            <Circle {...p} cx="12" cy="12" r="3" />
            <Path {...p} d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6" />
            <Circle {...p} cx="12" cy="12" r="7" />
          </>
        );
      case 'card':
        return (
          <>
            <Rect {...p} x="2.5" y="5" width="19" height="14" rx="2" />
            <Path {...p} d="M2.5 9.5h19M6 15h4" />
          </>
        );
      case 'info':
        return (
          <>
            <Circle {...p} cx="12" cy="12" r="9" />
            <Path {...p} d="M12 11v6M12 7.5v.5" />
          </>
        );
      case 'help':
        return (
          <>
            <Circle {...p} cx="12" cy="12" r="9" />
            <Path {...p} d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17v.3" />
          </>
        );
      case 'user':
        return (
          <>
            <Circle {...p} cx="12" cy="8" r="4" />
            <Path {...p} d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
          </>
        );
      case 'users':
        return (
          <>
            <Circle {...p} cx="9" cy="8" r="3.5" />
            <Circle {...p} cx="16.5" cy="7" r="3" />
            <Path {...p} d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6M15.5 13c3.2 0 6 2 6 5.5" />
          </>
        );
      case 'chevron':
        return <Path {...p} strokeWidth={stroke + 0.4} d="m9 5 7 7-7 7" />;
      case 'back':
        return <Path {...p} strokeWidth={stroke + 0.4} d="m15 5-7 7 7 7" />;
      case 'car':
        return (
          <>
            <Path {...p} d="M4 16v-4l2-5.5h12L20 12v4zM4 16v2.5h3V16M17 16v2.5h3V16M4 12h16" />
            <Circle {...p} cx="7.5" cy="14" r=".6" />
            <Circle {...p} cx="16.5" cy="14" r=".6" />
          </>
        );
      case 'pin':
        return (
          <>
            <Path {...p} d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
            <Circle {...p} cx="12" cy="9.5" r="2.5" />
          </>
        );
      case 'trash':
        return <Path {...p} d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" />;
      case 'plus':
        return <Path {...p} strokeWidth={stroke + 0.4} d="M12 5v14M5 12h14" />;
      case 'receipt':
        return (
          <>
            <Path {...p} d="M6 3h9l3 3v15H6z" />
            <Path {...p} d="M9 9h2.5M9 9v5m0-2.5h2M9 17h6M13.5 9.5h2" />
          </>
        );
      case 'finger':
        return <Path {...p} d="M8 20c-1-1.8-1.5-3.8-1.5-6a5.5 5.5 0 0 1 11 0v1M12 21c-.8-2-1.2-4.2-1.2-6.5a1.2 1.2 0 0 1 2.4 0c0 2.6.5 4.6 1.3 6.3M5 9.5A8 8 0 0 1 19.5 9M17.5 18.5c.3-1 .4-2 .4-3" />;
      case 'coupon':
        return (
          <>
            <Circle {...p} cx="12" cy="12" r="9" />
            <Path {...p} d="m8.5 15.5 7-7M9 9.3v.1M15 14.7v.1" strokeWidth={stroke + 0.4} />
          </>
        );
      case 'moon':
        return <Path {...p} d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />;
      case 'globe':
        return (
          <>
            <Circle {...p} cx="12" cy="12" r="9" />
            <Path {...p} d="M3 12h18M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9S9.5 5.5 12 3z" />
          </>
        );
      case 'logout':
        return <Path {...p} d="M14 4H5v16h9M10 12h11m-3.5-3.5L21 12l-3.5 3.5" />;
      case 'close':
        return <Path {...p} strokeWidth={stroke + 0.4} d="m6 6 12 12M18 6 6 18" />;
      case 'check':
        return <Path {...p} strokeWidth={stroke + 0.4} d="m5 12.5 4.5 4.5L19 7.5" />;
      case 'clock':
        return (
          <>
            <Circle {...p} cx="12" cy="12" r="9" />
            <Path {...p} d="M12 7v5l3.5 2" />
          </>
        );
      case 'parking':
        // Parkolás tábla: lekerekített négyzet, benne „P”
        return (
          <>
            <Rect {...p} x="3.5" y="3.5" width="17" height="17" rx="4" />
            <Path {...p} strokeWidth={stroke + 0.5} d="M10 17V7.5h3a2.75 2.75 0 0 1 0 5.5h-3" />
          </>
        );
      case 'chat':
        return <Path {...p} d="M4 5.5h16v10H10l-4.5 4v-4H4z M8 9.5h8M8 12.5h5" />;
      case 'external':
        return <Path {...p} d="M13 4h7v7M20 4l-9 9M18 14v6H4V6h6" />;
    }
  })();
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {body}
    </Svg>
  );
}
