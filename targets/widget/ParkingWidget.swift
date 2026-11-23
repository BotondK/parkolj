import SwiftUI
import WidgetKit

// „Parkolásom”: aktív parkolás élő visszaszámlálással (a rendszer számol, az app nélkül is pontos),
// +15 perc és leállítás gombbal. Kezdőképernyőn kicsi és közepes, zárolt képernyőn kör, téglalap és egysoros.

struct ParkingEntry: TimelineEntry {
  let date: Date
  let data: WData
}

struct ParkingProvider: TimelineProvider {
  func placeholder(in context: Context) -> ParkingEntry { ParkingEntry(date: .now, data: sample()) }
  func getSnapshot(in context: Context, completion: @escaping (ParkingEntry) -> Void) {
    let d = Store.load()
    completion(ParkingEntry(date: .now, data: context.isPreview && d.active == nil ? sample() : d))
  }
  func getTimeline(in context: Context, completion: @escaping (Timeline<ParkingEntry>) -> Void) {
    let d = Store.load()
    var entries = [ParkingEntry(date: .now, data: d)]
    // Színváltás 10 perccel a lejárat előtt és a lejáratkor; utána az app frissít (hosszabbítás, leállítás)
    if let a = d.active {
      let soon = a.end.addingTimeInterval(-soonMinutes * 60)
      if soon > .now { entries.append(ParkingEntry(date: soon, data: d)) }
      if a.end > .now { entries.append(ParkingEntry(date: a.end, data: d)) }
    }
    completion(Timeline(entries: entries, policy: .never))
  }
  /// Minta a widgetválasztóhoz
  func sample() -> WData {
    var d = WData()
    d.active = WActive(zone: "A", color: "#F15B22", plate: "ABC-123", place: "Magyar Állami Operaház",
                       startedAt: Date.now.addingTimeInterval(-50 * 60).timeIntervalSince1970 * 1000,
                       endsAt: Date.now.addingTimeInterval(70 * 60).timeIntervalSince1970 * 1000, canExtend: true)
    return d
  }
}

struct ParkingWidgetView: View {
  let entry: ParkingEntry
  @Environment(\.widgetFamily) var family
  @Environment(\.colorScheme) var scheme

  var body: some View {
    let t = Theme(dark: scheme == .dark)
    let d = entry.data
    let L = d.labels
    let st = state(d, at: entry.date)
    Group {
      switch family {
      case .accessoryCircular: circular(d, st)
      case .accessoryRectangular: rectangular(d, st, L)
      case .accessoryInline: inline(d, st, L)
      case .systemSmall: small(d, st, L, t)
      default: medium(d, st, L, t)
      }
    }
    .widgetURL(link(st == .idle ? "here" : "open"))
    .containerBackground(for: .widget) { scheme == .dark ? Color(hex: "#242328") : Color.white }
  }

  func statusColor(_ st: WState, _ t: Theme) -> Color { st == .expired ? t.danger : st == .soon ? t.warn : t.text }

  @ViewBuilder func countdown(_ a: WActive, _ st: WState, _ L: WLabels, size: CGFloat, _ t: Theme) -> some View {
    if st == .expired {
      Text(L.expired).font(.system(size: size, weight: .heavy)).foregroundStyle(t.danger)
    } else {
      Text(timerInterval: Date.now...max(a.end, .now), countsDown: true)
        .font(.system(size: size, weight: .heavy).monospacedDigit())
        .foregroundStyle(statusColor(st, t))
        .contentTransition(.numericText())
    }
  }

  func header(_ a: WActive, _ L: WLabels, _ t: Theme) -> some View {
    HStack(spacing: 10) {
      ZoneBadge(a: a)
      VStack(alignment: .leading, spacing: 1) {
        Text(a.zone.map { "\($0) \(L.zone) · \(a.plate)" } ?? a.plate).font(.system(size: 14, weight: .bold)).foregroundStyle(t.text).lineLimit(1)
        Text(a.place).font(.system(size: 12)).foregroundStyle(t.sub).lineLimit(1)
      }
    }
  }

  @ViewBuilder func idle(_ L: WLabels, _ t: Theme, buttons: Bool) -> some View {
    VStack(alignment: .leading, spacing: 6) {
      Label(L.title, systemImage: "parkingsign.square").font(.system(size: 14, weight: .heavy)).foregroundStyle(t.brand)
      Spacer(minLength: 0)
      Text(L.idle).font(.system(size: 16, weight: .bold)).foregroundStyle(t.text).lineLimit(2)
      if buttons { PillButton(text: L.here, symbol: "mappin.and.ellipse", url: link("here"), primary: true, t: t) }
      else { Text(L.idleSub).font(.system(size: 12)).foregroundStyle(t.sub).lineLimit(2) }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
  }

  @ViewBuilder func small(_ d: WData, _ st: WState, _ L: WLabels, _ t: Theme) -> some View {
    if let a = d.active {
      VStack(alignment: .leading, spacing: 4) {
        HStack { ZoneBadge(a: a, size: 30); Spacer(); Text(a.plate).font(.system(size: 12, weight: .bold)).foregroundStyle(t.sub) }
        Spacer(minLength: 0)
        countdown(a, st, L, size: 30, t)
        Text("\(L.expires) \(a.end, style: .time)").font(.system(size: 13, weight: .semibold)).foregroundStyle(t.sub)
        ProgressView(timerInterval: a.start...max(a.end, a.start.addingTimeInterval(1)), countsDown: false) { EmptyView() } currentValueLabel: { EmptyView() }
          .tint(st == .active ? t.brand : statusColor(st, t))
      }
    } else { idle(L, t, buttons: false) }
  }

  @ViewBuilder func medium(_ d: WData, _ st: WState, _ L: WLabels, _ t: Theme) -> some View {
    if let a = d.active {
      VStack(alignment: .leading, spacing: 8) {
        HStack(alignment: .top) {
          header(a, L, t)
          Spacer()
          VStack(alignment: .trailing, spacing: 0) {
            countdown(a, st, L, size: 26, t)
            Text("\(L.expires) \(a.end, style: .time)").font(.system(size: 12, weight: .semibold)).foregroundStyle(t.sub)
          }
        }
        ProgressView(timerInterval: a.start...max(a.end, a.start.addingTimeInterval(1)), countsDown: false) { EmptyView() } currentValueLabel: { EmptyView() }
          .tint(st == .active ? t.brand : statusColor(st, t))
        HStack(spacing: 8) {
          if st != .expired && a.canExtend { PillButton(text: L.extend, symbol: "plus", url: link("extend"), primary: true, t: t) }
          PillButton(text: L.stop, symbol: "stop.fill", url: link("stop"), primary: false, t: t)
        }
      }
    } else { idle(L, t, buttons: true) }
  }

  @ViewBuilder func circular(_ d: WData, _ st: WState) -> some View {
    if let a = d.active, st != .expired {
      ProgressView(timerInterval: a.start...max(a.end, a.start.addingTimeInterval(1)), countsDown: true) {
        Text(a.zone ?? "P")
      } currentValueLabel: {
        Text(a.zone ?? "P").font(.system(size: 18, weight: .black))
      }
      .progressViewStyle(.circular)
    } else {
      ZStack { AccessoryWidgetBackground(); Image(systemName: "parkingsign").font(.system(size: 20, weight: .bold)) }
    }
  }

  @ViewBuilder func rectangular(_ d: WData, _ st: WState, _ L: WLabels) -> some View {
    if let a = d.active {
      VStack(alignment: .leading, spacing: 0) {
        Text(a.zone.map { "\($0) \(L.zone) · \(a.plate)" } ?? a.plate).font(.system(size: 13, weight: .semibold)).lineLimit(1)
        if st == .expired { Text(L.expired).font(.system(size: 22, weight: .heavy)) }
        else { Text(timerInterval: Date.now...max(a.end, .now), countsDown: true).font(.system(size: 22, weight: .heavy).monospacedDigit()) }
        Text("\(L.expires) \(a.end, style: .time)").font(.system(size: 12)).lineLimit(1)
      }
      .frame(maxWidth: .infinity, alignment: .leading)
    } else {
      VStack(alignment: .leading) {
        Label(L.title, systemImage: "parkingsign").font(.system(size: 13, weight: .bold))
        Text(L.idle).font(.system(size: 13)).lineLimit(2)
      }
      .frame(maxWidth: .infinity, alignment: .leading)
    }
  }

  @ViewBuilder func inline(_ d: WData, _ st: WState, _ L: WLabels) -> some View {
    if let a = d.active, st != .expired {
      Text("\(Image(systemName: "parkingsign")) \(a.zone ?? "P") · \(L.expires) \(a.end, style: .time)")
    } else {
      Text("\(Image(systemName: "parkingsign")) \(d.active == nil ? L.idle : L.expired)")
    }
  }
}

struct ParkingWidget: Widget {
  let kind = "ParkolasWidget"
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: ParkingProvider()) { entry in
      ParkingWidgetView(entry: entry)
    }
    .configurationDisplayName(WLabels().title)
    .description("Aktív parkolás: zóna, hátralévő idő, +15 perc, leállítás.")
    .supportedFamilies([.systemSmall, .systemMedium, .accessoryCircular, .accessoryRectangular, .accessoryInline])
  }
}
