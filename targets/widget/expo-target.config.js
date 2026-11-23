// iPhone kezdő- és zárolt képernyős widgetek (WidgetKit, SwiftUI). A @bacons/apple-targets plugin a prebuild során
// köti be az Xcode-projektbe. Az app a közös App Group tárba írja a pillanatképet (src/widgets/sync.ios.ts).
/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: 'widget',
  name: 'ParkoljWidget',
  displayName: 'Parkolj',
  deploymentTarget: '17.0',
  bundleIdentifier: '.widget',
  colors: {
    $accent: { color: '#4A1466', darkColor: '#C9A9DC' },
    $widgetBackground: { color: '#FFFFFF', darkColor: '#242328' },
  },
  entitlements: {
    'com.apple.security.application-groups': config.ios.entitlements['com.apple.security.application-groups'],
  },
});
