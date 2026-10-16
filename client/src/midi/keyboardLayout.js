const blackPitchClasses = [1, 3, 6, 8, 10];
const typingKeys = ['a', 'w', 's', 'e', 'd', 'f', 't', 'g', 'y', 'h', 'u', 'j', 'k', 'o', 'l', 'p', ';'];
export const typingVelocity = 96;
export const lowestOctaveStart = 24;
export const highestOctaveStart = 96;
const softestTouch = 30;
const loudestTouch = 127;

export function isBlackKey(pitch) {
  return blackPitchClasses.includes(pitch % 12);
}

export function keyboardKeys(firstPitch, octaves) {
  const keys = [];
  let whiteIndex = 0;
  for (let pitch = firstPitch; pitch < firstPitch + octaves * 12; pitch += 1) {
    const black = isBlackKey(pitch);
    keys.push({ pitch, black, whiteIndex: black ? whiteIndex - 1 : whiteIndex });
    if (!black) whiteIndex += 1;
  }
  return keys;
}

export function typedPitch(key, firstPitch) {
  const offset = typingKeys.indexOf(key.toLowerCase());
  return offset === -1 ? null : firstPitch + offset;
}

export function velocityFromTouch(fractionDown) {
  const clamped = Math.min(1, Math.max(0, fractionDown));
  return Math.round(softestTouch + (loudestTouch - softestTouch) * clamped);
}

export function shiftOctave(firstPitch, direction) {
  return Math.min(highestOctaveStart, Math.max(lowestOctaveStart, firstPitch + direction * 12));
}
