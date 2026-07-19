const fs = require('fs');
const path = require('path');

const targetFile = path.resolve(
  __dirname,
  '../node_modules/react-native/ReactAndroid/cmake-utils/ReactNative-application.cmake'
);

if (!fs.existsSync(targetFile)) {
  console.log('[CMake Patch] ReactNative-application.cmake not found. Skipping.');
  process.exit(0);
}

try {
  let content = fs.readFileSync(targetFile, 'utf8');

  // Perform replacements if they haven't been applied yet
  let updated = false;

  const replacements = [
    {
      target: 'file(GLOB input_SRC CONFIGURE_DEPENDS\n                *.cpp\n                ${BUILD_DIR}/generated/autolinking/src/main/jni/*.cpp)',
      replacement: 'file(GLOB input_SRC CONFIGURE_DEPENDS\n                *.cpp\n                "${BUILD_DIR}/generated/autolinking/src/main/jni/*.cpp")'
    },
    {
      target: 'file(GLOB input_SRC CONFIGURE_DEPENDS\n                ${REACT_ANDROID_DIR}/cmake-utils/default-app-setup/*.cpp\n                ${BUILD_DIR}/generated/autolinking/src/main/jni/*.cpp)',
      replacement: 'file(GLOB input_SRC CONFIGURE_DEPENDS\n                "${REACT_ANDROID_DIR}/cmake-utils/default-app-setup/*.cpp"\n                "${BUILD_DIR}/generated/autolinking/src/main/jni/*.cpp")'
    },
    {
      target: '${PROJECT_BUILD_DIR}/generated/autolinking/src/main/jni)',
      replacement: '"${PROJECT_BUILD_DIR}/generated/autolinking/src/main/jni")'
    },
    {
      target: 'if(EXISTS ${PROJECT_BUILD_DIR}/generated/autolinking/src/main/jni/Android-autolinking.cmake)\n        include(${PROJECT_BUILD_DIR}/generated/autolinking/src/main/jni/Android-autolinking.cmake)',
      replacement: 'if(EXISTS "${PROJECT_BUILD_DIR}/generated/autolinking/src/main/jni/Android-autolinking.cmake")\n        include("${PROJECT_BUILD_DIR}/generated/autolinking/src/main/jni/Android-autolinking.cmake")'
    },
    {
      target: 'if(EXISTS ${PROJECT_BUILD_DIR}/generated/source/codegen/jni/CMakeLists.txt)\n        add_subdirectory(${PROJECT_BUILD_DIR}/generated/source/codegen/jni/ codegen_app_build)\n        get_property(APP_CODEGEN_TARGET DIRECTORY ${PROJECT_BUILD_DIR}/generated/source/codegen/jni/ PROPERTY BUILDSYSTEM_TARGETS)',
      replacement: 'if(EXISTS "${PROJECT_BUILD_DIR}/generated/source/codegen/jni/CMakeLists.txt")\n        add_subdirectory("${PROJECT_BUILD_DIR}/generated/source/codegen/jni/" codegen_app_build)\n        get_property(APP_CODEGEN_TARGET DIRECTORY "${PROJECT_BUILD_DIR}/generated/source/codegen/jni/" PROPERTY BUILDSYSTEM_TARGETS)'
    }
  ];

  for (const r of replacements) {
    const targetNormalized = r.target.replace(/\r\n/g, '\n');
    const replacementNormalized = r.replacement.replace(/\r\n/g, '\n');
    const contentNormalized = content.replace(/\r\n/g, '\n');
    
    if (contentNormalized.includes(targetNormalized) && !contentNormalized.includes(replacementNormalized)) {
      content = contentNormalized.replace(targetNormalized, replacementNormalized);
      updated = true;
    }
  }

  if (updated) {
    fs.writeFileSync(targetFile, content, 'utf8');
    console.log('[CMake Patch] Successfully applied space-in-path quotes to ReactNative-application.cmake');
  } else {
    console.log('[CMake Patch] ReactNative-application.cmake is already patched or does not contain matches.');
  }
} catch (err) {
  console.error('[CMake Patch] Error applying patch:', err);
}
