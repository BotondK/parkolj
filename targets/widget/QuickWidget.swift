import SwiftUI
import WidgetKit

// „Gyors indítás”: Parkolás itt, Otthon, Munkahely egy koppintással.

struct QuickEntry: TimelineEntry {
  let date: Date
  let data: WData
}

struct QuickProvider: TimelineProvider {
  func placeholder(in context: Context) -> QuickEntry { QuickEntry(date: .now, data: WData()) }
  func getSnapshot(in context: Context, completion: @escaping (QuickEntry) -> Void) { completion(QuickEntry(date: .now, data: Store.load())) }
  func getTimeline(in context: Context, completion: @escaping (Timeline<QuickEntry>) -> Void) {
    completion(Timeline(entries: [QuickEntry(date: .now, data: Store.load())], policy: .never))
  }
}

struct QuickWidgetView: View {
  let entry: QuickEntry
  @Environment(\.widgetFamily) var family
  @Environment(\.colorScheme) var scheme

  var body: some View {
    let t = Theme(dark: scheme == .dark)
    let d = entry.data
    let L = d.labels
    Group {
      if family == .systemSmall {
        VStack(spacing: 8) {
          tile("here", "mappin.and.ellipse", L.here, nil, primary: true, t)
          HStack(spacing: 8) {
            tile("home", "house", L.home, nil, primary: false, t)
            tile("work", "building.2", L.work, nil, primary: false, t)
          }
        }
      } else {
        HStack(spacing: 8) {
          tile("here", "mappin.and.ellipse", L.here, nil, primary: true, t)
          tile("home", "house", L.home, d.home ?? L.notSet, primary: false, t)
          tile("work", "building.2", L.work, d.work ?? L.notSet, primary: false, t)
        }
      }
    }
    .containerBackground(for: .widget) { scheme == .dark ? Color(hex: "#242328") : Color.white }
  }

  func tile(_ action: String, _ symbol: String, _ label: String, _ sub: String?, primary: Bool, _ t: Theme) -> some View {
    Link(destination: link(action)) {
      VStack(spacing: 4) {
        Image(systemName: symbol).font(.system(size: 22, weight: .semibold))
        Text(label).font(.system(size: 13, weight: .bold)).lineLimit(1).minimumScaleFactor(0.8)
        if let sub { Text(sub).font(.system(size: 11)).lineLimit(1).opacity(0.75) }
      }
      .foregroundStyle(primary ? t.onBtn : t.onBtn2)
      .frame(maxWidth: .infinity, maxHeight: .infinity)
      .background(RoundedRectangle(cornerRadius: 16).fill(primary ? t.btn : t.btn2))
    }
  }
}

struct QuickWidget: Widget {
  let kind = "GyorsWidget"
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: QuickProvider()) { entry in
      QuickWidgetView(entry: entry)
    }
    .configurationDisplayName(WLabels().quickTitle)
    .description("Parkolás itt, Otthon, Munkahely egy koppintással.")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}
