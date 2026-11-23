import SwiftUI
import WidgetKit

// A pillanatkép, amit az app ír (src/widgets/widgetModel.ts → WidgetData). Ugyanazok a mezőnevek.
struct WLabels: Codable {
  var title = "Parkolásom", idle = "Nincs aktív parkolás", idleSub = "Koppints a parkolás indításához"
  var expires = "Lejár", expired = "Lejárt", soon = "Hamarosan lejár", extend = "+15 perc", stop = "Leállítás"
  var here = "Parkolás itt", home = "Otthon", work = "Munkahely", zone = "zóna", quickTitle = "Gyors indítás", notSet = "Beállítás"
}

struct WActive: Codable {
  var zone: String?
  var color: String
  var plate: String
  var place: String
  var startedAt: Double
  var endsAt: Double
  var canExtend: Bool
  var start: Date { Date(timeIntervalSince1970: startedAt / 1000) }
  var end: Date { Date(timeIntervalSince1970: endsAt / 1000) }
}

struct WData: Codable {
  var v = 1
  var lang = "hu"
  var updatedAt: Double = 0
  var active: WActive?
  var home: String?
  var work: String?
  var labels = WLabels()
}

enum Store {
  static let group = "group.hu.parkolj.app"
  static func load() -> WData {
    guard let s = UserDefaults(suiteName: group)?.string(forKey: "widget"),
          let raw = s.data(using: .utf8),
          let d = try? JSONDecoder().decode(WData.self, from: raw) else { return WData() }
    return d
  }
}

/// Mélylinkek az appba (src/widgets/widgetModel.ts → widgetUrl)
func link(_ action: String) -> URL { URL(string: "parkolj://widget/\(action)")! }

/// Ennyi perccel a lejárat előtt vált figyelmeztető színre (SOON_MIN)
let soonMinutes: Double = 10

enum WState { case idle, active, soon, expired }

func state(_ d: WData, at now: Date) -> WState {
  guard let a = d.active else { return .idle }
  let left = a.end.timeIntervalSince(now)
  if left <= 0 { return .expired }
  return left <= soonMinutes * 60 ? .soon : .active
}

extension Color {
  init(hex: String) {
    var v: UInt64 = 0
    Scanner(string: hex.replacingOccurrences(of: "#", with: "")).scanHexInt64(&v)
    self.init(red: Double((v >> 16) & 0xFF) / 255, green: Double((v >> 8) & 0xFF) / 255, blue: Double(v & 0xFF) / 255)
  }
}

/// Az app színei (WIDGET_THEME), világos és sötét módban
struct Theme {
  let dark: Bool
  var text: Color { dark ? Color(hex: "#F5F4F7") : Color(hex: "#1C1B1F") }
  var sub: Color { dark ? Color(hex: "#B6B3BE") : Color(hex: "#5E5D66") }
  var brand: Color { dark ? Color(hex: "#C9A9DC") : Color(hex: "#4A1466") }
  var btn: Color { dark ? Color(hex: "#B99BCB") : Color(hex: "#4A1466") }
  var onBtn: Color { dark ? Color(hex: "#2C0A3D") : .white }
  var btn2: Color { dark ? Color(hex: "#3A2D44") : Color(hex: "#F1E9F5") }
  var onBtn2: Color { dark ? Color(hex: "#F5F4F7") : Color(hex: "#4A1466") }
  var warn: Color { dark ? Color(hex: "#F5B85A") : Color(hex: "#9A4A06") }
  var danger: Color { dark ? Color(hex: "#FF8A8A") : Color(hex: "#B91C1C") }
}

struct ZoneBadge: View {
  let a: WActive
  var size: CGFloat = 34
  var body: some View {
    Text(a.zone ?? "P")
      .font(.system(size: size * 0.55, weight: .black))
      .foregroundStyle(.white)
      .frame(width: size, height: size)
      .background(RoundedRectangle(cornerRadius: 9).fill(Color(hex: a.color)))
      .accessibilityHidden(true)
  }
}

struct PillButton: View {
  let text: String
  let symbol: String
  let url: URL
  let primary: Bool
  let t: Theme
  var body: some View {
    Link(destination: url) {
      HStack(spacing: 6) {
        Image(systemName: symbol).font(.system(size: 13, weight: .bold))
        Text(text).font(.system(size: 14, weight: .bold)).lineLimit(1)
      }
      .foregroundStyle(primary ? t.onBtn : t.onBtn2)
      .frame(maxWidth: .infinity, minHeight: 36)
      .background(Capsule().fill(primary ? t.btn : t.btn2))
    }
  }
}
