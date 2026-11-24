// FONTOS: ennek a fájlnak szóról szóra egyeznie kell a targets/widget/ParkingActivityAttributes.swift fájllal
// (az iOS a típus neve és felépítése alapján köti össze az appot és a widgetet). Egy teszt ellenőrzi.
import ActivityKit
import Foundation

struct ParkingActivityAttributes: ActivityAttributes {
  struct ContentState: Codable, Hashable {
    var startedAt: Date
    var endsAt: Date
    var canExtend: Bool
  }

  struct Labels: Codable, Hashable {
    var zone: String
    var expires: String
    var expired: String
    var extend: String
    var stop: String
  }

  /// Rendszám + kezdés: ugyanahhoz a parkoláshoz ugyanaz az élő tevékenység tartozik
  var sessionKey: String
  var zone: String?
  var color: String
  var plate: String
  var place: String
  var labels: Labels
}
