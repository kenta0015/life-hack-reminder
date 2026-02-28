Pod::Spec.new do |s|
  s.name           = 'ExpoWidgetBridge'
  s.version        = '1.0.0'
  s.summary        = 'Native bridge for copying images to the home screen widget.'
  s.description    = 'Expo module that copies images to the app group container for the iOS widget.'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platform       = :ios, '15.1'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
