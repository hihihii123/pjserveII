// ColorPicker.js
import React, { useState, useRef } from 'react';
import {
  View,
  PanResponder,
  StyleSheet,
  Text,
  Animated,
} from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Circle } from 'react-native-svg';
import tinycolor from 'tinycolor2';

const WHEEL_SIZE = 240;
const SLIDER_WIDTH = 240;
const SLIDER_HEIGHT = 20;

const generateColorWheel = () => {
  const segments = 360;
  const radius = WHEEL_SIZE / 2;
  const paths = [];

  for (let i = 0; i < segments; i++) {
    const startAngle = (i * Math.PI) / 180;
    const endAngle = ((i + 1) * Math.PI) / 180;

    const x1 = radius + radius * Math.cos(startAngle);
    const y1 = radius + radius * Math.sin(startAngle);
    const x2 = radius + radius * Math.cos(endAngle);
    const y2 = radius + radius * Math.sin(endAngle);

    const d = `M${radius},${radius} L${x1},${y1} A${radius},${radius} 0 0,1 ${x2},${y2} Z`;
    const fill = tinycolor({ h: i, s: 1, v: 1 }).toHexString();
    paths.push(<Path key={i} d={d} fill={fill} />);
  }

  return paths;
};

export default function ColorPicker({ color, onColorChange }) {
  const [hue, setHue] = useState(0);
  const [brightness, setBrightness] = useState(1);
  const [saturation, setSaturation] = useState(1);

  const updateColor = (h = hue, s = saturation, v = brightness) => {
    const hex = tinycolor({ h, s, v }).toHexString();
    let currentHue = h
    onColorChange(hex);
  };

  const currentColor = tinycolor({ h: hue, s: saturation, v: brightness }).toHexString();
  
  const handleWheelTouch = (evt) => {
    const { locationX, locationY } = evt.nativeEvent;
    const center = WHEEL_SIZE / 2;
    const dx = locationX - center;
    const dy = locationY - center;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > center) return;

    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    const newHue = (angle + 360) % 360;
    setHue(newHue);
    let currentHue = newHue;
    updateColor(newHue, saturation, brightness);
  };

  const panBrightness = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (evt) => {
        const layoutX = evt.nativeEvent.locationX;
        const clamped = Math.max(0, Math.min(layoutX, SLIDER_WIDTH));
        const value = clamped / SLIDER_WIDTH;
        setBrightness(value);
        updateColor(currentHue, saturation, value);
      },
    })
  ).current;

  const panSaturation = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (evt) => {
        const layoutX = evt.nativeEvent.locationX;
        const clamped = Math.max(0, Math.min(layoutX, SLIDER_WIDTH));
        const value = clamped / SLIDER_WIDTH;
        setSaturation(value);
        updateColor(currentHue, value, brightness);
      },
    })
  ).current;

  return (
    <View style={styles.container}>
      <View
        style={styles.wheelWrapper}
        onStartShouldSetResponder={() => true}
        onResponderGrant={handleWheelTouch}
        onResponderMove={handleWheelTouch}
      >
        <Svg width={WHEEL_SIZE} height={WHEEL_SIZE}>{generateColorWheel()}</Svg>
      </View>

      <Text style={styles.label}>Brightness</Text>
      <View style={styles.sliderWrapper} {...panBrightness.panHandlers}>
        <Svg width={SLIDER_WIDTH} height={SLIDER_HEIGHT}>
          <Defs>
            <LinearGradient id="brightnessGradient" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0%" stopColor="#000" />
              <Stop offset="100%" stopColor={tinycolor({ h: hue, s: saturation, v: 1 }).toHexString()} />
            </LinearGradient>
          </Defs>
          <Path
            d={`M0,0 H${SLIDER_WIDTH} V${SLIDER_HEIGHT} H0 Z`}
            fill="url(#brightnessGradient)"
          />
          <Circle
            cx={brightness * SLIDER_WIDTH}
            cy={SLIDER_HEIGHT / 2}
            r={6}
            fill="#fff"
            stroke="#000"
            strokeWidth={1.5}
          />
        </Svg>
      </View>

      <Text style={styles.label}>Saturation</Text>
      <View style={styles.sliderWrapper} {...panSaturation.panHandlers}>
        <Svg width={SLIDER_WIDTH} height={SLIDER_HEIGHT}>
          <Defs>
            <LinearGradient id="saturationGradient" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0%" stopColor="#fff" />
              <Stop offset="100%" stopColor={tinycolor({ h: hue, s: 1, v: brightness }).toHexString()} />
            </LinearGradient>
          </Defs>
          <Path
            d={`M0,0 H${SLIDER_WIDTH} V${SLIDER_HEIGHT} H0 Z`}
            fill="url(#saturationGradient)"
          />
          <Circle
            cx={saturation * SLIDER_WIDTH}
            cy={SLIDER_HEIGHT / 2}
            r={6}
            fill="#fff"
            stroke="#000"
            strokeWidth={1.5}
          />
        </Svg>
      </View>

      <View style={[styles.colorPreview, { backgroundColor: currentColor }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: 20,
  },
  wheelWrapper: {
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
    borderRadius: WHEEL_SIZE / 2,
    overflow: 'hidden',
  },
  sliderWrapper: {
    marginTop: 10,
    width: SLIDER_WIDTH,
    height: SLIDER_HEIGHT,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#aaa',
  },
  label: {
    marginTop: 10,
    fontWeight: '500',
  },
  colorPreview: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
});
