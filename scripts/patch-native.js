/**
 * Postinstall script: adds c++_shared to target_link_libraries in native CMake files.
 * Required for NDK 27+ which no longer links c++_shared implicitly.
 */
const fs = require('fs');
const path = require('path');

const nodeModules = path.join(__dirname, '..', 'node_modules');

function patchFile(relPath) {
  const filePath = path.join(nodeModules, relPath);
  if (!fs.existsSync(filePath)) {
    console.log(`[skip] ${relPath}`);
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');

  // Check if any target_link_libraries block is missing c++_shared
  const blocks = content.match(/target_link_libraries\([^)]+\)/g) || [];
  const needsPatch = blocks.some((b) => !b.includes('c++_shared'));

  if (!needsPatch) {
    console.log(`[ok]   ${relPath}`);
    return;
  }

  // Add c++_shared to each block that is missing it
  const patched = content.replace(/target_link_libraries\(([^)]+)\)/g, (match, args) => {
    if (args.includes('c++_shared')) return match;
    return match.slice(0, -1).trimEnd() + '\n  c++_shared\n)';
  });

  fs.writeFileSync(filePath, patched);
  console.log(`[fix]  ${relPath}`);
}

const files = [
  'react-native-worklets/android/CMakeLists.txt',
  'expo-updates/android/CMakeLists.txt',
  'react-native-screens/android/CMakeLists.txt',
  'react-native-screens/android/src/main/jni/CMakeLists.txt',
  'expo-modules-core/android/cmake/main.cmake',
  'react-native-gesture-handler/android/src/main/jni/CMakeLists.txt',
  'react-native-reanimated/android/CMakeLists.txt',
  'react-native-safe-area-context/android/src/main/jni/CMakeLists.txt',
  'react-native-svg/android/src/main/jni/CMakeLists.txt',
  'react-native/ReactAndroid/src/main/jni/CMakeLists.txt',
  'react-native/ReactAndroid/src/main/jni/react/hermes/tooling/CMakeLists.txt',
  'react-native/ReactCommon/jsi/CMakeLists.txt',
];

console.log('Patching NDK c++_shared linkage for NDK 27+ compatibility...');
files.forEach(patchFile);
console.log('Patch complete!');
