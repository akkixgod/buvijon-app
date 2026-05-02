import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Ellipse, Path } from 'react-native-svg';
import { Colors } from '@/constants/colors';

interface Props {
  size?: number;
  color?: string;
}

export function BuvijonLogo({ size = 48, color = Colors.primary }: Props) {
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 72 72" fill="none">
        {/* B letter body */}
        <Path
          d="M12 14 h10 c7 0 11 3 11 9 c0 4-2 7-6 8 c5 1 8 5 8 10 c0 7-5 11-12 11 H12 Z
             M19 20 v10 h4 c4 0 6-2 6-5 s-2-5-6-5 Z
             M19 36 v11 h5 c5 0 7-2 7-5.5 S29 36 24 36 Z"
          fill={color}
        />
        {/* Left needle (dark) */}
        <Line x1="40" y1="12" x2="32" y2="58" stroke="#1a1a2e" strokeWidth="3.5" strokeLinecap="round" />
        {/* Right needle (pink) */}
        <Line x1="58" y1="12" x2="32" y2="58" stroke={color} strokeWidth="3.5" strokeLinecap="round" />
        {/* Needle tips */}
        <Circle cx="40" cy="9" r="3.5" fill="#1a1a2e" />
        <Circle cx="58" cy="9" r="3.5" fill={color} />
        {/* Thread knot at base */}
        <Path d="M30 58 Q32 63 34 58" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />
        {/* Base shadow */}
        <Ellipse cx="32" cy="61" rx="4" ry="2" fill="#1a1a2e" opacity={0.15} />
      </Svg>
    </View>
  );
}
