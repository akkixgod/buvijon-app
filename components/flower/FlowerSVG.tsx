import React from 'react';
import Svg, {
  Circle, Path, G, Defs,
  LinearGradient, Stop, Ellipse,
} from 'react-native-svg';
import { FlowerState } from '@/types';

interface FlowerSVGProps {
  variant?: 'rose' | 'tulip' | 'sunflower' | 'daisy' | 'lily';
  state: FlowerState;
  color: string;
  size?: number;
  droopAmount?: number;
}

interface FlowerColors {
  petal: string;
  petalLight: string;
  petalDark: string;
  center: string;
  centerDark: string;
  stem: string;
  leaf: string;
}

function buildColors(color: string, state: FlowerState): FlowerColors {
  if (state === 'wilting') {
    return {
      petal: '#B0BEC5', petalLight: '#CFD8DC', petalDark: '#90A4AE',
      center: '#78909C', centerDark: '#607D8B',
      stem: '#78909C', leaf: '#90A4AE',
    };
  }
  return {
    petal: color, petalLight: color, petalDark: color,
    center: state === 'warning' ? '#FDD835' : '#FFF176',
    centerDark: state === 'warning' ? '#F9A825' : '#F9A825',
    stem: '#388E3C', leaf: '#43A047',
  };
}

/** Generic smooth petal path pointing upward from center (60,60) */
function petalPath(innerR: number, outerR: number, hw: number): string {
  const baseY = 60 - innerR;
  const tipY = 60 - outerR;
  const ctrl1Y = baseY - (baseY - tipY) * 0.25;
  const ctrl2Y = tipY + (baseY - tipY) * 0.18;
  return [
    `M 60 ${baseY}`,
    `C ${60 - hw} ${ctrl1Y} ${60 - hw * 0.4} ${ctrl2Y} 60 ${tipY}`,
    `C ${60 + hw * 0.4} ${ctrl2Y} ${60 + hw} ${ctrl1Y} 60 ${baseY}`,
    'Z',
  ].join(' ');
}

export function FlowerSVG({ variant = 'daisy', state, color, size = 120, droopAmount = 0 }: FlowerSVGProps) {
  const c = buildColors(color, state);
  const droop = droopAmount * 20;

  const stemPath = `M 60 112 Q ${57 + droop * 0.8} 92 ${59 + droop * 0.4} 72`;
  const leafPath = `M ${51 - droop * 0.4} 88 Q ${38 - droop} 80 ${46 - droop * 0.3} 96 Q ${49} 92 ${51 - droop * 0.4} 88 Z`;

  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Defs>
        <LinearGradient id="stemGrad" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={c.stem} stopOpacity="1" />
          <Stop offset="1" stopColor="#1B5E20" stopOpacity="1" />
        </LinearGradient>
        <LinearGradient id="petalGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={c.petalLight} stopOpacity="1" />
          <Stop offset="1" stopColor={c.petalDark} stopOpacity="0.85" />
        </LinearGradient>
        <LinearGradient id="centerGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={c.center} stopOpacity="1" />
          <Stop offset="1" stopColor={c.centerDark} stopOpacity="1" />
        </LinearGradient>
      </Defs>

      {/* Stem */}
      <Path d={stemPath} stroke={c.stem} strokeWidth={3.5} strokeLinecap="round" fill="none" />
      {/* Leaf */}
      <Path d={leafPath} fill={c.leaf} />

      {/* Flower head, rotated when wilting */}
      <G rotation={droop} originX={60} originY={72}>
        {variant === 'sunflower' && <Sunflower c={c} />}
        {variant === 'rose'      && <Rose c={c} />}
        {variant === 'daisy'     && <Daisy c={c} />}
        {variant === 'tulip'     && <Tulip c={c} />}
        {variant === 'lily'      && <Lily c={c} />}
      </G>
    </Svg>
  );
}

// ─── SUNFLOWER ────────────────────────────────────────────────────────────────
function Sunflower({ c }: { c: FlowerColors }) {
  const outerPetal = petalPath(16, 46, 8);
  const innerPetal = petalPath(16, 42, 6);

  // Seed positions for center
  const seeds: Array<{cx: number; cy: number}> = [];
  for (let i = 0; i < 12; i++) {
    const a = (i * 30) * (Math.PI / 180);
    seeds.push({ cx: 60 + 11 * Math.cos(a), cy: 60 + 11 * Math.sin(a) });
  }
  for (let i = 0; i < 6; i++) {
    const a = (i * 60 + 15) * (Math.PI / 180);
    seeds.push({ cx: 60 + 6 * Math.cos(a), cy: 60 + 6 * Math.sin(a) });
  }

  return (
    <G>
      {/* Outer petals */}
      {Array.from({ length: 8 }).map((_, i) => (
        <Path
          key={`op${i}`}
          d={outerPetal}
          fill={c.petal}
          opacity={0.92}
          transform={`rotate(${i * 45}, 60, 60)`}
        />
      ))}
      {/* Inner petals (offset 22.5°) */}
      {Array.from({ length: 8 }).map((_, i) => (
        <Path
          key={`ip${i}`}
          d={innerPetal}
          fill={c.petal}
          opacity={0.72}
          transform={`rotate(${i * 45 + 22.5}, 60, 60)`}
        />
      ))}
      {/* Center disc */}
      <Circle cx={60} cy={60} r={16} fill="#5D4037" />
      <Circle cx={60} cy={60} r={14} fill="#4E342E" />
      {seeds.map((s, i) => (
        <Circle key={i} cx={s.cx} cy={s.cy} r={1.8} fill="#3E2723" opacity={0.8} />
      ))}
      <Circle cx={60} cy={60} r={3} fill="#6D4C41" />
    </G>
  );
}

// ─── ROSE ─────────────────────────────────────────────────────────────────────
function Rose({ c }: { c: FlowerColors }) {
  const outerPetal = petalPath(8, 44, 12);
  const midPetal   = petalPath(8, 34, 9);
  const innerPetal = petalPath(8, 22, 6);

  return (
    <G>
      {/* 5 outer petals */}
      {[0, 72, 144, 216, 288].map((a, i) => (
        <Path key={`r1${i}`} d={outerPetal} fill={c.petal} opacity={0.75} transform={`rotate(${a}, 60, 60)`} />
      ))}
      {/* 5 middle petals (offset 36°) */}
      {[36, 108, 180, 252, 324].map((a, i) => (
        <Path key={`r2${i}`} d={midPetal} fill={c.petal} opacity={0.88} transform={`rotate(${a}, 60, 60)`} />
      ))}
      {/* 3 inner petals */}
      {[0, 120, 240].map((a, i) => (
        <Path key={`r3${i}`} d={innerPetal} fill={c.petal} opacity={0.95} transform={`rotate(${a}, 60, 60)`} />
      ))}
      {/* Center bud */}
      <Circle cx={60} cy={60} r={10} fill={c.petal} />
      <Circle cx={60} cy={60} r={6} fill={c.center} opacity={0.5} />
      <Circle cx={60} cy={60} r={3} fill={c.petal} />
    </G>
  );
}

// ─── DAISY ────────────────────────────────────────────────────────────────────
function Daisy({ c }: { c: FlowerColors }) {
  const longPetal  = petalPath(13, 48, 4.5);
  const shortPetal = petalPath(13, 42, 3.5);

  return (
    <G>
      {/* 8 long outer petals */}
      {Array.from({ length: 8 }).map((_, i) => (
        <Path
          key={`dl${i}`}
          d={longPetal}
          fill={c.petal}
          opacity={0.9}
          transform={`rotate(${i * 45}, 60, 60)`}
        />
      ))}
      {/* 8 shorter inner petals (offset 22.5°) */}
      {Array.from({ length: 8 }).map((_, i) => (
        <Path
          key={`ds${i}`}
          d={shortPetal}
          fill={c.petal}
          opacity={0.72}
          transform={`rotate(${i * 45 + 22.5}, 60, 60)`}
        />
      ))}
      {/* Dome center */}
      <Circle cx={60} cy={60} r={14} fill={c.centerDark} opacity={0.4} />
      <Circle cx={60} cy={60} r={12} fill={c.center} />
      {/* Dome texture dots */}
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i * 45) * (Math.PI / 180);
        return (
          <Circle key={i} cx={60 + 7 * Math.cos(a)} cy={60 + 7 * Math.sin(a)}
            r={1.6} fill={c.centerDark} opacity={0.7} />
        );
      })}
      <Circle cx={60} cy={60} r={3} fill={c.centerDark} opacity={0.8} />
    </G>
  );
}

// ─── TULIP ────────────────────────────────────────────────────────────────────
function Tulip({ c }: { c: FlowerColors }) {
  // Tulip cup — characteristic vase shape
  // 3 back petals + 3 front petals visible from slight angle
  const backLeft  = 'M 48 70 C 36 64 32 50 36 38 C 38 30 44 26 50 28 C 48 40 46 56 48 70 Z';
  const backRight = 'M 72 70 C 84 64 88 50 84 38 C 82 30 76 26 70 28 C 72 40 74 56 72 70 Z';
  const backCenter= 'M 50 28 C 52 18 68 18 70 28 C 66 26 62 24 60 24 C 58 24 54 26 50 28 Z';
  const frontCup  = 'M 44 70 C 46 74 74 74 76 70 C 78 60 80 46 76 36 C 72 26 68 22 60 22 C 52 22 48 26 44 36 C 40 46 42 60 44 70 Z';
  // Petal separation lines (veins)
  const veinLeft  = 'M 52 68 C 50 54 52 40 56 30';
  const veinRight = 'M 68 68 C 70 54 68 40 64 30';

  return (
    <G>
      {/* Back petals (behind cup) */}
      <Path d={backLeft}   fill={c.petal} opacity={0.65} />
      <Path d={backRight}  fill={c.petal} opacity={0.65} />
      <Path d={backCenter} fill={c.petal} opacity={0.65} />
      {/* Main tulip cup */}
      <Path d={frontCup}  fill={c.petal} opacity={0.92} />
      {/* Petal veins (subtle) */}
      <Path d={veinLeft}  stroke={c.petalDark} strokeWidth={1} strokeOpacity={0.3} fill="none" />
      <Path d={veinRight} stroke={c.petalDark} strokeWidth={1} strokeOpacity={0.3} fill="none" />
      {/* Highlight on cup */}
      <Path d="M 52 30 C 54 26 60 24 64 26 C 62 30 56 32 52 30 Z"
        fill="white" opacity={0.2} />
    </G>
  );
}

// ─── LILY ─────────────────────────────────────────────────────────────────────
function Lily({ c }: { c: FlowerColors }) {
  // 6 reflexed petals — tips curl back outward
  const petal = petalPath(10, 45, 8);
  // Stamen positions
  const stamens = [
    { x: 60, y: 48 }, { x: 55, y: 50 }, { x: 65, y: 50 },
    { x: 57, y: 46 }, { x: 63, y: 46 },
  ];

  return (
    <G>
      {/* 6 petals at 60° intervals */}
      {Array.from({ length: 6 }).map((_, i) => (
        <G key={`lp${i}`} transform={`rotate(${i * 60}, 60, 60)`}>
          <Path d={petal} fill={c.petal} opacity={0.88} />
          {/* Spot markings on petals */}
          {[0.35, 0.55, 0.7].map((t, j) => {
            const spotY = 60 - (10 + (45 - 10) * t);
            return (
              <Circle key={j} cx={60} cy={spotY} r={1.8}
                fill={c.petalDark} opacity={0.4} />
            );
          })}
          {/* Center vein */}
          <Path
            d={`M 60 ${60 - 10} L 60 ${60 - 44}`}
            stroke={c.petalDark} strokeWidth={0.8} strokeOpacity={0.3}
          />
        </G>
      ))}
      {/* Stamens */}
      {stamens.map((s, i) => (
        <G key={`st${i}`}>
          <Path d={`M 60 60 L ${s.x} ${s.y}`}
            stroke={c.centerDark} strokeWidth={1} strokeOpacity={0.8} />
          <Circle cx={s.x} cy={s.y} r={2.5} fill={c.centerDark} />
        </G>
      ))}
      {/* Pistil */}
      <Circle cx={60} cy={60} r={5} fill={c.center} />
      <Circle cx={60} cy={60} r={3} fill={c.centerDark} />
    </G>
  );
}
