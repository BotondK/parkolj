Pod::Spec.new do |s|
  s.name           = 'ParkoljLive'
  s.version        = '1.0.0'
  s.summary        = 'Élő tevékenység (Live Activity) az aktív parkoláshoz'
  s.license        = 'MIT'
  s.author         = 'Parkolj'
  s.homepage       = 'https://github.com/BotondK/parkolj'
  s.platforms      = { :ios => '16.4' }
  s.source         = { git: 'https://github.com/BotondK/parkolj.git' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks     = 'ActivityKit'
  s.source_files   = '**/*.{h,m,swift}'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
end
