import ActivityKit
import ExpoModulesCore
import Foundation

// Élő tevékenység az aktív parkoláshoz: zárolt képernyőn és a Dynamic Islandben a rendszer számol vissza.
// A JS oldal (modules/parkolj-live/index.ts) minden lényeges változáskor elküldi a pillanatképet (sync),
// leállításkor pedig befejezi (end). A megjelenés a widget targetben van: targets/widget/ParkingLiveActivity.swift.

public class ParkoljLiveModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ParkoljLive")

    Function("isSupported") { () -> Bool in
      if #available(iOS 16.2, *) {
        return ActivityAuthorizationInfo().areActivitiesEnabled
      }
      return false
    }

    AsyncFunction("sync") { (json: String) async in
      if #available(iOS 16.2, *) {
        await LiveController.sync(json)
      }
    }

    AsyncFunction("end") { () async in
      if #available(iOS 16.2, *) {
        await LiveController.endAll()
      }
    }
  }
}

@available(iOS 16.2, *)
enum LiveController {
  struct Payload: Decodable {
    var zone: String?
    var color: String
    var plate: String
    var place: String
    var startedAt: Double
    var endsAt: Double
    var canExtend: Bool
    var labels: ParkingActivityAttributes.Labels
  }

  static func sync(_ json: String) async {
    guard let raw = json.data(using: .utf8), let p = try? JSONDecoder().decode(Payload.self, from: raw) else { return }
    let start = Date(timeIntervalSince1970: p.startedAt / 1000)
    let end = Date(timeIntervalSince1970: p.endsAt / 1000)
    let key = "\(p.plate)-\(Int(p.startedAt))"
    let state = ParkingActivityAttributes.ContentState(startedAt: start, endsAt: end, canExtend: p.canExtend)
    // Egy órával a lejárat után elavultnak jelöljük (a rendszer elhalványítja)
    let content = ActivityContent(state: state, staleDate: end.addingTimeInterval(3600))

    if let current = Activity<ParkingActivityAttributes>.activities.first(where: { $0.attributes.sessionKey == key }) {
      await current.update(content)
      return
    }
    // Más (régi) parkolás élő tevékenysége nem maradhat kint
    await endAll()
    guard ActivityAuthorizationInfo().areActivitiesEnabled else { return }
    let attributes = ParkingActivityAttributes(sessionKey: key, zone: p.zone, color: p.color, plate: p.plate, place: p.place, labels: p.labels)
    _ = try? Activity.request(attributes: attributes, content: content, pushType: nil)
  }

  static func endAll() async {
    for activity in Activity<ParkingActivityAttributes>.activities {
      await activity.end(nil, dismissalPolicy: .immediate)
    }
  }
}
