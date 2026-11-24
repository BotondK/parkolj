import ActivityKit
import SwiftUI
import WidgetKit

// Élő tevékenység az aktív parkoláshoz: zárolt képernyőn (és értesítési sávként) meg a Dynamic Islandben.
// Az app indítja, frissíti és fejezi be (modules/parkolj-live). A visszaszámlálást a rendszer végzi.

private let liveBg = Color(hex: "#2C0A3D")
private let liveSub = Color(hex: "#D9C8E6")
private let liveBtn = Color(hex: "#C9A9DC")

struct LiveBadge: View {
  let zone: String?
  let color: String
  var size: CGFloat = 30
  var body: some View {
    Text(zone ?? "P")
      .font(.system(size: size * 0.55, weight: .black))
      .foregroundStyle(.white)
      .frame(width: size, height: size)
      .background(RoundedRectangle(cornerRadius: size * 0.27).fill(Color(hex: color)))
      .accessibilityHidden(true)
  }
}

struct LiveTimer: View {
  let state: ParkingActivityAttributes.ContentState
  let labels: ParkingActivityAttributes.Labels
  var size: CGFloat = 30
  var body: some View {
    if state.endsAt <= .now {
      Text(labels.expired).font(.system(size: size * 0.8, weight: .heavy)).foregroundStyle(Color(hex: "#FF8A8A"))
    } else {
      Text(timerInterval: Date.now...state.endsAt, countsDown: true)
        .font(.system(size: size, weight: .heavy).monospacedDigit())
        .multilineTextAlignment(.trailing)
    }
  }
}

struct LiveButtons: View {
  let state: ParkingActivityAttributes.ContentState
  let labels: ParkingActivityAttributes.Labels
  var body: some View {
    HStack(spacing: 8) {
      if state.canExtend && state.endsAt > .now {
        Link(destination: link("extend")) {
          Label(labels.extend, systemImage: "plus")
            .font(.system(size: 14, weight: .bold))
            .foregroundStyle(Color(hex: "#2C0A3D"))
            .frame(maxWidth: .infinity, minHeight: 34)
            .background(Capsule().fill(liveBtn))
        }
      }
      Link(destination: link("stop")) {
        Label(labels.stop, systemImage: "stop.fill")
          .font(.system(size: 14, weight: .bold))
          .foregroundStyle(.white)
          .frame(maxWidth: .infinity, minHeight: 34)
          .background(Capsule().fill(Color.white.opacity(0.16)))
      }
    }
  }
}

struct ParkingLiveLockView: View {
  let context: ActivityViewContext<ParkingActivityAttributes>
  var body: some View {
    let a = context.attributes
    let s = context.state
    VStack(alignment: .leading, spacing: 10) {
      HStack(alignment: .center, spacing: 10) {
        LiveBadge(zone: a.zone, color: a.color, size: 34)
        VStack(alignment: .leading, spacing: 1) {
          Text(a.zone.map { "\($0) \(a.labels.zone) · \(a.plate)" } ?? a.plate).font(.system(size: 15, weight: .bold)).lineLimit(1)
          Text(a.place).font(.system(size: 12)).foregroundStyle(liveSub).lineLimit(1)
        }
        Spacer(minLength: 4)
        VStack(alignment: .trailing, spacing: 0) {
          LiveTimer(state: s, labels: a.labels, size: 28)
          Text("\(a.labels.expires) \(s.endsAt, style: .time)").font(.system(size: 12, weight: .semibold)).foregroundStyle(liveSub)
        }
      }
      ProgressView(timerInterval: s.startedAt...max(s.endsAt, s.startedAt.addingTimeInterval(1)), countsDown: false) { EmptyView() } currentValueLabel: { EmptyView() }
        .tint(liveBtn)
      LiveButtons(state: s, labels: a.labels)
    }
    .foregroundStyle(.white)
    .padding(16)
  }
}

struct ParkingLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: ParkingActivityAttributes.self) { context in
      ParkingLiveLockView(context: context)
        .activityBackgroundTint(liveBg)
        .activitySystemActionForegroundColor(.white)
        .widgetURL(link("open"))
    } dynamicIsland: { context in
      let a = context.attributes
      let s = context.state
      return DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          LiveBadge(zone: a.zone, color: a.color, size: 40).padding(.leading, 4)
        }
        DynamicIslandExpandedRegion(.trailing) {
          VStack(alignment: .trailing, spacing: 0) {
            LiveTimer(state: s, labels: a.labels, size: 26)
            Text("\(a.labels.expires) \(s.endsAt, style: .time)").font(.system(size: 12)).foregroundStyle(liveSub)
          }
          .padding(.trailing, 4)
        }
        DynamicIslandExpandedRegion(.center) {
          VStack(spacing: 1) {
            Text(a.zone.map { "\($0) \(a.labels.zone) · \(a.plate)" } ?? a.plate).font(.system(size: 14, weight: .bold)).lineLimit(1)
            Text(a.place).font(.system(size: 12)).foregroundStyle(liveSub).lineLimit(1)
          }
        }
        DynamicIslandExpandedRegion(.bottom) {
          LiveButtons(state: s, labels: a.labels).padding(.top, 6)
        }
      } compactLeading: {
        LiveBadge(zone: a.zone, color: a.color, size: 22)
      } compactTrailing: {
        if s.endsAt > .now {
          Text(timerInterval: Date.now...s.endsAt, countsDown: true)
            .font(.system(size: 14, weight: .semibold).monospacedDigit())
            .frame(maxWidth: 56)
        } else {
          Image(systemName: "exclamationmark.circle.fill").foregroundStyle(Color(hex: "#FF8A8A"))
        }
      } minimal: {
        LiveBadge(zone: a.zone, color: a.color, size: 22)
      }
      .widgetURL(link("open"))
      .keylineTint(Color(hex: a.color))
    }
  }
}
